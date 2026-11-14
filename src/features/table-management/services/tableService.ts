import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebaseConfig';
import { Floor, Table, Reservation, WaitlistEntry, TableStatus } from '../models/table';

class TableService {
  async getFloors(): Promise<Floor[]> {
    if (!db) throw new Error('Table database is unavailable');
    const q = query(collection(db, 'table_floors'));
    const snapshot = await getDocs(q);
    
    // No automatically generated floors: an empty restaurant layout remains empty.
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Floor)).sort((a, b) => a.order - b.order);
  }

  async getTables(): Promise<Table[]> {
    if (!db) throw new Error('Table database is unavailable');
    const q = query(collection(db, 'table_items'));
    const snapshot = await getDocs(q);
    
    // Never invent occupied or reserved tables when the layout is not configured.
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
  }
  
  async getReservations(dateStr: string): Promise<Reservation[]> {
    if (!db) return [];
    const q = query(collection(db, 'table_reservations'), where('date', '==', dateStr));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  }

  async getWaitlist(): Promise<WaitlistEntry[]> {
    if (!db) return [];
    const q = query(collection(db, 'table_waitlist'), where('status', '==', 'WAITING'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaitlistEntry));
  }

  subscribeToTables(callback: (tables: Table[]) => void) {
    if (!db) return () => {};
    const q = query(collection(db, 'table_items'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
    });
  }
  
  subscribeToReservations(dateStr: string, callback: (reservations: Reservation[]) => void) {
    if (!db) return () => {};
    const q = query(collection(db, 'table_reservations'), where('date', '==', dateStr));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    });
  }

  async updateTable(id: string, data: Partial<Table>): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, 'table_items', id), data);
  }
  
  async addTable(data: Omit<Table, 'id'>): Promise<Table> {
    if (!db) throw new Error("Firebase not initialized");
    const newTable: Table = {
      ...data,
      id: `tbl_${Date.now()}`
    };
    await setDoc(doc(db, 'table_items', newTable.id), newTable);
    return newTable;
  }
  
  async addReservation(data: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    if (!db) throw new Error("Firebase not initialized");
    const newReservation: Reservation = {
      ...data,
      id: `res_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'table_reservations', newReservation.id), newReservation);
    return newReservation;
  }
  
  async addFloor(data: Omit<Floor, 'id'>): Promise<Floor> {
    if (!db) throw new Error("Firebase not initialized");
    const newFloor: Floor = {
      ...data,
      id: `flr_${Date.now()}`
    };
    await setDoc(doc(db, 'table_floors', newFloor.id), newFloor);
    return newFloor;
  }
}

export const tableService = new TableService();
