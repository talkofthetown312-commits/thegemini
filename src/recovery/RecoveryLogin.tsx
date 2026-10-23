import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, KeyRound } from 'lucide-react';
import { enrollOwner, loadFreshLedger, unlockLocal } from './localEngine';
import { useRecoveryAuth } from './RecoveryAuth';

export function RecoveryLogin() {
  const { user } = useRecoveryAuth();
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [name, setName] = useState('Owner');
  const [pin, setPin] = useState('');
  const [verify, setVerify] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    loadFreshLedger().then(s => { if (alive) setConfigured(s.staff.length > 0); })
      .catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, []);
  if (user) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!configured && pin !== verify) { setError('PIN entries must match'); return; }
    setSaving(true);
    try {
      if (!configured) await enrollOwner(pin, name);
      else await unlockLocal(pin);
      setPin(''); setVerify('');
      window.dispatchEvent(new Event('talkos:session'));
      navigate('/', { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  };
  return <div className="min-h-dvh flex items-center justify-center bg-[#fdf5f6] px-4 py-8">
    <div className="w-full max-w-sm rounded-3xl border border-[#e5cbd0] bg-white p-7 shadow-xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#800000] text-white">
        <ShieldCheck className="h-9 w-9" />
      </div>
      <h1 className="text-center text-2xl font-black tracking-tight text-[#800000]">Talk of the Town</h1>
      <p className="mt-1 text-center text-sm font-semibold text-[#800000]/70">TalkOS · Original Interface · Offline</p>
      <p className="mt-6 text-center text-sm text-slate-600">
        {configured === null ? 'Opening secured local storage…' : configured
        ? 'Unlock this device using your personal staff PIN.'
        : 'First launch. Enrol the owner before entering the restaurant system.'}
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-5 space-y-4">
        {!configured && <label className="block text-sm font-semibold text-[#800000]">Owner name
          <input className="mt-1 block w-full rounded-xl border border-[#e5cbd0] p-3 text-slate-900"
            value={name} onChange={e => setName(e.target.value)} maxLength={80} required />
        </label>}
        <label className="block text-sm font-semibold text-[#800000]">
          <KeyRound className="mr-2 inline h-4 w-4" /> {configured ? 'Staff PIN' : 'Create private owner PIN'}
          <input className="mt-1 block w-full rounded-xl border border-[#e5cbd0] p-3 text-center text-2xl tracking-widest text-slate-900"
            type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,10}" minLength={6} maxLength={10}
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required />
        </label>
        {!configured && <label className="block text-sm font-semibold text-[#800000]">Confirm owner PIN
          <input className="mt-1 block w-full rounded-xl border border-[#e5cbd0] p-3 text-center text-2xl tracking-widest text-slate-900"
            type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,10}" minLength={6} maxLength={10}
            value={verify} onChange={e => setVerify(e.target.value.replace(/\D/g, ''))} required />
        </label>}
        <button className="w-full rounded-xl bg-[#800000] p-3 font-bold text-white disabled:opacity-50"
          disabled={saving || configured === null}>{saving ? 'Checking securely…' : configured ? 'Unlock TalkOS' : 'Enrol owner'}</button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        <Lock className="mr-1 inline h-3 w-3" /> No Google login. No universal default PIN.
        Data is local to this device; keep a private backup before uninstalling.
      </p>
    </div>
  </div>;
}
