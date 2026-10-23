import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { Ticket, Station, TicketItemStatus, OrderStatus, TicketItem } from '../models/kds';
import { db } from '../../../core/firebase/firebaseConfig';
import { transitionTicketItem } from './ticketTransitions';

class KdsService {
  async getStations(): Promise<Station[]> {
    if (!db) throw new Error('Kitchen stations unavailable: database not configured');
    const q = query(collection(db, 'stations'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Station));
  }

  // Real-time listener for tickets
  subscribeToTickets(stationId: string | null, callback: (tickets: Ticket[]) => void, onError: (error: Error) => void): () => void {
    if (!db) {
      onError(new Error('Firestore is not configured. Kitchen tickets cannot be loaded.'));
      return () => {};
    }

    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef, 
      where('status', 'in', ['NEW', 'ACCEPTED', 'PREPARING', 'READY'])
    );

    // Initial sync with backend API for any webhook or kiosk tickets
    fetch('/api/kds/tickets')
      .then(res => res.json())
      .then(data => {
        if (data.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
          callback(data.tickets);
        }
      })
      .catch(() => {});

    return onSnapshot(q, (snapshot) => {
      const tickets: Ticket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as Ticket);
      });
      callback(tickets);
    }, (error) => {
      onError(error);
    });
  }

  async updateTicketStatus(ticketId: string, status: OrderStatus): Promise<void> {
    if (!db) throw new Error('Firestore is not configured. Cannot update kitchen ticket.');
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      ...(status === 'ACCEPTED' ? { acceptedAt: new Date().toISOString() } : {}),
      ...(status === 'READY' ? { completedAt: new Date().toISOString() } : {})
    });
  }

  async updateItemStatus(ticketId: string, itemId: string, status: TicketItemStatus, items: TicketItem[]): Promise<void> {
    if (!db) throw new Error('Firestore is not configured. Cannot update kitchen item.');
    const ticketRef = doc(db, 'tickets', ticketId);
    // The items argument is retained for existing callers, but must never be
    // used to overwrite the latest server state from another kitchen device.
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ticketRef);
      if (!snapshot.exists()) throw new Error('Kitchen ticket no longer exists. Refresh the kitchen screen.');
      const ticket = snapshot.data() as Ticket;
      const now = new Date().toISOString();
      const { items: updatedItems, allReady, reopened } = transitionTicketItem(ticket, itemId, status, now);
      transaction.update(ticketRef, {
        items: updatedItems,
        ...(allReady ? { status: 'READY', completedAt: now } : {}),
        ...(reopened ? { status: 'PREPARING', completedAt: null } : {})
      });
    });
  }

  async createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
    if (!db) throw new Error('Firestore is not configured. Kitchen ticket was not saved.');

    // Deterministic ID makes retries for the same paid order idempotent.
    const id = `t_${ticketData.orderId}`;
    const ticketRef = doc(db, 'tickets', id);
    const existing = await getDocs(query(collection(db, 'tickets'), where('orderId', '==', ticketData.orderId)));
    if (!existing.empty) {
      const saved = existing.docs[0];
      return { ...saved.data(), id: saved.id } as Ticket;
    }

    const newTicket: Ticket = {
      ...ticketData,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(ticketRef, JSON.parse(JSON.stringify(newTicket)));
    return newTicket;
  }

  async addStation(stationData: Omit<Station, 'id'>): Promise<Station> {
    if (!db) {
      return {
        ...stationData,
        id: `st_${Date.now()}`
      };
    }
    const newStation: Station = {
      ...stationData,
      id: `st_${Date.now()}`
    };
    await setDoc(doc(db, 'stations', newStation.id), newStation);
    return newStation;
  }

  async updateStation(id: string, data: Partial<Station>): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, 'stations', id), data);
  }

  async deleteStation(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, 'stations', id));
  }
}

export const kdsService = new KdsService();
