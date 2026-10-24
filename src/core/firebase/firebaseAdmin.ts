import { App, initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

let adminApp: App | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseAdmin(): App | null {
  if (!adminApp) {
    try {
      const existing = getApps();
      if (existing.length > 0) {
        adminApp = existing[0];
      } else {
        adminApp = initializeApp({
          credential: applicationDefault()
        });
      }
    } catch (error) {
      console.warn("Firebase Admin initialization skipped:", error);
      return null;
    }
  }
  return adminApp;
}

export function getAdminAuthService() {
  const app = getFirebaseAdmin();
  if (!app) throw new Error("Firebase Admin not available");
  return getAdminAuth(app);
}

export function getAdminFirestoreService(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseAdmin();
  if (!app) return null;
  try {
    firestoreInstance = initializeFirestore(app, { preferRest: true });
    return firestoreInstance;
  } catch {
    return null;
  }
}
