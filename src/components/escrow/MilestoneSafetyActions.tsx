import { useRef, useState } from "react";
import { Camera, Loader2, ShieldAlert, PlaneTakeoff } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Role = "pro" | "client" | "admin";

interface Props {
  orderId: string;
  milestoneId: string;
  role: Role;
  jobState?: string | null;
  onDone?: () => void;
}

interface ProofResult {
  photo_count?: number;
  auto_release_due_at?: string | null;
  auto_release_hours?: number;
}

/**
 * The two actions that make the payout clock real: the professional uploads
 * proof, and the client either approves or raises a problem. A client cannot
 * start the clock on their own behalf because record_work_proof checks that
 * the caller is the professional on the order.
 */
export default function MilestoneSafetyActions({
  orderId,
  milestoneId,
  role,
  jobState,
  onDone,
}: Props) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [objecting, setObjecting] = useState(false);
  const [reason, setReason] = useState("");

  const readError = (value: unknown) => {
    if (value && typeof value === "object" && "message" in value) {
      return String((value as { message?: unknown }).message);
    }
    return "Something went wrong";
  };

  const uploadProof = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sign in again to upload proof");

      const paths: string[] = [];
      for (const [index, file] of Array.from(files).slice(0, 12).entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${orderId}/${Date.now()}-${index}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("work-proofs")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        paths.push(path);
      }

      const { data, error: rpcError } = await supabase.rpc(
        "record_work_proof",
        {
          p_order_id: orderId,
          p_milestone_id: milestoneId,
          p_photo_paths: paths,
          p_note: null,
        },
      );
      if (rpcError) throw rpcError;
      const result = (data ?? {}) as ProofResult;
      setDueAt(result.auto_release_due_at ?? null);
      onDone?.();
    } catch (uploadError) {
      setError(readError(uploadError));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const reportProblem = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("object_to_milestone", {
        p_milestone_id: milestoneId,
        p_reason: reason,
      });
      if (rpcError) throw rpcError;
      setObjecting(false);
      setReason("");
      onDone?.();
    } catch (objectionError) {
      setError(readError(objectionError));
    } finally {
      setBusy(false);
    }
  };

  const approveTravel = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(
        "approve_cross_state_job",
        {
          p_order_id: orderId,
          p_note: "Approved from the order page",
          p_expires_at: null,
        },
      );
      if (rpcError) throw rpcError;
      onDone?.();
    } catch (travelError) {
      setError(readError(travelError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 ml-8 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {role === "pro" && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => uploadProof(event.target.files)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-brand-purple disabled:opacity-60 dark:border-white/10"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="h-3 w-3" aria-hidden="true" />
              )}
              Upload proof photos
            </button>
          </>
        )}

        {role === "client" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setObjecting((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            Report a problem
          </button>
        )}

        {role === "admin" && jobState && (
          <button
            type="button"
            disabled={busy}
            onClick={approveTravel}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-brand-purple disabled:opacity-60 dark:border-white/10"
          >
            <PlaneTakeoff className="h-3 w-3" aria-hidden="true" />
            Approve travel to {jobState}
          </button>
        )}
      </div>

      {objecting && role === "client" && (
        <div className="space-y-1">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="What is wrong with this stage?"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground"
          />
          <button
            type="button"
            disabled={busy}
            onClick={reportProblem}
            className="rounded-md bg-amber-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
          >
            Stop the payout clock
          </button>
        </div>
      )}

      {dueAt && (
        <p className="text-[10px] text-muted-foreground">
          Proof received. If nothing is raised by{" "}
          {new Date(dueAt).toLocaleString()}, escrow pays automatically.
        </p>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
