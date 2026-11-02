import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import { WALLFIN_COUNTRY_PROFILES } from "@/lib/wallfinishing/countries";
import { WALLFIN_WALL_SYSTEMS } from "@/lib/wallfinishing/wall-systems";
import { WALLFIN_ASSEMBLIES } from "@/lib/wallfinishing/assemblies";

export const WALL_FINISHING_THEMES = [
  { key: "overview", label: "System overview" },
  { key: "materials", label: "Materials and specifications" },
  { key: "installation", label: "Installation sequence" },
  { key: "quality", label: "Quality checks and common defects" },
  { key: "maintenance", label: "Maintenance and repair" },
] as const;

export const WALL_FINISHING_LIBRARY_MARKETS = BUILTIN_MARKET_PROFILES.map((profile) => ({
  code: profile.country_code,
  countryName: profile.country_name,
  language: profile.default_language,
  hasNativeProfile: WALLFIN_COUNTRY_PROFILES.some((native) => native.code === profile.country_code),
}));

export function getWallFinishingCandidates() {
  const candidates = [
    ...WALLFIN_WALL_SYSTEMS.map((item) => ({ key: `system:${item.id}`, title: item.name, type: "wall_system" as const, markets: item.countryCodes })),
    ...WALLFIN_ASSEMBLIES.map((item) => ({
      key: `assembly:${item.id}`,
      title: item.name,
      type: "finish_assembly" as const,
      markets: WALLFIN_COUNTRY_PROFILES.filter((profile) => profile.assemblyIds.includes(item.id)).map((profile) => profile.code),
    })),
  ];
  return candidates.flatMap((candidate) => candidate.markets
    .filter((code) => WALLFIN_COUNTRY_PROFILES.some((profile) => profile.code === code))
    .map((code) => ({ marketCode: code, candidateKey: candidate.key, title: candidate.title, topicType: candidate.type })));
}

export const WALL_FINISHING_CANDIDATE_COUNT = getWallFinishingCandidates().length;
export const WALL_FINISHING_NATIVE_MARKET_COUNT = WALLFIN_COUNTRY_PROFILES.length;
export const WALL_FINISHING_UNCOVERED_MARKET_COUNT = WALL_FINISHING_LIBRARY_MARKETS.length - WALL_FINISHING_NATIVE_MARKET_COUNT;
