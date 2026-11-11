import { COUNTRY_OPTIONS } from "@/lib/international/countries";

/** Resolve a label for a country already present in FRELUX market settings. */
export function proConnectCountryName(code?: string | null): string {
  if (!code) return "";
  return (
    COUNTRY_OPTIONS.flatMap((group) => group.countries).find(
      (country) => country.code === code.toUpperCase(),
    )?.name ?? code.toUpperCase()
  );
}
