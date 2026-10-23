import localforage from 'localforage';
import { INITIAL_MENU_ITEMS } from '../features/pos/data/menuData';
import { MASTER_INVENTORY } from '../features/inventory/data/masterInventory';
import type { Product, ItemSize, OrderType } from '../features/pos/models/pos';
import type { StagedInventoryItem } from '../features/inventory/services/inventoryStaging';

export type LocalRole = 'OWNER' | 'CASHIER' | 'KITCHEN';
export type KitchenState = 'NEW' | 'PREPARING' | 'READY' | 'SERVED';
export type PaymentState = 'UNPAID' | 'CASH_RECEIVED';
export interface LocalStaff {
  id: string; name: string; role: LocalRole;
  pinSalt: string; pinHash: string;
  failures: number; lockedUntil: number;
}
export interface LocalOrderLine {
  productId: string; name: string; size: ItemSize; price: number; quantity: number;
}
export interface LocalOrder {
  id: string; number: string; items: LocalOrderLine[]; total: number;
  type: OrderType; table?: string; createdAt: string; createdBy: string;
  kitchen: KitchenState; payment: PaymentState; cashTendered?: number;
}
export interface StockCount {
  id: string; itemId: string; oldQty: number; newQty: number;
  recordedAt: string; recordedBy: string;
}
export interface FreshLedger {
  schema: 1; deviceId: string; initializedAt: string; nextOrder: number;
  staff: LocalStaff[]; menu: Product[]; inventory: StagedInventoryItem[];
  orders: LocalOrder[]; stockCounts: StockCount[];
}
export interface ActiveStaff { id: string; name: string; role: LocalRole }
export type DraftLine = Pick<LocalOrderLine, 'productId' | 'size' | 'quantity'>;

