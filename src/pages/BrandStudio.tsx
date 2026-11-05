/**
 * FRELUX Brand Studio Page
 *
 * Sections:
 * 🎨 Brand Identity, business info, colours, branding details
 * 🤖 AI Logo Studio, AI-powered logo generation
 * 🎤 Voice Input, speech-to-text integrated into relevant fields
 * 📄 PDF Templates, template selection and branding preferences
 * 👁 Preview, preview branding before exporting
 * 💾 My Brand Templates, saved branding profiles
 *
 * Access control: Premium (SubscriptionGate) or rewarded-ad unlock
 */
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useState, useEffect, useCallback, Suspense } from "react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { useAuth } from "@/lib/auth";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { BrandIdentitySection } from "@/components/brand-studio/BrandIdentitySection";
import { AiLogoSection } from "@/components/brand-studio/AiLogoSection";
import { MyBrandTemplatesSection } from "@/components/brand-studio/MyBrandTemplatesSection";
import { PdfTemplateSection } from "@/components/brand-studio/PdfTemplateSection";
import { BrandPreview } from "@/components/brand-studio/BrandPreview";
import {
  resolveBrandStudioAccess,
  fetchBrandProfiles,
  fetchPdfBrandingConfig,
  type BrandStudioAccess,
} from "@/lib/brand-studio";
import type {
  DbBrandProfile,
  PdfDefaultBrandingConfig,
} from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { useBreadcrumbJsonLd } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";

const sections = [
  { id: "identity", label: "Brand Identity", icon: "🎨" },
  { id: "ai-logo", label: "AI Logo Studio", icon: "🤖" },
  { id: "templates", label: "PDF Templates", icon: "📄" },
  { id: "preview", label: "Preview", icon: "👁" },
  { id: "my-brands", label: "My Brand Templates", icon: "💾" },
] as const;

export default function BrandStudio() {
  const { t } = useLanguage();
  useBreadcrumbJsonLd([{ name: "Brand Studio", path: "/brand-studio" }]);
  const { user, isAdmin, isPaid, paidStatus } = useAuth();
  const [access, setAccess] = useState<BrandStudioAccess | null>(null);
  const [profiles, setProfiles] = useState<DbBrandProfile[]>([]);
  const [config, setConfig] = useState<PdfDefaultBrandingConfig | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [activeSection, setActiveSection] = useState<string>("identity");
  const [loading, setLoading] = useState(true);

  const loadAccess = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const a = await resolveBrandStudioAccess(
      user.id,
      isAdmin,
      isPaid,
      paidStatus,
    );
    setAccess(a);
    if (a.canSaveMultipleProfiles) {
      const p = await fetchBrandProfiles(user.id);
      setProfiles(p);
      const defaultProfile = p.find((p) => p.is_default);
      if (defaultProfile) setSelectedProfileId(defaultProfile.id);
    }
    const c = await fetchPdfBrandingConfig();
    setConfig(c);
    setLoading(false);
  }, [user, isAdmin, isPaid, paidStatus]);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  const refreshProfiles = useCallback(async () => {
    if (user) {
      const p = await fetchBrandProfiles(user.id);
      setProfiles(p);
    }
  }, [user]);

  return (
    <SubscriptionGate feature="brand_studio">
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("Brand Studio") },
        ]}
        eyebrow={t("PDF branding")}
        title={t("FRELUX Brand Studio")}
        subtitle={t("Brand your PDF exports with your own business identity.")}
      />

      <div className="min-h-screen bg-background">
        <Container className="max-w-4xl pb-12 pt-8">
          {/* Section tabs */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-border dark:border-white/10 pb-2">
            {sections.map((s) => (
              <Button
                variant="ghost"
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-white/5"
                }`}
              >
                <span className="mr-1">{s.icon}</span>
                {s.label}
              </Button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand-purple" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeSection === "identity" && (
                <BrandIdentitySection
                  userId={user?.id ?? ""}
                  access={access}
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  onProfileSaved={refreshProfiles}
                />
              )}
              {activeSection === "ai-logo" && (
                <Suspense
                  fallback={
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading AI Logo Studio…
                    </div>
                  }
                >
                  <AiLogoSection
                    userId={user?.id ?? ""}
                    access={access}
                    onLogoSelected={refreshProfiles}
                  />
                </Suspense>
              )}
              {activeSection === "templates" && (
                <PdfTemplateSection
                  access={access}
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                />
              )}
              {activeSection === "preview" && (
                <BrandPreview
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  config={config}
                />
              )}
              {activeSection === "my-brands" && (
                <MyBrandTemplatesSection
                  userId={user?.id ?? ""}
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                  onProfilesChanged={refreshProfiles}
                />
              )}
            </div>
          )}
        </Container>
      </div>
    </SubscriptionGate>
  );
}
