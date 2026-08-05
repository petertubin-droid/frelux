import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import AdminLogin from '@/pages/admin/AdminLogin';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-sm text-neutral-400">Checking your session…</div>
      </div>
    );
  }

  if (!user) return <AdminLogin />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-100 px-4 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">Not authorized</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          Your account doesn’t have admin access. Contact an administrator if you believe this is a mistake.
        </p>
        <button type="button" onClick={() => signOut()} className="btn-secondary">Sign out</button>
        <Navigate to="/admin/login" replace state={{ from: location }} />
      </div>
    );
  }

  return <>{children}</>;
}
