import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const port = 4317;
const base = 'http://127.0.0.1:' + port;
const web = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { stdio: 'pipe', env: process.env, shell: false }
);
let output = '';
web.stdout.on('data', chunk => { output += chunk.toString(); });
web.stderr.on('data', chunk => { output += chunk.toString(); });
async function waitForServer() {
  for (let attempts = 0; attempts < 90; attempts++) {
    try { const res = await fetch(base); if (res.ok) return; }
    catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Vite preview did not start: ' + output.slice(-1500));
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true,
  deviceScaleFactor: 1
});
const page = await context.newPage();
let firebaseRequests = 0;
page.on('request', request => {
  if (/firestore\.googleapis\.com|firebaseio\.com|identitytoolkit\.googleapis\.com/.test(request.url())) firebaseRequests++;
});
const assert = async (loc, label) => {
  try { await loc.waitFor({ state: 'visible', timeout: 12000 }); }
  catch (err) { throw new Error('Missing ' + label + ': ' + String(err)); }
};
try {
  await waitForServer();
  await mkdir('fresh-evidence', { recursive: true });
  await page.goto(base, { waitUntil: 'networkidle' });
  await assert(page.getByText('TalkOS · Fresh'), 'fresh install screen');
  await page.getByLabel('Owner name').fill('Restaurant Owner');
  await page.getByLabel('Choose private owner PIN (6–10 digits)').fill('683921');
  await page.getByLabel('Confirm owner PIN').fill('683921');
  await page.getByRole('button', { name: 'Enrol owner and start' }).click();
  await assert(page.getByText('Recorded operations'), 'offline overview');
  await assert(page.getByText('0 / 144'), 'unverified inventory count');
  await page.screenshot({ path: 'fresh-evidence/overview.png', fullPage: true });

  await page.getByRole('button', { name: 'POS', exact: true }).click();
  await assert(page.getByText('New order'), 'POS screen');
  const veg = page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: 'Veg Chowmein' }) }).first();
  await veg.getByRole('button', { name: /Small:/ }).click();
  await assert(page.getByRole('heading', { name: 'Cart', exact: true }), 'order cart');
  await page.getByRole('button', { name: 'Save order & kitchen ticket' }).click();
  await assert(page.getByText('Kitchen order tickets'), 'kitchen display');
  await assert(page.getByText('TOT-00001', { exact: true }), 'first real order');
  await page.getByRole('button', { name: 'Mark PREPARING' }).click();
  await assert(page.getByRole('button', { name: 'Mark READY' }), 'valid kitchen transition');

  await page.reload({ waitUntil: 'networkidle' });
  await assert(page.getByText('TalkOS · Fresh'), 'PIN locked after app reload');
  await page.getByLabel('Staff PIN').fill('683921');
  await page.getByRole('button', { name: 'Unlock TalkOS' }).click();
  await assert(page.getByText('Recorded operations'), 'persisted overview');
  await assert(page.getByText('1', { exact: true }).first(), 'saved order');
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await assert(page.getByRole('button', { name: 'Mark READY' }), 'persistent kitchen transition');

  await page.getByRole('button', { name: 'POS', exact: true }).click();
  await assert(page.getByText('Unpaid orders'), 'unpaid ledger');
  await page.getByRole('button', { name: 'Confirm physical cash received' }).click();
  await assert(page.getByText('No unpaid orders.'), 'cash receipt saved');

  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  const chicken = page.locator('div.rounded-2xl').filter({ hasText: 'TOT-001' }).first();
  await chicken.getByPlaceholder('Count (kg)').fill('2.5');
  await chicken.getByRole('button', { name: 'Record', exact: true }).click();
  await assert(page.getByText('Physically verified', { exact: false }).first(), 'physical count');
  await page.screenshot({ path: 'fresh-evidence/stock.png', fullPage: true });

  await page.getByRole('button', { name: 'Staff', exact: true }).click();
  await page.getByLabel('Staff name').fill('Cashier 1');
  await page.getByLabel('Private PIN').fill('794613');
  await page.getByRole('button', { name: 'Create staff PIN' }).click();
  await assert(page.getByText('Cashier 1'), 'staff enrolled');
  await page.getByRole('button', { name: 'Lock', exact: true }).first().click();
  await page.getByLabel('Staff PIN').fill('794613');
  await page.getByRole('button', { name: 'Unlock TalkOS' }).click();
  await assert(page.getByText('Recorded operations'), 'cashier PIN session');
  if (await page.getByRole('button', { name: 'Staff', exact: true }).count() > 0)
    throw new Error('Cashier can see owner-only staff screen');
  if (await page.getByRole('button', { name: 'Kitchen', exact: true }).count() > 0)
    throw new Error('Cashier can see kitchen restricted navigation');
  if (firebaseRequests !== 0) throw new Error('Local-only app made ' + firebaseRequests + ' Firebase requests');

  console.log('PASS: owner enrolment, PIN unlock, original menu, persistent POS order, kitchen transitions, cash, stock count and cashier role.');
  console.log('PASS: no Firebase requests or fake transactions in isolated fresh mode.');
} finally {
  await context.close();
  await browser.close();
  web.kill('SIGTERM');
}
