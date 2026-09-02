/**
 * Brand Preview — shows how branding will appear on a PDF
 */
import type {
  DbBrandProfile,
  PdfDefaultBrandingConfig,
} from "@/types/database";

interface Props {
  profiles: DbBrandProfile[];
  selectedProfileId: string | null;
  config: PdfDefaultBrandingConfig | null;
}

export function BrandPreview({ profiles, selectedProfileId, config }: Props) {
  const profile = profiles.find((p) => p.id === selectedProfileId);
  const useProfile = !!profile;
  const brandName =
    profile?.name ?? config?.pdf_default_brand_name ?? "FRELUX PAINT CALC";
  const tagline = profile?.tagline ?? config?.pdf_default_tagline ?? null;
  const primaryColor =
    profile?.primary_color ?? config?.pdf_default_primary_color ?? "#7C3AED";
  const logoUrl = profile?.logo_url ?? config?.pdf_default_logo_url ?? null;
  const phone = profile?.phone ?? config?.pdf_default_contact_phone ?? null;
  const email = profile?.email ?? config?.pdf_default_contact_email ?? null;
  const address = profile?.address ?? config?.pdf_default_address ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-bold text-foreground dark:text-primary-foreground">
          PDF Branding Preview
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {useProfile
            ? "Preview of your custom branding"
            : "Preview of FRELUX default branding"}
        </p>

        {/* Mock PDF preview */}
        <div
          className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10"
          style={{ minHeight: "400px" }}
        >
          {/* Watermark */}
          {logoUrl && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: 0.08 }}
            >
              <img
                src={logoUrl}
                alt="watermark"
                style={{ width: "60%" }}
                className="h-auto"
              />
            </div>
          )}
          {!logoUrl && (
            <div
              className="pointer-events-none absolute flex items-center justify-center text-4xl font-black"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                opacity: 0.08,
                color: primaryColor,
              }}
            >
              {brandName.toUpperCase()}
            </div>
          )}

          {/* Header */}
          <div
            className="relative z-10 p-6"
            style={{ borderBottom: `2px solid ${primaryColor}` }}
          >
            <div className="flex items-start justify-between">
              <div>
                {logoUrl && (
                  <img src={logoUrl} alt="logo" className="mb-2 h-10 w-auto" />
                )}
                <h3
                  style={{ color: primaryColor }}
                  className="text-xl font-bold"
                >
                  {brandName}
                </h3>
                {tagline && (
                  <p className="text-xs italic text-muted-foreground">{tagline}</p>
                )}
              </div>
              <div className="text-right">
                <h4
                  style={{ color: primaryColor }}
                  className="text-lg font-bold"
                >
                  QUOTATION
                </h4>
                <p className="text-xs text-muted-foreground">Ref: FRELUX-12345678</p>
              </div>
            </div>
            {(phone || email || address) && (
              <div className="mt-2 text-xs text-muted-foreground">
                {address && <span>{address} | </span>}
                {phone && <span>Tel: {phone} | </span>}
                {email && <span>Email: {email}</span>}
              </div>
            )}
          </div>

          {/* Mock content */}
          <div className="relative z-10 p-6">
            <div className="mb-4 rounded-lg bg-muted/50 p-3 dark:bg-white/5">
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Project Type</span>
                  <br />
                  <span className="font-semibold">Interior Painting</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paint Type</span>
                  <br />
                  <span className="font-semibold">Premium Emulsion</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Area</span>
                  <br />
                  <span className="font-semibold">120 m²</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paint Req.</span>
                  <br />
                  <span className="font-semibold">24 L</span>
                </div>
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                  <th className="py-2 text-left text-muted-foreground">#</th>
                  <th className="py-2 text-left text-muted-foreground">Item</th>
                  <th className="py-2 text-left text-muted-foreground">Qty</th>
                  <th className="py-2 text-right text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50 dark:border-white/5">
                  <td className="py-2">1</td>
                  <td>Paint (Premium)</td>
                  <td>3 containers</td>
                  <td className="text-right font-semibold">₦45,000</td>
                </tr>
                <tr className="border-b border-border/50 dark:border-white/5">
                  <td className="py-2">2</td>
                  <td>Primer</td>
                  <td>1 unit</td>
                  <td className="text-right font-semibold">₦8,000</td>
                </tr>
                <tr className="border-b border-border/50 dark:border-white/5">
                  <td className="py-2">3</td>
                  <td>Labour</td>
                  <td>120 m²</td>
                  <td className="text-right font-semibold">₦36,000</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 ml-auto w-48">
              <div className="flex justify-between py-1 text-xs">
                <span>Materials</span>
                <span>₦53,000</span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span>Labour</span>
                <span>₦36,000</span>
              </div>
              <div
                className="flex justify-between py-2 text-sm font-bold"
                style={{
                  borderTop: `2px solid ${primaryColor}`,
                  color: primaryColor,
                }}
              >
                <span>Grand Total</span>
                <span>₦89,000</span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              {useProfile
                ? "Powered by FRELUX PAINT CALC"
                : `Generated by ${brandName} — Smart Construction Estimation`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
