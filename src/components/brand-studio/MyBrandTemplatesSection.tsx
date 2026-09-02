/**
 * My Brand Templates Section — list, select, manage saved branding profiles
 */
import { useState } from "react";
import { Trash2, Edit3, Crown } from "lucide-react";
import { updateBrandProfile, deleteBrandProfile } from "@/lib/brand-studio";
import type {
  BrandStudioAccess as BSAccess,
  DbBrandProfile,
} from "@/types/database";

interface Props {
  userId: string;
  access: BSAccess | null;
  profiles: DbBrandProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
  onProfilesChanged: () => Promise<void>;
}

export function MyBrandTemplatesSection({
  userId,
  _access,
  profiles,
  selectedProfileId,
  onSelectProfile,
  onProfilesChanged,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleSetDefault(id: string) {
    if (!userId) return;
    setBusy(true);
    await updateBrandProfile(id, userId, { is_default: true });
    await onProfilesChanged();
    setBusy(false);
  }

  async function handleDelete(id: string) {
    if (!userId || !confirm("Delete this brand profile?")) return;
    setBusy(true);
    await deleteBrandProfile(id, userId);
    if (selectedProfileId === id) onSelectProfile(null);
    await onProfilesChanged();
    setBusy(false);
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-muted-foreground">
          No saved brand profiles yet. Create one in the Brand Identity section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className={`rounded-xl border p-4 transition-colors ${
            selectedProfileId === profile.id
              ? "border-brand-purple bg-primary/5"
              : "border-border bg-card dark:border-white/10 dark:bg-white/5"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {profile.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.name}
                  className="h-10 w-10 rounded border border-border object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted text-xs font-bold text-muted-foreground">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground dark:text-primary-foreground">
                    {profile.name}
                  </h3>
                  {profile.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Crown className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                {profile.tagline && (
                  <p className="text-xs text-muted-foreground">{profile.tagline}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: profile.primary_color }}
                  />
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: profile.secondary_color }}
                  />
                  <span
                    className="h-4 w-4 rounded"
                    style={{ background: profile.accent_color }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSelectProfile(profile.id)}
                className="rounded-lg p-2 text-brand-purple hover:bg-primary/10"
                title="Select for editing"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              {!profile.is_default && (
                <button
                  onClick={() => handleSetDefault(profile.id)}
                  disabled={busy}
                  className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950"
                  title="Set as default"
                >
                  <Crown className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(profile.id)}
                disabled={busy}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
