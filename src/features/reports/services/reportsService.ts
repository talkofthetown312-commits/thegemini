import { collection, query, getDocs } from 'firebase/firestore';
import { SalesReport, ExpenseReport, DashboardMetrics } from '../models/reports';
import { db } from '../../../core/firebase/firebaseConfig';

class ReportsService {
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'reports_metrics'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return { id: snapshot.docs[0].id, ...data } as unknown as DashboardMetrics;
    }
    // No report exists: do not substitute invented financial figures.
    return null;
  }

  async getSalesTrend(): Promise<SalesReport[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'reports_sales_trend'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data } as unknown as SalesReport;
    });
  }

  async getExpenseBreakdown(): Promise<ExpenseReport[]> {
    if (!db) throw new Error("Firestore is not initialized");
    const q = query(collection(db, 'reports_expense_breakdown'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data } as unknown as ExpenseReport;
    });
  }
}

export const reportsService = new ReportsService();
