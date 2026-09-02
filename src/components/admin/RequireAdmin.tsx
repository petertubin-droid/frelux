import { useAuth } from '@/lib/auth';
import AdminLogin from '@/pages/admin/AdminLogin';
import { Button } from "@/components/ui/shadcn/button";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-sm text-muted-foreground">Checking your session…</div>
      </div>
    );
  }

  // Not logged in → show the admin login form
  if (!user) return <AdminLogin />;

  // Logged in but not admin → show the "not authorized" page (no redirect)
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Not authorized</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account doesn't have admin access. Contact an administrator if you believe this is a mistake.
        </p>
        <Button type="button" onClick={() => signOut()} className="btn-secondary">Sign out</Button>
      </div>
    );
  }

  return <>{children}</>;
}
