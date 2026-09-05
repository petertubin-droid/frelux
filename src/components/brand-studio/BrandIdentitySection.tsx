/**
 * Brand Identity Section — create/edit branding profile
 */
import { useState, useEffect } from "react";
import { Save, Trash2, Plus } from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { VoiceInput } from "./VoiceInput";
import {
  createBrandProfile,
  updateBrandProfile,
  deleteBrandProfile,
  type BrandStudioAccess as BSAccess,
} from "@/lib/brand-studio";
import type { DbBrandProfile } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";

interface Props {
  userId: string;
  access: BSAccess | null;
  profiles: DbBrandProfile[];
  selectedProfileId: string | null;
  onProfileSaved: () => Promise<void>;
}

export function BrandIdentitySection({
  userId,
  access,
  profiles,
  selectedProfileId,
  onProfileSaved,
}: Props) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [secondaryColor, setSecondaryColor] = useState("#0B1120");
  const [accentColor, setAccentColor] = useState("#F97316");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPlacement, setLogoPlacement] = useState("top-right");
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canEdit = access?.canUseCustomBranding ?? false;

  // Load selected profile for editing
  useEffect(() => {
    if (selectedProfileId) {
      const profile = profiles.find((p) => p.id === selectedProfileId);
      if (profile) {
        setEditingId(profile.id);
        setName(profile.name);
        setTagline(profile.tagline ?? "");
        setDescription(profile.description ?? "");
        setPhone(profile.phone ?? "");
        setWhatsapp(profile.whatsapp ?? "");
        setEmail(profile.email ?? "");
        setAddress(profile.address ?? "");
        setWebsite(profile.website ?? "");
        setPrimaryColor(profile.primary_color);
        setSecondaryColor(profile.secondary_color);
        setAccentColor(profile.accent_color);
        setLogoUrl(profile.logo_url);
        setLogoPlacement(profile.logo_placement);
        setIsDefault(profile.is_default);
      }
    } else {
      resetForm();
    }
  }, [selectedProfileId, profiles]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTagline("");
    setDescription("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setAddress("");
    setWebsite("");
    setPrimaryColor("#7C3AED");
    setSecondaryColor("#0B1120");
    setAccentColor("#F97316");
    setLogoUrl(null);
    setLogoPlacement("top-right");
    setIsDefault(false);
  }

  async function handleSave() {
    if (!userId || !name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    const data = {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      logo_url: logoUrl,
      logo_placement: logoPlacement,
      is_default: isDefault,
    };

    if (editingId) {
      const { error: updateError } = await updateBrandProfile(
        editingId,
        userId,
        data,
      );
      if (updateError) {
        setError(updateError);
      } else {
        setSuccess("Brand profile updated!");
        await onProfileSaved();
      }
    } else {
      const { error: createError } = await createBrandProfile(userId, data);
      if (createError) {
        setError(createError);
      } else {
        setSuccess("Brand profile created!");
        await onProfileSaved();
        resetForm();
      }
    }
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleDelete() {
    if (!editingId || !userId) return;
    if (!confirm("Delete this brand profile? This cannot be undone.")) return;
    setSaving(true);
    const { error: deleteError } = await deleteBrandProfile(editingId, userId);
    if (deleteError) {
      setError(deleteError);
    } else {
      setSuccess("Brand profile deleted.");
      resetForm();
      await onProfileSaved();
    }
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const { uploadBrandLogo } = await import("@/lib/brand-studio");
    const { url, error: uploadError } = await uploadBrandLogo(
      file,
      userId,
      file.type,
    );
    if (uploadError) {
      setError(uploadError);
    } else if (url) {
      setLogoUrl(url);
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-8 text-center">
        <PremiumBadge size="lg" glow className="mx-auto" />
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Brand Studio is a premium feature. Upgrade to create your own branded
          PDF profiles with custom colours, logos, and contact details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-sm text-accent-green">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-4 text-base font-bold text-foreground dark:text-primary-foreground">
          {editingId ? "Edit Brand Profile" : "Create Brand Profile"}
        </h2>

        <div className="space-y-4">
          <VoiceInput
            label="Business / Brand Name *"
            value={name}
            onChange={setName}
            placeholder="e.g. Andrew Luxury Paints"
          />

          <VoiceInput
            label="Tagline"
            value={tagline}
            onChange={setTagline}
            placeholder="e.g. Premium Painting & Interior Decoration"
          />

          <VoiceInput
            label="Business Description"
            value={description}
            onChange={setDescription}
            placeholder="Describe your business…"
            multiline
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 123 4567"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
                WhatsApp
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+234 800 123 4567"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@yourbusiness.com"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
              />
            </div>
          </div>

          <VoiceInput
            label="Business Address"
            value={address}
            onChange={setAddress}
            placeholder="123 Main Street, Lagos, Nigeria"
          />

          {/* Colours */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
              Brand Colours
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Primary</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-border"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full rounded border border-border px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Secondary
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-border"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full rounded border border-border px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-border"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full rounded border border-border px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
              Logo
            </label>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-12 w-12 rounded border border-border object-contain"
                />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a PNG or JPEG. You can also generate one in AI Logo Studio.
            </p>
          </div>

          {/* Logo placement */}
          <div>
            <label className="mb-1 block text-sm font-medium text-card-foreground dark:text-muted-foreground/80">
              Logo Placement
            </label>
            <select
              value={logoPlacement}
              onChange={(e) => setLogoPlacement(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground"
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
            </select>
          </div>

          {/* Default toggle */}
          <label className="flex items-center gap-2 text-sm text-card-foreground dark:text-muted-foreground/80">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded"
            />
            Set as default brand profile
          </label>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold hover:/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving
                ? "Saving…"
                : editingId
                  ? "Update Profile"
                  : "Create Profile"}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground dark:border-white/10 dark:hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
