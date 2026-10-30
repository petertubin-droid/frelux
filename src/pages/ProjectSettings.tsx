import { useMemo, useState } from "react";
import {
  Check,
  Globe2,
  RotateCcw,
  Ruler,
  Coins,
  Languages,
  SlidersHorizontal,
} from "lucide-react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import {
  SUPPORTED_COUNTRIES,
  findCountryDefaults,
} from "@/lib/settings/countries";
import {
  countryOptions,
  formatArea,
  formatLength,
  formatMoney,
  formatNumberValue,
  formatVolume,
  formatWeight,
  resolveGlobalSettings,
  sanitizeOverrides,
  type SettingsOverrides,
} from "@/lib/settings/global-settings";
import { useGlobalSettings } from "@/lib/settings/settings-store";

/**
 * Project settings.
 *
 * This page edits preferences, never calculations. Every calculator reads the
 * same resolved settings through useGlobalSettings(), so a change of country,
 * units or currency here reaches all of them without touching their engines.
 * Guests are told plainly that their choices live on this device.
 */

const FIELD =
  "w-full rounded-xl border border-white/20 bg-white/70 px-3 py-2.5 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5";
const LABEL =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground";
const PANEL =
  "rounded-2xl border border-white/20 bg-white/70 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6";

const CURRENCIES = [
  "NGN",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "CNY",
  "AED",
  "MXN",
  "KES",
  "ZAR",
  "INR",
  "JPY",
];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Globe2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={PANEL}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/60 text-primary dark:border-white/10 dark:bg-white/5">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProjectSettings() {
  const {
    settings,
    overrides,
    isGuest,
    savedToAccount,
    save,
    reset,
    isLoading,
  } = useGlobalSettings();
  const [draft, setDraft] = useState<SettingsOverrides>(overrides);
  const [status, setStatus] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useSeo({
    title: "Project Settings",
    description:
      "Choose your country, measurement system, currency and regional construction conventions. FRELUX applies them to every calculator.",
    canonicalPath: "/settings/preferences",
    noIndex: true,
  });

  // The preview resolves the draft, so a visitor sees the effect before saving.
  const preview = useMemo(() => resolveGlobalSettings(draft), [draft]);
  const dirty =
    JSON.stringify(sanitizeOverrides(draft)) !==
    JSON.stringify(sanitizeOverrides(overrides));

  const country = findCountryDefaults(
    draft.countryCode ?? settings.countryCode,
  );
  const selectedCode = draft.countryCode ?? settings.countryCode;
  const allCountries = useMemo(() => countryOptions(), []);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allCountries;
    return allCountries.filter(
      (option) =>
        option.name.toLowerCase().includes(needle) ||
        option.code.toLowerCase() === needle,
    );
  }, [allCountries, query]);
  // Keep the saved choice listed even while a search hides it.
  const visibleCountries =
    matches.length === 0
      ? allCountries.filter((option) => option.code === selectedCode)
      : matches.some((option) => option.code === selectedCode)
        ? matches
        : allCountries
            .filter((option) => option.code === selectedCode)
            .concat(matches);
  const numberFormat = {
    ...preview.numberFormat,
    ...(draft.numberFormat ?? {}),
  };
  const regional = { ...preview.regional, ...(draft.regional ?? {}) };

  const onSave = async () => {
    setSaving(true);
    const result = await save(draft);
    setSaving(false);
    setStatus(
      result.ok
        ? {
            tone: "ok",
            text: isGuest ? "Saved on this device." : "Saved to your account.",
          }
        : {
            tone: "error",
            text: result.error ?? "Could not save your settings.",
          },
    );
  };

  const onReset = async () => {
    await reset();
    setDraft({});
    setStatus({ tone: "ok", text: "Back to the country defaults." });
  };

  return (
    <div className="pb-16">
      <Container className="max-w-5xl pt-10 sm:pt-14">
        <PageHeader
          title="Project settings"
          subtitle="Your country, units and currency, applied to every FRELUX calculator. Calculations always run in metric internally, so changing what you see never changes what the engine works out."
        />

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/20 bg-white/60 px-3 py-1 text-muted-foreground dark:border-white/10 dark:bg-white/5">
            {isGuest
              ? "Guest: preferences stay on this device"
              : savedToAccount
                ? "Saved to your account"
                : "Signed in: press save to store these on your account"}
          </span>
          {settings.overridden.length > 0 && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-foreground">
              {settings.overridden.length} personal override
              {settings.overridden.length === 1 ? "" : "s"}
            </span>
          )}
          {isLoading && (
            <span className="text-muted-foreground">
              Loading your saved settings
            </span>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <Section
            icon={Globe2}
            title="Country and market"
            description="Sets the suggested units, currency, number format and local trade conventions."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="settings-country-search">
                  Find your country
                </label>
                <input
                  id="settings-country-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or code"
                  className={FIELD}
                />
                <label
                  className={classNames(LABEL, "mt-3")}
                  htmlFor="settings-country"
                >
                  Project country
                </label>
                <select
                  id="settings-country"
                  value={selectedCode}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      countryCode: e.target.value,
                    }))
                  }
                  className={FIELD}
                >
                  {visibleCountries.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name} ({option.currencyCode})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {query.trim() && matches.length === 0
                    ? "No country matches that search."
                    : `${matches.length} of ${allCountries.length} countries`}
                  {" · "}
                  {country?.marketCode
                    ? "Local FRELUX pricing is published for this market."
                    : "No local price book yet, so estimates use the reference market."}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/50 p-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/5">
                {country?.regional.note}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {SUPPORTED_COUNTRIES.length} countries and territories, each with
              its own currency and separators. Trade conventions are researched
              for 13 of them; the rest start from editable international
              defaults.
            </p>
          </Section>

          <div className="grid gap-5 md:grid-cols-2">
            <Section
              icon={Ruler}
              title="Measurement system"
              description="How lengths and areas are shown to you."
            >
              <div className="flex gap-2">
                {(["metric", "imperial"] as const).map((system) => {
                  const active =
                    (draft.measurementSystem ?? settings.measurementSystem) ===
                    system;
                  return (
                    <button
                      key={system}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          measurementSystem: system,
                        }))
                      }
                      aria-pressed={active}
                      className={classNames(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition",
                        active
                          ? "border-primary/40 bg-primary/15 text-foreground"
                          : "border-white/20 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/5",
                      )}
                    >
                      {system === "metric"
                        ? "Metric (m, m²)"
                        : "Imperial (ft, ft²)"}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Engine calculations stay metric. This changes display only, so
                estimates remain comparable.
              </p>
            </Section>

            <Section
              icon={Coins}
              title="Currency"
              description="Which currency prices and estimates are shown in."
            >
              <label className={LABEL} htmlFor="settings-currency">
                Display currency
              </label>
              <select
                id="settings-currency"
                value={draft.currencyCode ?? settings.currencyCode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    currencyCode: e.target.value,
                  }))
                }
                className={FIELD}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs text-muted-foreground">
                Prices themselves stay in their source market. This selects the
                currency you read them in.
              </p>
            </Section>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Section
              icon={Languages}
              title="Language"
              description="Prepared for translation. Selecting a language you have not translated yet keeps English text."
            >
              <label className={LABEL} htmlFor="settings-language">
                Interface language
              </label>
              <select
                id="settings-language"
                value={draft.language ?? settings.language}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, language: e.target.value }))
                }
                className={FIELD}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </Section>

            <Section
              icon={SlidersHorizontal}
              title="Number formatting"
              description="Separators and decimals, applied to every figure the site shows."
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="settings-decimals">
                    Measurement decimals
                  </label>
                  <select
                    id="settings-decimals"
                    value={String(numberFormat.decimals)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        numberFormat: {
                          ...(prev.numberFormat ?? {}),
                          decimals: Number(e.target.value),
                        },
                      }))
                    }
                    className={FIELD}
                  >
                    {[0, 1, 2, 3].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="settings-currency-decimals">
                    Money decimals
                  </label>
                  <select
                    id="settings-currency-decimals"
                    value={String(numberFormat.currencyDecimals)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        numberFormat: {
                          ...(prev.numberFormat ?? {}),
                          currencyDecimals: Number(e.target.value),
                        },
                      }))
                    }
                    className={FIELD}
                  >
                    {[0, 2].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>
          </div>

          <Section
            icon={SlidersHorizontal}
            title="Regional construction conventions"
            description="Local packaging and trade units. These feed bag and bucket counts, so they are worth checking."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="settings-bag">
                  Bag weight (kg)
                </label>
                <input
                  id="settings-bag"
                  inputMode="decimal"
                  value={String(regional.bagKg)}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      regional: {
                        ...(prev.regional ?? {}),
                        bagKg: Number(e.target.value),
                      },
                    }))
                  }
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="settings-paint">
                  Paint pack sizes (litres)
                </label>
                <input
                  id="settings-paint"
                  value={regional.paintBucketLitres.join(", ")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      regional: {
                        ...(prev.regional ?? {}),
                        paintBucketLitres: e.target.value
                          .split(",")
                          .map((part) => Number(part.trim()))
                          .filter(
                            (value) => Number.isFinite(value) && value > 0,
                          ),
                      },
                    }))
                  }
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="settings-aggregate">
                  Aggregate sold by
                </label>
                <select
                  id="settings-aggregate"
                  value={regional.aggregateUnit}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      regional: {
                        ...(prev.regional ?? {}),
                        aggregateUnit: e.target
                          .value as typeof regional.aggregateUnit,
                      },
                    }))
                  }
                  className={FIELD}
                >
                  {["tonne", "short ton", "tonne bag", "cubic yard"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="settings-land">
                  Land unit
                </label>
                <input
                  id="settings-land"
                  value={regional.landUnit ?? ""}
                  placeholder="Not used in this market"
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      regional: {
                        ...(prev.regional ?? {}),
                        landUnit: e.target.value,
                      },
                    }))
                  }
                  className={FIELD}
                />
              </div>
            </div>
          </Section>

          <section className={PANEL}>
            <h2 className="text-base font-semibold text-foreground">
              Preview with these settings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live values, formatted the way the site will show them once saved.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Measurement",
                  value: formatNumberValue(preview, 1234.5678),
                },
                { label: "Money", value: formatMoney(preview, 1250000) },
                { label: "Length", value: formatLength(preview, 3.048) },
                { label: "Area", value: formatArea(preview, 92.90304) },
                { label: "Weight", value: formatWeight(preview, 20000) },
                { label: "Volume", value: formatVolume(preview, 20) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between rounded-xl border border-white/15 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                >
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              {saving
                ? "Saving"
                : isGuest
                  ? "Save on this device"
                  : "Save to my account"}
            </button>
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/60 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 dark:border-white/10 dark:bg-white/5"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Use country defaults
            </button>
            {status && (
              <span
                role="status"
                className={classNames(
                  "text-sm",
                  status.tone === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {status.text}
              </span>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
