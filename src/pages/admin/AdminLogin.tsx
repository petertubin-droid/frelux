import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Lock, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/brand/Logo';
import { useSeo } from '@/lib/seo';

export default function AdminLogin() {
  const { signIn, user, isAdmin, configured } = useAuth();
  useSeo({ title: 'FRELUX', description: 'FRELUX', noIndex: true });
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) { setError(error); return; }
    navigate('/admin');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-brand-navy dark:text-white">{mode === 'signin' ? 'Admin sign in' : 'Create admin account'}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            {mode === 'signin' ? 'Sign in with an authorized admin account to manage the platform.' : 'Create an account, then ask an existing admin to grant you admin access.'}
          </p>
          {!configured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 p-3 text-xs text-neutral-700 dark:text-neutral-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-yellow" />
              <p>Supabase isn’t configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable admin access.</p>
            </div>
          )}
          {signedUpEmail ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-neutral-700 dark:text-neutral-200">
                <p className="font-semibold text-accent-green">Account created</p>
                <p className="mt-1">Your account <span className="font-semibold">{signedUpEmail}</span> has been registered. New accounts start as a regular user. To get admin access, an existing admin needs to update your role to <span className="font-semibold">admin</span> in the profiles table.</p>
              </div>
              <button type="button" onClick={() => { setSignedUpEmail(null); setMode('signin'); }} className="btn-secondary w-full">Sign in</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Email</span>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-9" placeholder="admin@example.com" autoComplete="email" required />
                </div>
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Password</span>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-9" placeholder="••••••••" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required />
                </div>
              </label>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading || !configured} className="btn-primary w-full disabled:opacity-50">
                {mode === 'signin' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-xs font-semibold text-brand-purple hover:underline">
                  {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500"><Link to="/" className="hover:text-brand-purple">← Back to website</Link></p>
      </div>
    </div>
  );
}
