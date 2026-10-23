import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signOut,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../core/firebase/firebaseConfig';
import { logger } from '../../../core/logging/logger';

export const SUPER_ADMIN_UIDS = ['DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3'];
export const SUPER_ADMIN_EMAILS = ['talkofthetown312@gmail.com'];

export interface UserProfile {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  roles: string[];
  permissions: string[];
  branches: string[];
  defaultBranch?: string;
  createdAt: string;
}

class AuthService {
  async registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
    if (!auth || !db) throw new Error('Firebase not initialized');
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create initial user profile
    await this.createUserProfile(user, displayName);
    
    return user;
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    if (!auth) throw new Error('Firebase not initialized');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async loginWithGoogle(): Promise<User> {
    if (!auth) throw new Error('Firebase not initialized');
    // Firebase's web popup cannot complete reliably in an embedded native WebView.
    // Keep the web flow intact; native Google auth requires a configured native provider.
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      throw new Error('Google sign-in is not configured in the Android/iOS APK. Use TalkOS email and password to sign in.');
    }
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if profile exists, if not create one
    const profile = await this.getUserProfile(userCredential.user.uid);
    if (!profile) {
      await this.createUserProfile(userCredential.user, userCredential.user.displayName || 'Google User');
    }
    
    return userCredential.user;
  }

  async loginWithApple(): Promise<User> {
    if (!auth) throw new Error('Firebase not initialized');
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      throw new Error('Apple sign-in is not configured in the Android/iOS app. Use TalkOS email and password to sign in.');
    }
    const provider = new OAuthProvider('apple.com');
    const userCredential = await signInWithPopup(auth, provider);
    
    const profile = await this.getUserProfile(userCredential.user.uid);
    if (!profile) {
      await this.createUserProfile(userCredential.user, userCredential.user.displayName || 'Apple User');
    }
    
    return userCredential.user;
  }

  async setupRecaptcha(containerId: string): Promise<RecaptchaVerifier> {
    if (!auth) throw new Error('Firebase not initialized');
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible'
    });
  }

  async sendPhoneOTP(phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    if (!auth) throw new Error('Firebase not initialized');
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }

  async resetPassword(email: string): Promise<void> {
    if (!auth) throw new Error('Firebase not initialized');
    await sendPasswordResetEmail(auth, email);
  }

  async logout(): Promise<void> {
    if (!auth) throw new Error('Firebase not initialized');
    await signOut(auth);
  }

  private async createUserProfile(user: User, displayName: string): Promise<void> {
    if (!db) return;
    
    const isSuperAdmin = SUPER_ADMIN_UIDS.includes(user.uid) || 
      (user.email ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) : false);

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: displayName || (isSuperAdmin ? 'Talk of the Town (Owner)' : 'User'),
      roles: isSuperAdmin ? ['OWNER', 'ADMIN', 'MANAGER'] : ['CASHIER'],
      permissions: isSuperAdmin ? ['*'] : ['pos.order.create'],
      branches: ['br_main'],
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      logger.info('Created user profile', { uid: user.uid });
    } catch (err) {
      logger.warn('Failed to save profile in Firestore', err);
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const isSuperAdmin = SUPER_ADMIN_UIDS.includes(uid);
    if (!db) {
      if (isSuperAdmin) {
        return {
          uid,
          email: 'talkofthetown312@gmail.com',
          phoneNumber: null,
          displayName: 'Talk of the Town (Owner)',
          roles: ['OWNER', 'ADMIN', 'MANAGER'],
          permissions: ['*'],
          branches: ['br_main'],
          createdAt: new Date().toISOString()
        };
      }
      return null;
    }
    
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (isSuperAdmin && (!data.roles.includes('OWNER') || !data.roles.includes('ADMIN'))) {
          data.roles = Array.from(new Set([...data.roles, 'OWNER', 'ADMIN', 'MANAGER']));
          data.permissions = ['*'];
          try {
            await setDoc(docRef, data, { merge: true });
          } catch (e) {
            logger.warn('Could not update superadmin roles on profile', e);
          }
        }
        return data;
      }

      if (isSuperAdmin) {
        const ownerProfile: UserProfile = {
          uid,
          email: 'talkofthetown312@gmail.com',
          phoneNumber: null,
          displayName: 'Talk of the Town (Owner)',
          roles: ['OWNER', 'ADMIN', 'MANAGER'],
          permissions: ['*'],
          branches: ['br_main'],
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(docRef, ownerProfile);
        } catch (e) {
          logger.warn('Could not persist superadmin profile to Firestore', e);
        }
        return ownerProfile;
      }
    } catch (error) {
      logger.warn('Could not fetch user profile from Firestore', error);
      if (isSuperAdmin) {
        return {
          uid,
          email: 'talkofthetown312@gmail.com',
          phoneNumber: null,
          displayName: 'Talk of the Town (Owner)',
          roles: ['OWNER', 'ADMIN', 'MANAGER'],
          permissions: ['*'],
          branches: ['br_main'],
          createdAt: new Date().toISOString()
        };
      }
    }
    
    return null;
  }

  async updateUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
    if (!db) return;
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, profile, { merge: true });
  }
}

export const authService = new AuthService();
