// =========================================================
// ARCHIE PWA — CODING SURFACE (/archie/coding)
//
// The Owner's complete mobile coding command center:
//   * ARCHIE CODING STUDIO — the SAME shared workbench as
//     the admin console (one implementation, one backend)
//   * CODE INTELLIGENCE — findings, traces, patch approvals
//
// No PWA-only duplicate: both panels are the shared
// components the admin console renders too.
// =========================================================

import { useState } from "react";
import { Code2, ShieldCheck } from "lucide-react";
import StudioWorkbench from "@/components/studio/StudioWorkbench";
import CodeIntelligencePanel from "@/components/archie/CodeIntelligencePanel";
import { Button } from "@/components/ui/shadcn/button";

type Surface = "studio" | "intelligence";

export default function ArchieCoding() {
  const [surface, setSurface] = useState<Surface>("studio");

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-2 md:pt-4">
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={surface === "studio" ? "secondary" : "ghost"}
            onClick={() => setSurface("studio")}
          >
            <Code2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Coding Studio
          </Button>
          <Button
            size="sm"
            variant={surface === "intelligence" ? "secondary" : "ghost"}
            onClick={() => setSurface("intelligence")}
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden /> Code
            Intelligence
          </Button>
        </div>
      </div>
      {surface === "studio" ? <StudioWorkbench /> : <CodeIntelligencePanel />}
    </div>
  );
}
