/**
 * FRELUX Brand Studio Page
 *
 * Sections:
 * 🎨 Brand Identity — business info, colours, branding details
 * 🤖 AI Logo Studio — AI-powered logo generation
 * 🎤 Voice Input — speech-to-text integrated into relevant fields
 * 📄 PDF Templates — template selection and branding preferences
 * 👁 Preview — preview branding before exporting
 * 💾 My Brand Templates — saved branding profiles
 *
 * Access control: Premium (SubscriptionGate) or rewarded-ad unlock
 */
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
} from "@/lib/brand-studio";
import type {
  BrandStudioAccess,
  DbBrandProfile,
  PdfDefaultBrandingConfig,
} from "@/types/database";

const sections = [
  { id: "identity", label: "Brand Identity", icon: "🎨" },
  { id: "ai-logo", label: "AI Logo Studio", icon: "🤖" },
  { id: "templates", label: "PDF Templates", icon: "📄" },
  { id: "preview", label: "Preview", icon: "👁" },
  { id: "my-brands", label: "My Brand Templates", icon: "💾" },
] as const;

export default function BrandStudio() {
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
      paidStatus as {
        is_paid: boolean;
        paid_until: string | null;
        plan: string | null;
      } | null,
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
      <div className="min-h-screen bg-muted/50 dark:bg-background">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <PremiumBadge size="md" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
                FRELUX Brand Studio
              </h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Brand your PDF exports with your own business identity.
              </p>
            </div>
          </div>

          {/* Section tabs */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-border dark:border-white/10 pb-2">
            {sections.map((s) => (
              <button
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
              </button>
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
                  access={access}
                  profiles={profiles}
                  selectedProfileId={selectedProfileId}
                  onSelectProfile={setSelectedProfileId}
                  onProfilesChanged={refreshProfiles}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </SubscriptionGate>
  );
}