const database = localforage.createInstance({
  name: 'TalkOSFresh', storeName: 'local_ledger_v1',
  description: 'TalkOS restaurant single-device offline ledger'
});
const DATA_KEY = 'restaurant_state_1';
let initializedDriver: Promise<void> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();
let session: ActiveStaff | null = null;

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const current = operationQueue.then(operation, operation);
  operationQueue = current.then(() => undefined, () => undefined);
  return current;
}
async function ready() {
  if (!initializedDriver) initializedDriver = database.setDriver(localforage.INDEXEDDB);
  try { await initializedDriver; }
  catch (err) {
    throw new Error('IndexedDB is unavailable. TalkOS cannot safely save orders on this device. ' + String(err));
  }
}
const dateNow = () => new Date().toISOString();
const moneyRound = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const freshId = () => crypto.randomUUID();
function initialLedger(): FreshLedger {
  return {
    schema: 1, deviceId: freshId(), initializedAt: dateNow(), nextOrder: 1,
    staff: [],
    menu: structuredClone(INITIAL_MENU_ITEMS),
    inventory: structuredClone(MASTER_INVENTORY).map(item => ({
      ...item, currentStock: 0, stockVerified: false, active: false, activationReviewRequired: true
    })),
    orders: [], stockCounts: []
  };
}
function checkLedger(value: unknown): asserts value is FreshLedger {
  const s = value as FreshLedger;
  if (!s || s.schema !== 1 || !Array.isArray(s.staff) || !Array.isArray(s.orders) ||
      !Array.isArray(s.menu) || !Array.isArray(s.inventory) || !Array.isArray(s.stockCounts) ||
      typeof s.nextOrder !== 'number') {
    throw new Error('Saved TalkOS data has an unexpected format. Export or recover it before making changes.');
  }
}
async function read(): Promise<FreshLedger> {
  await ready();
  const existing = await database.getItem<FreshLedger>(DATA_KEY);
  if (existing) { checkLedger(existing); return existing; }
  const seed = initialLedger();
  await database.setItem(DATA_KEY, seed);
  return seed;
}
async function persist(value: FreshLedger): Promise<FreshLedger> {
  await ready();
  checkLedger(value);
  await database.setItem(DATA_KEY, value);
  return value;
}
function active(): ActiveStaff {
  if (!session) throw new Error('Unlock TalkOS with your staff PIN first.');
  return session;
}
function permit(roles: LocalRole[]): ActiveStaff {
  const person = active();
  if (!roles.includes(person.role)) throw new Error('This action requires ' + roles.join(' or ') + ' access.');
  return person;
}
function validatePin(pin: string) {
  if (!/^\d{6,10}$/.test(pin)) throw new Error('Use a private 6–10 digit PIN. Do not reuse the old sample PINs.');
  if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) {
    throw new Error('Choose a less predictable PIN.');
  }
}
function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function hashPin(pin: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)?.map(v => parseInt(v, 16)) || []);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 220000, hash: 'SHA-256' }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}
async function makeCredential(pin: string) {
  validatePin(pin);
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
  return { pinSalt: salt, pinHash: await hashPin(pin, salt) };
}
function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}
function touchSnapshot(ledger: FreshLedger) {
  return structuredClone(ledger);
}
export async function loadFreshLedger(): Promise<FreshLedger> {
  return serialized(async () => touchSnapshot(await read()));
}
export function getLocalSession(): ActiveStaff | null {
  return session ? { ...session } : null;
}
export function lockLocalSession() { session = null; }
export async function enrollOwner(pin: string, name: string): Promise<ActiveStaff> {
  return serialized(async () => {
    const s = await read();
    if (s.staff.length) throw new Error('An owner is already enrolled on this device.');
    const credentials = await makeCredential(pin);
    const person: LocalStaff = { id: freshId(), name: name.trim() || 'Owner', role: 'OWNER',
      ...credentials, failures: 0, lockedUntil: 0 };
    s.staff.push(person);
    await persist(s);
    session = { id: person.id, name: person.name, role: person.role };
    return { ...session };
  });
}
export async function unlockLocal(pin: string): Promise<ActiveStaff> {
  return serialized(async () => {
    const s = await read();
    if (!s.staff.length) throw new Error('Set up the owner PIN first.');
    if (!/^\d{6,10}$/.test(pin)) throw new Error('Invalid PIN.');
    const now = Date.now();
    const usable = s.staff.filter(p => p.lockedUntil <= now);
    if (!usable.length) throw new Error('All PINs are temporarily locked after failed attempts.');
    let matching: LocalStaff | undefined;
    // Every eligible credential is checked to avoid trivial staff-name enumeration.
    for (const person of usable) {
      const candidate = await hashPin(pin, person.pinSalt);
      if (sameHash(candidate, person.pinHash)) matching = person;
    }
    if (matching) {
      matching.failures = 0;
      matching.lockedUntil = 0;
      await persist(s);
      session = { id: matching.id, name: matching.name, role: matching.role };
      return { ...session };
    }
    // Device-wide lockout after repeated invalid attempts; never expose PINs.
    for (const person of usable) {
      person.failures++;
      if (person.failures >= 5) {
        person.lockedUntil = now + 5 * 60 * 1000;
        person.failures = 0;
      }
    }
    await persist(s);
    throw new Error('Incorrect PIN. Access will pause after repeated failures.');
  });
}
export async function registerLocalStaff(name: string, role: Exclude<LocalRole, 'OWNER'>, pin: string) {
  return serialized(async () => {
    permit(['OWNER']);
    if (!['CASHIER', 'KITCHEN'].includes(role)) throw new Error('Invalid staff role');
    if (!name.trim()) throw new Error('Enter a staff name');
    const s = await read();
    if (s.staff.length >= 20) throw new Error('Maximum local staff profiles reached');
    for (const person of s.staff) {
      if (sameHash(await hashPin(pin, person.pinSalt), person.pinHash)) {
        throw new Error('Each staff member must use a different PIN.');
      }
    }
    const cred = await makeCredential(pin);
    s.staff.push({
      id: freshId(), name: name.trim(), role, ...cred, failures: 0, lockedUntil: 0
    });
    await persist(s);
    return touchSnapshot(s);
  });
}
export function priceDraft(ledger: FreshLedger, cart: DraftLine[]): { lines: LocalOrderLine[]; total: number } {
  if (!cart.length) throw new Error('Choose at least one menu item.');
  const lines = cart.map(draft => {
    if (!Number.isSafeInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 100) {
      throw new Error('Order quantities must be between 1 and 100.');
    }
    const product = ledger.menu.find(item => item.id === draft.productId);
    if (!product || product.active === false || !product.isAvailable || product.isSubItem) {
      throw new Error('One selected menu item is unavailable.');
    }
    const size = product.sizes.find(s => s.size === draft.size && s.active);
    if (!size || !Number.isFinite(size.price) || size.price < 0) {
      throw new Error('Invalid or unavailable menu size.');
    }
    return {
      productId: product.id, name: product.name, size: draft.size,
      price: size.price, quantity: draft.quantity
    };
  });
  const total = moneyRound(lines.reduce((sum, item) => sum + item.price * item.quantity, 0));
  return { lines, total };
}
export async function placeLocalOrder(cart: DraftLine[], type: OrderType, table?: string): Promise<FreshLedger> {
  return serialized(async () => {
    const staff = permit(['OWNER', 'CASHIER']);
    if (!['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(type)) throw new Error('Select a valid order type.');
    if (type === 'DINE_IN' && !table?.trim()) throw new Error('Enter a table or pickup identifier.');
    const s = await read();
    const priced = priceDraft(s, cart);
    const newOrder: LocalOrder = {
      id: freshId(), number: 'TOT-' + String(s.nextOrder).padStart(5, '0'),
      items: priced.lines, total: priced.total, type, table: table?.trim() || undefined,
      createdAt: dateNow(), createdBy: staff.id, kitchen: 'NEW', payment: 'UNPAID'
    };
    s.orders.push(newOrder);
    s.nextOrder++;
    await persist(s);
    return touchSnapshot(s);
  });
}
export async function recordCashReceived(orderId: string, tendered: number): Promise<FreshLedger> {
  return serialized(async () => {
    permit(['OWNER', 'CASHIER']);
    const s = await read();
    const order = s.orders.find(item => item.id === orderId);
    if (!order) throw new Error('Order not found');
    if (order.payment !== 'UNPAID') throw new Error('Payment has already been recorded.');
    if (!Number.isFinite(tendered) || tendered < order.total) throw new Error('Cash received is less than the bill.');
    order.payment = 'CASH_RECEIVED';
    order.cashTendered = moneyRound(tendered);
    await persist(s);
    return touchSnapshot(s);
  });
}
export async function updateKitchen(orderId: string, next: KitchenState): Promise<FreshLedger> {
  return serialized(async () => {
    permit(['OWNER', 'KITCHEN']);
    const s = await read();
    const order = s.orders.find(item => item.id === orderId);
    if (!order) throw new Error('Order not found.');
    const transitions: Record<KitchenState, KitchenState[]> = {
      NEW: ['PREPARING'], PREPARING: ['READY'], READY: ['SERVED'], SERVED: []
    };
    if (!transitions[order.kitchen].includes(next)) throw new Error('Invalid kitchen status transition.');
    order.kitchen = next;
    await persist(s);
    return touchSnapshot(s);
  });
}
export async function recordStockCount(itemId: string, qty: number): Promise<FreshLedger> {
  return serialized(async () => {
    const person = permit(['OWNER']);
    if (!Number.isFinite(qty) || qty < 0 || qty > 10000000) throw new Error('Enter a valid measured stock quantity.');
    const s = await read();
    const item = s.inventory.find(stock => stock.id === itemId);
    if (!item) throw new Error('Inventory item not found.');
    const prior = item.currentStock;
    item.currentStock = qty;
    item.stockVerified = true;
    // Actual stock is measured, but recipe-linked deductions remain blocked until verified.
    item.activationReviewRequired = true;
    s.stockCounts.push({
      id: freshId(), itemId, oldQty: prior, newQty: qty,
      recordedAt: dateNow(), recordedBy: person.id
    });
    await persist(s);
    return touchSnapshot(s);
  });
}
export async function exportFreshBackup(): Promise<string> {
  return serialized(async () => {
    permit(['OWNER']);
    const s = await read();
    return JSON.stringify({
      format: 'talkos-local-v1', exportedAt: dateNow(),
      warning: 'Contains staff PIN verifiers and business transactions. Store privately.',
      ledger: s
    }, null, 2);
  });
}
