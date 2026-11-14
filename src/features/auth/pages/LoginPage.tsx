import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { Mail, Lock, Loader2, Smartphone, KeyRound } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { auth } from '../../../core/firebase/firebaseConfig';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // Capacitor's Android WebView is a separate browser storage container.
  // Native social popup and reCAPTCHA flows require their native integrations.
  const isNativeApp = typeof window !== 'undefined' && (
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    (window.location.hostname === 'localhost' && window.location.protocol === 'https:')
  );

  // Navigate only after the auth provider confirms a session, not on a returned
  // popup/credentials promise before AuthContext has updated.
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [authLoading, user, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.loginWithEmail(email.trim(), password);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('This account/password combination is not accepted. If you normally sign in through Google or forgot the password, use Forgot password to set email access.');
      } else if (code === 'auth/network-request-failed') {
        setError('The app could not reach the login service. Check internet access and try again.');
      } else {
        setError(err.message || 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.loginWithApple();
    } catch (err: any) {
      setError(err.message || 'Failed to login with Apple');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#800000] mb-6 text-center">Sign in to your account</h2>
      
      {error && (
        <div className="mb-4 bg-[#fee8eb] border border-[#ebd5da] text-[#800000] px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#800000] mb-1">Email address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-[#800000]/60" />
            </div>
            <input
              type="email"
              required
              className="block w-full pl-10 pr-3 py-2 border border-[#ebd5da] rounded-lg bg-[#fdf5f6] text-[#800000] placeholder-[#800000]/40 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent sm:text-sm font-medium"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#800000] mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-[#800000]/60" />
            </div>
            <input
              type="password"
              required
              className="block w-full pl-10 pr-3 py-2 border border-[#ebd5da] rounded-lg bg-[#fdf5f6] text-[#800000] placeholder-[#800000]/40 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent sm:text-sm font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-[#800000] focus:ring-[#800000] border-[#ebd5da] rounded accent-[#800000]"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm font-semibold text-[#800000]">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-bold text-[#800000] hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#800000] hover:bg-[#680016] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
        </button>
      </form>

      {!isNativeApp && (
        <>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ebd5da]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-2 bg-white text-[#800000]/70 font-bold">Or continue with</span>
            </div>
          </div>
  
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-[#ebd5da] rounded-lg shadow-xs bg-white text-sm font-bold text-[#800000] hover:bg-[#fdf5f6] transition-colors"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              Google
            </button>
            <button
              onClick={handleAppleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-[#ebd5da] rounded-lg shadow-xs bg-white text-sm font-bold text-[#800000] hover:bg-[#fdf5f6] transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.178 12.18c-.808 1.488-1.575 2.195-2.222 2.195-.694 0-1.428-.466-2.12-.466-.69 0-1.22.466-1.97.466-.75 0-1.55-.707-2.3-2.195C5.815 12.69 5.8 10.3 6.94 9.1c.57-.6 1.34-1.022 2.06-1.022.68 0 1.25.32 1.76.6.43.236.75.244 1.05 0 .5-.4 1.2-.7 1.95-.7.86 0 1.63.4 2.22 1 .15.15.54.55.53.56-.03 0-1.55.77-1.54 2.44 0 1.9 1.58 2.72 1.6 2.74-.03.1-.38 1.15-1.392 2.6zM13 5c-.7 0-1.4.3-1.9.9-.5.6-.9 1.4-.8 2.1.8 0 1.4-.4 1.9-1 .5-.6.8-1.4.8-2z" />
              </svg>
              Apple
            </button>
          </div>
        </div>
  
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            to="/auth/phone"
            className="w-full flex items-center justify-center px-4 py-2 border border-[#ebd5da] rounded-lg shadow-xs bg-[#fdf5f6] text-sm font-bold text-[#800000] hover:bg-[#fee8eb] transition-colors"
          >
            <Smartphone className="h-4 w-4 mr-2 text-[#800000]" />
            Phone
          </Link>
          <Link
            to="/auth/pin"
            className="w-full flex items-center justify-center px-4 py-2 border border-[#ebd5da] rounded-lg shadow-xs bg-[#fdf5f6] text-sm font-bold text-[#800000] hover:bg-[#fee8eb] transition-colors"
          >
            <KeyRound className="h-4 w-4 mr-2 text-[#800000]" />
            PIN / Biometric
          </Link>
        </div>
  
        <div className="mt-6 text-center text-sm">
          <span className="text-[#800000]/70 font-medium">Don't have an account? </span>
          <Link to="/auth/register" className="font-bold text-[#800000] underline hover:text-[#680016]">
            Sign up
          </Link>
        </div>
        </>
      )}
      {isNativeApp && (
        <div className="mt-6 space-y-3">
          <Link to="/offline-inventory"
            className="flex w-full items-center justify-center rounded-xl border-2 border-[#800000] bg-[#fdf5f6] px-4 py-3 text-center text-sm font-black text-[#800000]">
            View saved inventory · 144 items · Offline
          </Link>
          <p className="text-center text-xs text-[#800000]/70">
            Read-only master catalogue works without sign-in. For stock quantities
            and restaurant operations, sign in with your TalkOS email.
          </p>
        </div>
      )}

    </div>
  );
}
