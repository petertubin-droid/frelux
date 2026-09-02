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

export default function Profile() {
  useSeo({
    title: "My Profile — FRELUX PAINT CALC",
    description:
      "Edit your profile information, upload a profile picture, and view your marketplace ID.",
    canonicalPath: "/profile",
    noIndex: true,
  });

  const { user, profile, refreshProfile, isPaid, paidStatus } = useAuth();
  const { wallet, streak } = useCredits();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow="Account"
          title="My Profile"
          subtitle="Sign in to edit your profile and manage your account."
        />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <User
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-muted-foreground/80"
          />
          <p className="mt-4 text-muted-foreground">
            Please sign in to view and edit your profile.
          </p>
          <Link
            to="/login?redirect=/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </Link>
        </div>
      </>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast({
        type: "success",
        title: "Profile updated",
        message: "Your changes have been saved.",
      });
    } catch (_err) {
      toast({
        type: "error",
        title: "Failed to save",
        message: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        type: "error",
        title: "File too large",
        message: "Please choose an image under 5MB.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        type: "error",
        title: "Invalid file",
        message: "Please upload an image file (JPG, PNG, or WebP).",
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
        title: "Photo updated",
        message: "Your profile picture has been updated.",
      });
    } catch (_err) {
      toast({
        type: "error",
        title: "Upload failed",
        message: "Could not upload image. Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function copyMarketplaceId() {
    if (!profile?.marketplace_id) return;
    navigator.clipboard.writeText(profile.marketplace_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle="Manage your personal information and profile picture."
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
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                aria-label="Change profile picture"
              >
                {uploading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
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
                  {profile?.role === "admin" ? "Admin" : "Member"}
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
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Marketplace ID
                  </p>
                  <p className="text-sm font-bold tracking-wider text-foreground dark:text-primary-foreground">
                    {profile.marketplace_id}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={copyMarketplaceId}
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
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm dark:border-white/10 dark:bg-card">
          <h3 className="text-base font-bold text-foreground dark:text-primary-foreground">
            Personal Information
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground dark:text-muted-foreground">
            Update your name and contact details.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
                <User
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted-foreground"
                />
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/80 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/80 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 dark:border-white/10 dark:bg-white/5 dark:text-primary-foreground dark:placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/80">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                Email cannot be changed here. Contact support to update your
                email.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="default"
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all hover:/90 active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Member Since
                </p>
                <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
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
                  Account Type
                </p>
                <p className="text-sm font-semibold capitalize text-foreground dark:text-primary-foreground">
                  {profile?.account_type?.replace("_", " ") ?? "Client"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Note */}
        <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-primary/5 p-5 dark:bg-primary/10">
          <div className="flex items-start gap-3">
            <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-brand-purple" />
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                Your Marketplace ID
              </p>
              <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">
                This unique ID will be used to identify you in the upcoming
                FRELUX marketplace. Share it with clients and partners so they
                can find you easily.
              </p>
            </div>
          </div>
        </div>

        {/* FRELUX Credits & Rewards */}
        <div className="mt-6 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <Gem className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  FRELUX Credits
                </p>
                <p className="text-lg font-bold text-foreground dark:text-primary-foreground">
                  {wallet?.balance ?? 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 dark:bg-amber-500/10">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {streak?.current_streak ?? 0} day
                  {(streak?.current_streak ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              <Link
                to="/rewards"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                View Rewards
              </Link>
            </div>
          </div>
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
                Subscription Status
              </p>
              {isPaid ? (
                <div>
                  <p className="text-sm font-semibold capitalize text-foreground dark:text-primary-foreground">
                    {paidStatus?.plan || "Premium"} · Active
                  </p>
                  {paidStatus?.paid_until && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expires{" "}
                      {new Date(paidStatus.paid_until).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </p>
                  )}
                </div>
              ) : paidStatus?.is_paid && paidStatus?.paid_until ? (
                <div>
                  <p className="text-sm font-semibold capitalize text-amber-600 dark:text-amber-400">
                    {paidStatus.plan || "Premium"} · Expired
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                    Expired on{" "}
                    {new Date(paidStatus.paid_until).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                    Free Plan
                  </p>
                  <Link
                    to="/pricing"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
                  >
                    <PremiumBadge size="xs" />
                    Upgrade
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
