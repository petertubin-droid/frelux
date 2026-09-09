// =========================================================
// FRELUX ARCHIE STAGE 1, DEVICES
//
// Trusted devices and pending device requests, from the
// real security session registry. ARCHIE uses secure
// application/device identity and server-side authorization —
// never IMEI as an authorization mechanism.
// =========================================================
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Smartphone, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";

interface DeviceSession {
  id: string;
  device_label: string;
  current: boolean;
  revoked: boolean;
  last_seen: string;
  created_date: string;
}

export default function ArchieDevices() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("frelux_security_sessions")
          .select("id,device_label,current,revoked,last_seen,created_date")
          .order("last_seen", { ascending: false })
          .limit(50);
        if (error) setError(error.message);
        else setSessions((data ?? []) as DeviceSession[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const trusted = sessions.filter((s) => s.current && !s.revoked);
  const pending = sessions.filter((s) => !s.current && !s.revoked);

  return (
    <div className="space-y-6" data-testid="archie-devices">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Trusted Devices
        </h1>
        <p className="text-sm text-muted-foreground">
          Devices recognized by the ARCHIE security registry. Authorization is
          server-side, based on secure application identity — never on device
          IMEI.
        </p>
      </div>

      <section aria-label="Device counts" className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trusted
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {trusted.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending requests
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {pending.length}
          </p>
        </div>
      </section>

      <section aria-label="Registered sessions">
        {loading ? (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Loading devices…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          </p>
        ) : sessions.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            No devices registered yet. Devices register here as the ARCHIE
            mobile security layer records them.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {s.device_label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last seen {new Date(s.last_seen).toLocaleString()}
                  </p>
                </div>
                <span
                  className={classNames(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    s.revoked
                      ? "bg-destructive/10 text-destructive"
                      : s.current
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.revoked ? (
                    "Revoked"
                  ) : s.current ? (
                    <>
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />{" "}
                      Trusted
                    </>
                  ) : (
                    "Pending"
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
