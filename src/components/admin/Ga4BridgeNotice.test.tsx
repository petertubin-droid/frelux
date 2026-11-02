import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Ga4BridgeNotice from "./Ga4BridgeNotice";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, String(value)),
        key,
      ),
  }),
}));

describe("Ga4BridgeNotice", () => {
  it("names the disabled API and links the console step", () => {
    render(
      <Ga4BridgeNotice
        status={{
          configured: false,
          code: "api_disabled",
          reason:
            "The GA4 Admin API is disabled on the Google Cloud project that owns the service account.",
          serviceAccount: "reader@example.iam.gserviceaccount.com",
          steps: [
            "Enable the Analytics Admin API: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com?project=1",
          ],
        }}
      />,
    );
    expect(
      screen.getByText("Google Analytics API is disabled"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/disabled on the Google Cloud project/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute(
      "href",
      "https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com?project=1",
    );
    expect(
      screen.getByText(/reader@example.iam.gserviceaccount.com/),
    ).toBeInTheDocument();
  });

  it("keeps the first-party numbers honest when no credential exists", () => {
    render(
      <Ga4BridgeNotice
        status={{
          configured: false,
          code: "no_credentials",
          reason:
            "No service-account JSON is stored, so GA4 reports cannot be read.",
          steps: [],
        }}
      />,
    );
    expect(
      screen.getByText("No Google credential is stored"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/come from this site directly/),
    ).toBeInTheDocument();
  });
});
