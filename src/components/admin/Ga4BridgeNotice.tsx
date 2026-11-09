import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { Ga4Status } from "@/lib/traffic-report";

/**
 * Explains why GA4 reporting is or is not available inside the traffic
 * dashboard. The first-party numbers above it are always real; this panel only
 * covers the Google side, and names the exact missing step rather than a
 * generic "not configured".
 */

const HEADLINE: Record<Ga4Status["code"], string> = {
  ready: "GA4 reporting is connected",
  no_credentials: "No Google credential is stored",
  api_disabled: "Google Analytics API is disabled",
  no_property_access: "No GA4 property is shared with the key",
  error: "GA4 reporting could not be read",
};

function splitUrl(step: string): { text: string; url?: string } {
  const match = step.match(/https?:\/\/\S+/);
  if (!match) return { text: step };
  return {
    text: step.slice(0, match.index).replace(/:\s*$/, ""),
    url: match[0],
  };
}

export default function Ga4BridgeNotice({
  status,
}: {
  status: Ga4Status | null;
}) {
  const { t } = useLanguage();

  if (!status) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Reading GA4 reports needs the Data API bridge. The traffic numbers above come from this site directly and need no Google credentials.",
        )}
      </p>
    );
  }

  if (status.code === "ready") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {status.propertyName
          ? t("Reading property {name}.").replace("{name}", status.propertyName)
          : t("Reading GA4 property {id}.").replace(
              "{id}",
              status.propertyId ?? "",
            )}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t(HEADLINE[status.code])}
      </p>
      <p className="mt-1 text-sm text-foreground">{status.reason}</p>
      {status.steps.length > 0 ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          {status.steps.map((step) => {
            const { text, url } = splitUrl(step);
            return (
              <li key={step}>
                {text}
                {url ? (
                  <>
                    {text ? " " : ""}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
                    >
                      {t("Open")}
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  </>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      {status.serviceAccount ? (
        <p className="mt-2 break-all text-[11px] text-muted-foreground">
          {t("Service account")}: {status.serviceAccount}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {t(
          "The traffic numbers above come from this site directly and need no Google credentials.",
        )}
      </p>
    </div>
  );
}
