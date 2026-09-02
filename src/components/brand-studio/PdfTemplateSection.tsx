/**
 * PDF Template Section — select templates and branding preferences
 */
import { useState, useEffect } from "react";
import { Lock, FileText } from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { fetchPdfTemplates, updateBrandProfile } from "@/lib/brand-studio";
import type {
  BrandStudioAccess as BSAccess,
  DbBrandProfile,
  DbPdfBrandingTemplate,
} from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  access: BSAccess | null;
  profiles: DbBrandProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
}

export function PdfTemplateSection({
  access,
  profiles,
  selectedProfileId,
  onSelectProfile,
}: Props) {
  const [templates, setTemplates] = useState<DbPdfBrandingTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const t = await fetchPdfTemplates();
      setTemplates(t);
      setLoading(false);
    }
    load();
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const canUsePremium = access?.hasPremium ?? false;

  async function handleTemplateSelect(templateId: string) {
    if (!selectedProfileId || !selectedProfile) return;
    await updateBrandProfile(selectedProfileId, selectedProfile.user_id, {
      template_id: templateId,
    });
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading templates…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile selector */}
      <div className="rounded-2xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-bold text-foreground dark:text-primary-foreground">
          Select Brand Profile
        </h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved brand profiles. Create one in Brand Identity first.
          </p>
        ) : (
          <select
            value={selectedProfileId ?? ""}
            onChange={(e) => onSelectProfile(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
          >
            <option value="">— Select a profile —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Templates */}
      <div className="rounded-2xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-base font-bold text-foreground dark:text-primary-foreground">
          PDF Templates
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((tpl) => {
            const isSelected = selectedProfile?.template_id === tpl.id;
            const isLocked = tpl.is_premium && !canUsePremium;
            return (
              <div
                key={tpl.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? "border-brand-purple bg-primary/5"
                    : "border-border dark:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-purple" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                        {tpl.name}
                      </h3>
                      {tpl.is_premium && <PremiumBadge size="xs" glow />}
                    </div>
                  </div>
                  {isLocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                </div>
                {tpl.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tpl.description}
                  </p>
                )}
                {tpl.rewarded_unlock_enabled && (
                  <p className="mt-1 text-xs text-brand-purple">
                    Can unlock via rewarded ad
                  </p>
                )}
                {!isLocked && selectedProfileId && (
                  <Button
                    onClick={() => handleTemplateSelect(tpl.id)}
                    disabled={isSelected}
                    className="mt-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-brand-purple hover:bg-primary/20 disabled:opacity-50"
                  >
                    {isSelected ? "Selected" : "Use this template"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
