import { AlertTriangle, ExternalLink } from "lucide-react";
import { getStructuralJurisdictionScope } from "@/lib/engineering/structural-jurisdiction-scope";
import { useMarket } from "@/lib/international/market-context";

/** Visible scope disclosure: country references are not a code-compliance claim. */
export default function StructuralScopeNotice() {
  const { marketCode } = useMarket();
  const scope = getStructuralJurisdictionScope(marketCode);
  if (!scope) {
    return (
      <section className="rounded-xl border border-amber-500/40 bg-amber-50/60 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" role="note" data-testid="structural-scope-notice">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Structural jurisdiction not verified</p>
        <p className="mt-2">No country scope is verified for market {marketCode}. The calculator does not select or apply a local structural code. Treat all outputs as preliminary screening only and obtain independent review by a locally licensed structural engineer.</p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-50/60 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" role="note" data-testid="structural-scope-notice">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />{scope.country} scope checked · code references only</p>
      <p className="mt-2"><strong>Framework reference:</strong> {scope.framework}</p>
      <p className="mt-1">{scope.localScope}</p>
      <p className="mt-2 font-medium">FRELUX structural calculations do not implement or certify this framework. Country selection does not make the result code-compliant. Outputs are preliminary estimates only and must not be used for construction without independent design and approval by a locally licensed structural engineer.</p>
      <a className="mt-2 inline-flex items-center gap-1 underline underline-offset-2" href={scope.verifiedSource} target="_blank" rel="noreferrer">{scope.sourceLabel}<ExternalLink className="h-3.5 w-3.5" /></a>
    </section>
  );
}
