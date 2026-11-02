/**
 * Compact city picker and price-basis disclosure.
 *
 * Renders nothing outside Nigeria: the index only holds Nigerian city data, so
 * offering a city choice elsewhere would imply city prices exist.
 */
import { MapPin } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import { useProjectCity } from "@/lib/price-index/use-project-city";

export function CityPriceSelect({ className = "" }: { className?: string }) {
  const { marketCode } = useMarket();
  const { citySlug, setCitySlug, cities } = useProjectCity();

  if (marketCode !== "NG") return null;

  return (
    <label className={`flex items-center gap-2 text-xs ${className}`}>
      <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Prices for</span>
      <select
        value={citySlug ?? ""}
        onChange={(event) => setCitySlug(event.target.value || null)}
        aria-label="Project city for material prices"
        className="h-8 rounded-md border border-border/70 bg-card px-2 text-xs"
      >
        <option value="">National median</option>
        {cities.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PriceBasisNote({ note }: { note: string | null }) {
  if (!note) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{note}</p>;
}
