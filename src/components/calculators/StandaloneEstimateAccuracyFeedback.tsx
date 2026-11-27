import { useLocation } from "react-router-dom";
import EstimateAccuracyFeedback from "@/components/calculators/EstimateAccuracyFeedback";
import { findToolByRoute } from "@/config/construction-tools";
import { stripLocaleFromPathname } from "@/lib/i18n";

/** Route-keyed feedback for calculator pages that render without ToolShell. */
export default function StandaloneEstimateAccuracyFeedback() {
  const { pathname } = useLocation();
  const route = stripLocaleFromPathname(pathname);
  const tool = findToolByRoute(route);
  const fallbackId = route.replace(/^\/+|\/+$/g, "").replace(/\//g, "-");

  return <EstimateAccuracyFeedback toolId={(tool?.slug ?? fallbackId) || "calculator"} />;
}
