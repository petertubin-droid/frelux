import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";

/**
 * Session gate for pages that show a signed-in person's own data.
 *
 * Row level security is what actually protects the rows; this is the door. A
 * logged-out visitor who follows a link to a project workspace gets the login
 * page and comes back to the same address afterwards, instead of an empty
 * screen that looks broken and explains nothing.
 *
 * Deliberately separate from RequireAdmin: these pages belong to ordinary
 * users, so the only question here is whether there is a session at all.
 */
export default function RequireSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[40vh] items-center justify-center bg-muted"
      >
        <div className="text-sm text-muted-foreground">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(
      `${location.pathname}${location.search}`,
    );
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
