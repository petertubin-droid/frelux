import { ProfileCreditsWallet } from "@/components/profile/ProfileCreditsWallet";
import { useState, useRef, useEffect } from "react";
import {
  User,
  Camera,
  Save,
  Copy,
  Check,
  Mail,
  Phone,
  Shield,
  ShoppingBag,
  Calendar,
  Loader2,
  Clock,
  Gem,
  Flame,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/lib/credits-context";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

export default function Profile() {
  const { t } = useLanguage();
  useSeo({
    title: "My Profile, FRELUX",
    description:
      "Edit your profile information, upload a profile picture, and view your marketplace ID.",
    canonicalPath: "/profile",
    noIndex: true,
  });

  const {
    user,
    profile,
    refreshProfile,
    isPaid,
    paidStatus,
    loading: authLoading,
  } = useAuth();
  const { streak } = useCredits();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setTouched({ name: false, phone: false });
    }
  }, [profile]);

  // Dirty tracking
  const originalName = profile?.full_name ?? "";
  const originalPhone = profile?.phone ?? "";
  const isDirty =
    fullName.trim() !== originalName.trim() ||
    phone.trim() !== originalPhone.trim();

  // Validation rules
  const trimmedName = fullName.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 100;
  const nameError =
    touched.name && !isNameValid
      ? trimmedName.length < 2
        ? t("Full name must be at least 2 characters.")
        : t("Full name cannot exceed 100 characters.")
      : null;

  const trimmedPhone = phone.trim();
  const isPhoneValid = trimmedPhone === "" || PHONE_REGEX.test(trimmedPhone);
  const phoneError =
    touched.phone && !isPhoneValid
      ? t("Enter a valid international phone number (e.g. +1 555 123 4567).")
      : null;

  const canSave = isDirty && isNameValid && isPhoneValid && !saving;

  if (authLoading) {
    return (
      <>
        <PageHeader
          eyebrow="Account"
          title={t("My Profile")}
          subtitle={t("Loading your profile details...")}
        />
        <div
          className="mx-auto max-w-3xl px-4 py-16 flex flex-col items-center justify-center gap-3 text-center"
          role="status"
          aria-label={t("Loading profile")}
        >
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            {t("Loading your profile details...")}
          </p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow="Account"
          title={t("My Profile")}
          subtitle={t("Sign in to edit your profile and manage your account.")}
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <User
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-muted-foreground/80"
          />
          <p className="mt-4 text-muted-foreground">
            {t("Please sign in to view and edit your profile.")}
          </p>
          <Link
            to="/login/?redirect=/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("Sign In")}
          </Link>
        </div>
      </>
    );
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmedName, phone: trimmedPhone })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      setTouched({ name: false, phone: false });
      toast({
        type: "success",
        title: t("Profile updated"),
        message: t("Your changes have been saved."),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("Could not save profile changes. Please try again.");
      toast({
        type: "error",
        title: t("Failed to save"),
        message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({
        type: "error",
        title: t("Invalid file format"),
        message: t("Please choose a valid JPG, PNG, or WebP image."),
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        type: "error",
        title: t("File too large"),
        message: t("Please choose an image under 5MB."),
      });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user!.id);

      if (updateError) throw updateError;

      // Delete old avatar if it was in our bucket
      if (profile?.avatar_url && profile.avatar_url.includes("/avatars/")) {
        const oldPath = profile.avatar_url.split("/avatars/")[1];
        if (oldPath && oldPath !== path) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      await refreshProfile();
      toast({
        type: "success",
        title: t("Photo updated"),
        message: t("Your profile picture has been updated."),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("Could not upload image. Please try again.");
      toast({
        type: "error",
        title: t("Upload failed"),
        message,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copyMarketplaceId() {
    if (!profile?.marketplace_id) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profile.marketplace_id);
      } else {
        const el = document.createElement("textarea");
        el.value = profile.marketplace_id;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      toast({
        type: "success",
        title: t("Copied to clipboard"),
        message: t("Marketplace ID copied."),
        duration: 2500,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      toast({
        type: "error",
        title: t("Copy failed"),
        message: t("Could not copy automatically. Please select and copy manually."),
      });
    }
  }

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={t("My Profile")}
        subtitle={t("Manage your personal information and profile picture.")}
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Profile Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm dark:border-white/10 dark:bg-card">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative group">
              <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-border bg-muted dark:border-white/10 dark:bg-white/5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-3xl font-bold text-brand-purple">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                aria-label={t("Change profile picture")}
              >
                {uploading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <input
                aria-label={t("Profile photo upload")}
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
                {displayName}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground dark:text-muted-foreground">
                {user.email}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile?.role === "admin" ? "bg-accent-orange/15 text-accent-orange" : "bg-primary/10 text-brand-purple"}`}
                >
                  <Shield aria-hidden="true" className="h-3 w-3" />
                  {profile?.role === "admin" ? "FRELUX" : "Member"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile?.account_type === "pro_worker" ? "bg-accent-green/15 text-accent-green" : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground"}`}
                >
                  {profile?.account_type === "pro_worker"
                    ? "Pro Worker"
                    : "Client"}
                </span>
              </div>
            </div>
          </div>

          {/* Marketplace ID */}
          {profile?.marketplace_id && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    {t("Marketplace ID")}
                  </p>
                  <p className="text-sm font-bold tracking-wider text-foreground dark:text-primary-foreground">
                    {profile.marketplace_id}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                type="button"
                onClick={copyMarketplaceId}
                aria-label={copied ? t("Marketplace ID copied") : t("Copy Marketplace ID")}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-brand-purple dark:text-muted-foreground dark:hover:bg-white/5"
              >
                {copied ? (
                  <Check
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-accent-green"
                  />
                ) : (
                  <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                <span>{copied ? t("Copied") : t("Copy")}</span>
                <span className="sr-only" role="status" aria-live="polite">
                  {copied ? t("Marketplace ID copied to clipboard") : ""}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
                {t("Personal Information")}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground dark:text-muted-foreground">
                {t("Update your name and contact details.")}
              </p>
            </div>
            {isDirty && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                {t("Unsaved changes")}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="profile-full-name"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80"
              >
                <User
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
                {t("Full Name")}
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder={t("Enter your full name")}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "profile-name-error" : undefined}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/80 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              />
              {nameError && (
                <p id="profile-name-error" className="mt-1 text-xs text-destructive font-medium">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t("Phone Number")}
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder={t("Include country code, e.g. +1 555 123 4567 or +44 20 7123 4567")}
                aria-invalid={!!phoneError}
                aria-describedby={phoneError ? "profile-phone-error" : undefined}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/80 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              />
              {phoneError ? (
                <p id="profile-phone-error" className="mt-1 text-xs text-destructive font-medium">
                  {phoneError}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                  {t("Use standard international format starting with + and country code.")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t("Email")}
              </label>
              <input
                id="profile-email"
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                {t("Email address is linked to authentication and cannot be changed here. Contact support to update.")}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="default"
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              aria-disabled={!canSave}
              title={
                !isDirty
                  ? t("No changes to save")
                  : !isNameValid || !isPhoneValid
                    ? t("Please fix validation errors before saving")
                    : undefined
              }
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? t("Saving...") : t("Save Changes")}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Member Since")}
                </p>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  {profile?.created_at ? (
                    new Date(profile.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      {t("Registration date unavailable")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                <Shield aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  {t("Account Type")}
                </p>
                <p className="text-sm font-semibold capitalize text-foreground dark:text-primary-foreground">
                  {profile?.account_type?.replace("_", " ") ?? "Client"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Identity & Verification Note */}
        <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-primary/5 p-5 dark:bg-primary/10">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-brand-purple" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                {t("Marketplace & Pro Identity")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                {t(
                  "This unique identifier is surfaced on your marketplace listings, proposals, and seller details so clients and partners can verify your credentials and transaction history."
                )}
              </p>
              <div className="mt-2.5">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center text-xs font-semibold text-brand-purple hover:underline"
                >
                  {t("Explore Marketplace")} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Activity Streak & Rewards Overview */}
        <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                <Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("Daily Activity Streak")}
                </p>
                <p className="text-base font-bold text-foreground dark:text-primary-foreground">
                  {streak?.current_streak ?? 0} {t((streak?.current_streak ?? 0) === 1 ? "day" : "days")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/rewards/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Gem className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Explore Rewards & Milestones")}
              </Link>
            </div>
          </div>
        </div>

        {/* Centralized AI Credits & Rewards Wallet (Single Source of Truth) */}
        <div className="mt-6">
          <ProfileCreditsWallet />
        </div>

        {/* Subscription Status */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
          <div className="flex items-center gap-3">
            <div
              className={
                "flex h-10 w-10 items-center justify-center rounded-lg " +
                (isPaid
                  ? "bg-primary/15 text-brand-purple"
                  : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground")
              }
            >
              {isPaid ? (
                <PremiumBadge size="sm" />
              ) : (
                <Shield aria-hidden="true" className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                {t("Subscription Status")}
              </p>
              {isPaid ? (
                <div>
                  <p className="text-sm font-semibold capitalize text-foreground dark:text-primary-foreground">
                    {paidStatus?.plan || "Premium"} · {t("Active")}
                  </p>
                  {paidStatus?.paid_until && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {t("Renews / expires on")}{" "}
                      {new Date(paidStatus.paid_until).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </p>
                  )}
                </div>
              ) : paidStatus?.is_paid && paidStatus?.paid_until ? (
                <div>
                  <p className="text-sm font-semibold capitalize text-amber-600 dark:text-amber-400">
                    {paidStatus.plan || "Premium"} · {t("Expired")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                    {t("Expired on")}{" "}
                    {new Date(paidStatus.paid_until).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                    {t("Free Plan")}
                  </p>
                  <Link
                    to="/pricing/"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
                  >
                    <PremiumBadge size="xs" />
                    {t("Upgrade")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
