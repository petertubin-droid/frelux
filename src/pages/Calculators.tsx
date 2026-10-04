import { Navigate } from "react-router-dom";

/**
 * Legacy route. /calculators now lives at /construction-tools.
 * Kept so old links, WhatsApp shares and search results keep working.
 */
export default function Calculators() {
  return <Navigate to="/construction-tools" replace />;
}
