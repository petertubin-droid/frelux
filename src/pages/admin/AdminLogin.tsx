import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogIn, AlertCircle, Lock, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/brand/Logo';
import { useSeo } from '@/lib/seo';
import { AdminButton, AdminInput } from '@/components/admin/AdminUi';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function AdminLogin() {
  const { signIn, signInWithGoogle, user, isAdmin, configured } = useAuth();
  useSeo({ title: 'FRELUX', description: 'FRELUX', noIndex: true });
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);

  if (user && isAdmin) return <Navigate to="/admin" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      if (data.user) setSignedUpEmail(email.trim());
      return;
    }
    const { error: signInError, isAdmin: adminOk } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) { setError(signInError); return; }
    if (!adminOk) {
      setError("Your account doesn't have admin access. Contact an administrator if you believe this is a mistake.");
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-10 dark:bg-brand-navy">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-brand-navy-mid">
          <h1 className="text-xl font-bold text-brand-navy dark:text-white">{mode === 'signin' ? 'Admin sign in' : 'Create admin account'}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            {mode === 'signin' ? 'Sign in with an authorized admin account to manage the platform.' : 'Create an account, then ask an existing admin to grant you admin access.'}
          </p>
          {!configured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-3 text-xs text-neutral-700 dark:text-neutral-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-yellow" />
              <p>Supabase isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable admin access.</p>
            </div>
          )}
          {signedUpEmail ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-neutral-700 dark:text-neutral-200">
                <p className="font-semibold text-accent-green">Account created</p>
                <p className="mt-1">Your account <span className="font-semibold">{signedUpEmail}</span> has been registered. New accounts start as a regular user. To get admin access, an existing admin needs to update your role to <span className="font-semibold">admin</span> in the profiles table.</p>
              </div>
              <AdminButton variant="secondary" onClick={() => { setSignedUpEmail(null); setMode('signin'); }} className="w-full px-5 py-2.5">Sign in</AdminButton>
            </div>
          ) : (
            <>
              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || !configured}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-brand-navy dark:text-neutral-200 dark:hover:bg-white/5"
              >
                <GoogleIcon />
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-500">or</span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <label className="block">
                  <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Email</span>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <AdminInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="admin@example.com" autoComplete="email" required />
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Password</span>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <AdminInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="--------" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required />
                  </div>
                </label>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p>
                  </div>
                )}
                <AdminButton type="submit" disabled={loading || !configured} className="w-full px-5 py-2.5">
                  {mode === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </AdminButton>
                <div className="text-center">
                  <AdminButton variant="link" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-xs font-semibold">
                    {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                  </AdminButton>
                </div>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-500"><Link to="/" className="hover:text-brand-purple">Back to website</Link></p>
      </div>
    </div>
  );
}
