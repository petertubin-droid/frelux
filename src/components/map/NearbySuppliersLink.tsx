import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { classNames } from "@/lib/utils";

/**
 * Entry point from a calculation to the map: after working out quantities,
 * the nearest sellers of that material are one click away.
 */
export function NearbySuppliersLink({
  material,
  className,
  label = "Find suppliers near you",
}: {
  /** What the user just calculated, used to pre-filter the map. */
  material: string;
  className?: string;
  label?: string;
}) {
  const href = `/map?layer=materials&q=${encodeURIComponent(material)}`;
  return (
    <Link
      to={href}
      className={classNames(
        "inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-premium dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        className,
      )}
    >
      <MapPin aria-hidden="true" className="h-4 w-4 text-primary" />
      {label}
    </Link>
  );
}

export default NearbySuppliersLink;
