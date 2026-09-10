import { act, render } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";
// =========================================================
// TOAST CONTEXT STABLE-IDENTITY REGRESSION (bug fix
// 2026-09-11, CI flake in DeveloperPortal.test.tsx)
//
// The ToastProvider value object used to be rebuilt with
// fresh success/error closures on every render. Any consumer
// that puts success/error in a useCallback/useEffect dep list
// (DeveloperPortal.load, and others) got a new function
// whenever a toast appeared or auto-dismissed — refiring
// their effects (a toast literally triggered a full API
// reload on the portal) and racing button state mid-click.
//
// Contract: the context value and its helpers keep the SAME
// identity across toast add/dismiss re-renders.
// =========================================================

import { ToastProvider, useToast } from "@/components/ui/Toast";

let identities: Array<unknown> = [];

function Probe() {
  const ctx = useToast();
  const seen = useRef(0);
  useEffect(() => {
    seen.current += 1;
    identities.push({ success: ctx.success, error: ctx.error, value: ctx });
  });
  return (
    <button type="button" onClick={() => ctx.success("probe")}>
      probe
    </button>
  );
}

describe("ToastProvider context identity", () => {
  it("success/error/value keep identity across toast add/dismiss re-renders", async () => {
    identities = [];
    const { getByRole, getAllByRole } = render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    await act(async () => {
      getByRole("button", { name: /probe/i }).click();
    });
    // The toast rendered and the provider re-rendered — but
    // the consumer must NOT have: a stable context value lets
    // React bail out of propagating the re-render. The OLD
    // code re-rendered the consumer with a fresh value object
    // (new success/error closures) on every toast change —
    // exactly what refired effect-dependent reloads elsewhere.
    expect(getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    expect(identities.length).toBe(1);
    // belt and braces: if React ever does re-render the
    // consumer for another reason, the identities captured
    // must still all be the SAME objects.
    const first = identities[0];
    for (const later of identities.slice(1)) {
      expect(later.success).toBe(first.success);
      expect(later.error).toBe(first.error);
      expect(later.value).toBe(first.value);
    }
  });
});
