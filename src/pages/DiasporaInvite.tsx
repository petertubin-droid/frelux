/**
 * Invitation acceptance.
 *
 * The token arrives as a query parameter. It is exchanged once, on the server,
 * which checks the signed-in email against the invitation before granting
 * access. The token is never stored in the page.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import { acceptInvitation } from "@/lib/diaspora/queries";

export default function DiasporaInvite() {
  useSeo({
    title: "Project invitation | FRELUX Diaspora Site Tracker",
    description: "Accept an invitation to monitor a FRELUX construction project.",
    canonicalPath: "/diaspora-tracker/invite",
    noIndex: true,
  });

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"ready" | "busy" | "error" | "done">("ready");
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  async function accept() {
    setState("busy");
    const { projectId: id, error: acceptError } = await acceptInvitation(token);
    if (acceptError || !id) {
      setError(acceptError ?? "That invitation could not be accepted.");
      setState("error");
      return;
    }
    setProjectId(id);
    setState("done");
  }

  useEffect(() => {
    if (!token) {
      setError("This link is missing its invitation token.");
      setState("error");
    }
  }, [token]);

  return (
    <>
      <PageHeader
        title="Project invitation"
        subtitle="Accept access to a monitored construction project."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Diaspora Site Tracker", path: "/diaspora-tracker" },
          { label: "Invitation" },
        ]}
      />
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        {state === "ready" && (
          <div className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
            <p className="text-sm">
              You have been invited to a project. Accepting adds you as a participant with the
              role the owner chose, and gives you access to its reports, evidence and financial
              record.
            </p>
            <Button onClick={accept}>Accept invitation</Button>
          </div>
        )}

        {state === "busy" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking the invitation…
          </p>
        )}

        {state === "done" && (
          <div className="space-y-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Invitation accepted.
            </p>
            <Button onClick={() => navigate(`/diaspora-tracker/${projectId}`)}>
              Open the project
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <ShieldX aria-hidden="true" className="h-4 w-4" /> {error}
            </p>
            <Link to="/diaspora-tracker" className="text-sm underline">
              Back to your projects
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
