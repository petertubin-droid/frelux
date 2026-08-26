'use client';

import { useAuth } from '@/lib/auth';
import { CreditsWallet } from '@/components/credits/CreditsWallet';
import { Loader2 } from 'lucide-react';

export default function CreditsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Sign in to view your FRELUX Credits and start earning.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">FRELUX Credits</h1>
      <CreditsWallet userId={user.id} />
    </div>
  );
}
