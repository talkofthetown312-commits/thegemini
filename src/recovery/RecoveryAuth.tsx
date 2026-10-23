import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLocalSession, lockLocalSession, type ActiveStaff } from './localEngine';

interface OfflineAuth {
  user: { uid: string; displayName: string } | null;
  profile: {
    uid: string; displayName: string; roles: string[]; permissions: string[];
    email: string | null; branches: string[];
  } | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const Context = createContext<OfflineAuth | undefined>(undefined);
export function RecoveryAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveStaff | null>(getLocalSession());
  useEffect(() => {
    const refresh = () => setSession(getLocalSession());
    window.addEventListener('talkos:session', refresh);
    return () => window.removeEventListener('talkos:session', refresh);
  }, []);
  const value = useMemo<OfflineAuth>(() => {
    const roles = session?.role === 'OWNER'
      ? ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'INVENTORY', 'ACCOUNTANT']
      : session?.role ? [session.role] : [];
    return {
      user: session ? { uid: session.id, displayName: session.name } : null,
      profile: session ? {
        uid: session.id, displayName: session.name,
        roles, permissions: session.role === 'OWNER' ? ['*'] : [],
        branches: ['br_main'], email: null
      } : null,
      loading: false,
      logout: async () => {
        lockLocalSession();
        window.dispatchEvent(new Event('talkos:session'));
      },
      hasRole: (role) => roles.includes(role),
      hasPermission: (permission) => session?.role === 'OWNER' || false
    };
  }, [session]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRecoveryAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('RecoveryAuthProvider is not mounted');
  return value;
}

/** Called by the shared useAuth hook; returns undefined in cloud mode. */
export function useRecoveryAuthOptional() { return useContext(Context); }
