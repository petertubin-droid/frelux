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
        "inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-semibold leading-none text-foreground transition-colors hover:border-primary/30 hover:bg-card dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        className,
      )}
    >
      <MapPin
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-primary"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default NearbySuppliersLink;
