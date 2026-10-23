import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { logger } from '../logging/logger';
import { authService, UserProfile } from '../../features/auth/services/authService';
import { useAppStore } from '../store/appStore';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const setBranchId = useAppStore(state => state.setBranchId);
  const currentBranchId = useAppStore(state => state.branchId);

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth is not initialized. Please configure environment variables.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch user profile from Firestore to get roles, branches, permissions
          const isOwnerUid = currentUser.uid === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || currentUser.email === 'talkofthetown312@gmail.com';
          const userProfile = await authService.getUserProfile(currentUser.uid);
          if (userProfile) {
            if (isOwnerUid) {
              userProfile.roles = Array.from(new Set([...userProfile.roles, 'OWNER', 'ADMIN', 'MANAGER']));
              userProfile.permissions = ['*'];
            }
            setProfile(userProfile);
            if (userProfile.defaultBranch && !currentBranchId) {
               setBranchId(userProfile.defaultBranch);
            }
          } else {
            // Default profile for authenticated user when document is pending/not created
            setProfile({
              uid: currentUser.uid,
              email: currentUser.email,
              phoneNumber: currentUser.phoneNumber,
              displayName: currentUser.displayName || (isOwnerUid ? 'Talk of the Town (Owner)' : 'Authenticated User'),
              roles: isOwnerUid ? ['OWNER', 'ADMIN', 'MANAGER'] : [],
              permissions: isOwnerUid ? ['*'] : [],
              branches: ['br_main'],
              createdAt: new Date().toISOString()
            });
          }
          
          logger.info('User authenticated', { uid: currentUser.uid });
        } catch (error) {
          logger.warn('Failed to retrieve user profile, using fallback profile', error);
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            phoneNumber: currentUser.phoneNumber,
            displayName: currentUser.displayName || 'Authenticated User',
            roles: currentUser.uid === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || currentUser.email === 'talkofthetown312@gmail.com' ? ['OWNER', 'ADMIN', 'MANAGER'] : [],
            permissions: currentUser.uid === 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3' || currentUser.email === 'talkofthetown312@gmail.com' ? ['*'] : [],
            branches: [],
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setBranchId, currentBranchId]);

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const hasRole = (role: string): boolean => {
    return profile?.roles?.includes(role) || false;
  };

  const hasPermission = (permission: string): boolean => {
    return profile?.permissions?.includes(permission) || false;
  };

  const value = {
    user,
    profile,
    loading,
    logout,
    hasRole,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

