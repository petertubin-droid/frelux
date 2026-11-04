import {
  measureInSiteUnits,
  unitsToBuy,
  type AggregateUnitOption,
} from "@/config/aggregate-units";

export interface SandQuantityHintProps {
  /** Sand volume the estimate needs, in cubic metres. */
  volume: number;
  unit: AggregateUnitOption;
  market: string | null | undefined;
}

/**
 * Says the sand quantity in the units a site actually counts, so a reader can
 * check the trip against the barrows they see tipped on the ground.
 */
export function SandQuantityHint({
  volume,
  unit,
  market,
}: SandQuantityHintProps) {
  if (!Number.isFinite(volume) || volume <= 0) return null;
  const site = measureInSiteUnits(volume, market);
  const units = unitsToBuy(volume, unit);

  return (
    <p className="text-xs text-muted-foreground">
      That is about {volume.toFixed(2)} m³ of sharp sand, which measures out as{" "}
      {site.wheelbarrows} wheelbarrows or {site.headPans} head pans, so you need{" "}
      {units} {units === 1 ? unit.plural.replace(/s$/, "") : unit.plural} at the
      size selected.
    </p>
  );
}

export default SandQuantityHint;
