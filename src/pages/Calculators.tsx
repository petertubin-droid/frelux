import { Navigate } from "react-router-dom";
import { useBreadcrumbJsonLd } from "@/lib/seo";

/**
 * Legacy route. /calculators now lives at /construction-tools.
 * Kept so old links, WhatsApp shares and search results keep working.
 */
export default function Calculators() {
  useBreadcrumbJsonLd([{ name: "Calculators", path: "/calculators" }]);
  return <Navigate to="/construction-tools" replace />;
}
