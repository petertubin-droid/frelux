import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Mail, Shield, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchCategories,
  fetchServices,
  fetchLocations,
  createProProfile,
  updateProProfile,
  updateProfileServices,
  updateProfileLocations,
  getMyProProfile,
  getMyProContactPhone,
  generateProSlug,
  isSlugAvailable,
  upgradeToProWorker,
  getAccountType,
} from "@/lib/pro-connect";
import { submitIdentityDocument } from "@/lib/worker-channels";
import {
  resendSignupConfirmation,
  isEmailConfirmed,
} from "@/lib/email-verification";
import {
  EMPTY_IDENTITY_VERIFICATION,
  IDENTITY_AUTO_VERIFY_NOTICE,
  IDENTITY_AUTO_VERIFY_MINUTES,
  fetchMyIdentityVerification,
  identityReviewLabel,
  isIdentityVerified,
  type MyIdentityVerification,
} from "@/lib/identity-verification";
import {
  IDENTITY_DOCUMENT_OPTIONS,
  isValidIdentityDocumentNumber,
  identityDocumentErrorMessage,
  PHONE_VERIFICATION_UNAVAILABLE_MESSAGE,
  UNVERIFIED_ACCOUNT_NOTICE,
  type IdentityDocumentType,
} from "@/lib/verification-policy";
import type { AccountType } from "@/types/pro-connect";
import type {
  DbProCategory,
  DbProService,
  DbProLocation,
  DbProProfile,
} from "@/types/pro-connect";
import { classNames } from "@/lib/utils";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import PageHeader from "@/components/ui/PageHeader";

export default function ProConnectRegister() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<DbProCategory[]>([]);
  const [services, setServices] = useState<DbProService[]>([]);
  const [locations, setLocations] = useState<DbProLocation[]>([]);
  const [existingProfile, setExistingProfile] = useState<DbProProfile | null>(
    null,
  );

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [country, setCountry] = useState("NG");
  const [availability, setAvailability] = useState<
    "available" | "busy" | "unavailable"
  >("available");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [_accountType, _setAccountType] = useState<AccountType>("client");
  const [error, setError] = useState("");

  // Email verification state (SMS verification is disabled: no gateway)
  const [emailResending, setEmailResending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  // Government-issued ID state (required before pro worker elevation)
  const [documentType, setDocumentType] =
    useState<IdentityDocumentType>("national_id");
  const [documentNumber, setDocumentNumber] = useState("");
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [identitySuccess, setIdentitySuccess] = useState("");
  const [identitySubmitted, setIdentitySubmitted] = useState(false);
  const [identityStatus, setIdentityStatus] = useState<MyIdentityVerification>(
    EMPTY_IDENTITY_VERIFICATION,
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login/?redirect=/pro-connect/register");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.email?.split("@")[0] || "");
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      const [cats, svcs, locs] = await Promise.all([
        fetchCategories(),
        fetchServices(),
        fetchLocations(),
      ]);
      setCategories(cats);
      setServices(svcs);
      setLocations(locs);

      // Account type is read, never raised here. Elevation to pro_worker
      // happens only after a government-issued ID is submitted (the RPC
      // refuses it otherwise), and the profile stays unverified until an
      // administrator approves the document.
      if (user) {
        const acct = await getAccountType(user.id);
        _setAccountType(acct);
      }

      // Check for existing profile
      if (user) {
        const existing = await getMyProProfile(user.id);
        if (existing) {
          setExistingProfile(existing);
          setProfileId(existing.id);
          setDisplayName(existing.display_name);
          setBusinessName(existing.business_name || "");
          setCategoryId(existing.category_id || "");
          setSlug(existing.slug);
          setBio(existing.bio || "");
          setYearsExperience(existing.years_experience?.toString() || "");
          setPhone((await getMyProContactPhone()) || "");
          if (existing.country) setCountry(existing.country);
          setWebsite(existing.website_url || "");
          setAvailability(existing.availability);
          setStep(1);
        }
      }
    })();
  }, [user]);

  const countryLocations = locations.filter(
    (l) => (l.country ?? "NG") === country,
  );
  const states = [...new Set(countryLocations.map((l) => l.state))].sort();
  const filteredServices = categoryId
    ? services.filter((s) => s.category_id === categoryId)
    : services;

  // Auto-generate slug
  useEffect(() => {
    if (!existingProfile) {
      const generated = generateProSlug(
        displayName || businessName || "professional",
      );
      setSlug(generated);
    }
  }, [displayName, businessName, existingProfile]);

  async function handleStep1Submit() {
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    setSaving(true);
    setError("");

    if (!profileId) {
      // Check slug availability
      const available = await isSlugAvailable(slug);
      let finalSlug = slug;
      if (!available) {
        finalSlug = generateProSlug(
          slug + "-" + Date.now().toString().slice(-4),
        );
        setSlug(finalSlug);
      }

      const result = await createProProfile({
        display_name: displayName,
        slug: finalSlug,
        category_id: categoryId,
        business_name: businessName || undefined,
        bio: bio || undefined,
        years_experience: yearsExperience
          ? parseInt(yearsExperience)
          : undefined,
        contact_phone: phone || undefined,
        website_url: website || undefined,
      });
      if (result) {
        setProfileId(result.id);
      } else {
        setError("Failed to create profile. Please try again.");
        setSaving(false);
        return;
      }
    } else {
      await updateProProfile(profileId, {
        display_name: displayName,
        category_id: categoryId,
        business_name: businessName || null,
        bio: bio || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        contact_phone: phone || null,
        website_url: website || null,
      } as Partial<DbProProfile>);
    }

    setSaving(false);
    setStep(2);
  }

  async function handleStep2Submit() {
    if (!profileId) return;
    setSaving(true);
    await updateProfileServices(profileId, selectedServices);
    setSaving(false);
    setStep(3);
  }

  async function handleStep3Submit() {
    if (!profileId) return;
    setSaving(true);
    await updateProfileLocations(profileId, selectedLocations);
    await updateProProfile(profileId, {
      availability,
      country,
      is_profile_complete: true,
      is_listed: true,
    } as Partial<DbProProfile>);
    setSaving(false);
    setStep(4);
  }

  // Email verification handler (replaces SMS OTP: no gateway configured)
  async function handleResendEmail() {
    if (!user?.email) {
      setEmailError("No email address on this account.");
      return;
    }
    setEmailResending(true);
    setEmailError("");
    setEmailMessage("");
    const result = await resendSignupConfirmation(user.email);
    if (result.success) setEmailMessage(result.message);
    else setEmailError(result.message);
    setEmailResending(false);
  }

  // Government-issued ID handler. Elevation to pro_worker only runs after
  // the ID is accepted by the submit_identity_document RPC, and the
  // profile stays unverified until an administrator approves it.
  async function handleSubmitIdentity() {
    const trimmed = documentNumber.trim();
    if (!isValidIdentityDocumentNumber(documentType, trimmed)) {
      setIdentityError(identityDocumentErrorMessage(documentType));
      return;
    }
    if (!user) return;
    setIdentitySubmitting(true);
    setIdentityError("");
    setIdentitySuccess("");
    try {
      const result = await submitIdentityDocument(
        documentType,
        trimmed,
        user.id,
      );
      if (!result.success) throw new Error(result.message);
      setIdentitySuccess(result.message);
      setIdentitySubmitted(true);
      setIdentityStatus({
        status: "pending",
        documentType,
        submittedAt: new Date().toISOString(),
        autoVerified: false,
        verifiedAt: null,
        autoVerifyAt: new Date(
          Date.now() + IDENTITY_AUTO_VERIFY_MINUTES * 60_000,
        ).toISOString(),
      });
      const elevated = await upgradeToProWorker();
      if (elevated) _setAccountType("pro_worker");
    } catch (err: unknown) {
      setIdentityError(
        getSafeError(err, "Identity document submission failed"),
      );
    } finally {
      setIdentitySubmitting(false);
    }
  }

  // Read the stored identity state for returning professionals.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchMyIdentityVerification()
      .then((status) => {
        if (!alive) return;
        if (status.status !== "none") setIdentityStatus(status);
        if (status.status === "pending" || status.status === "approved") {
          setIdentitySubmitted(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  // While an ID is under review, poll until it is decided. The automatic
  // fallback resolves within IDENTITY_AUTO_VERIFY_MINUTES, so this stops on
  // its own and never turns into an unbounded timer.
  useEffect(() => {
    if (!user) return;
    if (!identitySubmitted) return;
    if (identityStatus.status !== "pending") return;
    let alive = true;
    const timer = setInterval(async () => {
      const status = await fetchMyIdentityVerification().catch(() => null);
      if (!alive || !status) return;
      if (status.status !== "none") setIdentityStatus(status);
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user, identitySubmitted, identityStatus.status]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        backTo="/pro-connect/"
        backLabel={t("Back to directory")}
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("Pro Connect"), path: "/pro-connect/" },
          { label: t("Professional registration") },
        ]}
        eyebrow={t("Pro Connect")}
        title={
          existingProfile
            ? t("Edit Professional Profile")
            : t("Become a FRELUX Professional")
        }
        subtitle={t(
          "Join the FRELUX Pro Connect network and connect with customers who need your services.",
        )}
      />

      {/* Progress bar */}
      <div className="mb-8 mt-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={classNames(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground",
                )}
              >
                {s < step ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  s
                )}
              </div>
              {s < 4 && (
                <div
                  className={classNames(
                    "h-0.5 w-12 sm:w-20",
                    s < step ? "bg-primary" : "bg-muted dark:bg-white/5",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Identity */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("Your name or professional name")}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              {t("Business Name")}
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={t("Optional company/business name")}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              Professional Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSelectedServices([]);
              }}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
            >
              <option value="">{t("Select your category")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              {t("Bio")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your professional experience, specialties, and what makes you stand out..."
              rows={4}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                {t("Years of Experience")}
              </label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                {t("Phone")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("Your contact phone")}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              {t("Website")}
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://your-website.com"
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
            />
          </div>
          <Button
            variant="default"
            onClick={handleStep1Submit}
            disabled={saving}
            className="w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      )}

      {/* Step 2: Services */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
            {t("Select Your Services")}
          </h2>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {t("Choose all services you offer. You can update these anytime.")}
          </p>
          <div className="space-y-2">
            {filteredServices.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-brand-purple/30 dark:border-white/10 dark:hover:border-brand-purple-lighter/30"
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(s.id)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedServices([...selectedServices, s.id]);
                    else
                      setSelectedServices(
                        selectedServices.filter((id) => id !== s.id),
                      );
                  }}
                  className="rounded border-border text-brand-purple focus:ring-brand-purple"
                />
                <span className="text-sm text-card-foreground dark:text-muted-foreground/60">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
            >
              {t("Back")}
            </Button>
            <Button
              variant="default"
              onClick={handleStep2Submit}
              disabled={saving}
              className="flex-1 rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Location & Availability */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground dark:text-primary-foreground">
              {t("Service Areas")}
            </h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {t("Select the locations where you provide services.")}
            </p>
          </div>

          <div className="max-w-xs">
            <label className="text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              {t("Country")}
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              <option value="NG">{t("Nigeria")}</option>
              <option value="GH">{t("Ghana")}</option>
              <option value="KE">{t("Kenya")}</option>
              <option value="ZA">{t("South Africa")}</option>
            </select>
          </div>

          {states.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              Service areas for this country are coming soon: you can continue
              without selecting any. Your profile will be listed under your
              selected country.
            </div>
          )}

          {states.map((state) => {
            const stateLocations = countryLocations.filter(
              (l) => l.state === state,
            );
            const _selectedInState = selectedLocations.filter((id) =>
              stateLocations.some((l) => l.id === id),
            );
            return (
              <div key={state}>
                <h3 className="mb-2 text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
                  {state}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stateLocations.map((l) => (
                    <Button
                      variant="ghost"
                      key={l.id}
                      onClick={() => {
                        if (selectedLocations.includes(l.id)) {
                          setSelectedLocations(
                            selectedLocations.filter((id) => id !== l.id),
                          );
                        } else {
                          setSelectedLocations([...selectedLocations, l.id]);
                        }
                      }}
                      className={classNames(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        selectedLocations.includes(l.id)
                          ? "border-brand-purple bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-brand-purple/30 dark:border-white/10 dark:text-muted-foreground/80",
                      )}
                    >
                      {[l.area, l.city].filter(Boolean).join(", ")}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60">
              {t("Availability Status")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["available", "busy", "unavailable"] as const).map((a) => (
                <Button
                  variant="ghost"
                  key={a}
                  onClick={() => setAvailability(a)}
                  className={classNames(
                    "rounded-lg border py-3 text-sm font-medium capitalize transition-colors",
                    availability === a
                      ? "border-brand-purple bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80",
                  )}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
            >
              {t("Back")}
            </Button>
            <Button
              variant="default"
              onClick={handleStep3Submit}
              disabled={saving}
              className="flex-1 rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Complete Profile"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Email Verification (SMS verification is disabled) */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail aria-hidden="true" className="h-8 w-8 text-brand-purple" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
              {t("Email Verification")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {t(
                "Confirm the email address on your account. It is how FRELUX reaches you about your profile.",
              )}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 dark:border-white/10">
            <p className="text-xs font-medium text-muted-foreground">
              {t("Account email")}
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-foreground dark:text-primary-foreground">
              {user?.email ?? t("No email on this account")}
            </p>
            <p className="mt-2 text-xs">
              {isEmailConfirmed(user) ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  {t("Email confirmed")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle aria-hidden="true" className="h-4 w-4" />
                  {t("Email not confirmed yet. Check your inbox for the link.")}
                </span>
              )}
            </p>
          </div>

          {!isEmailConfirmed(user) && (
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={emailResending}
              className="w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
            >
              {emailResending
                ? t("Sending...")
                : t("Resend confirmation email")}
            </Button>
          )}

          {emailMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {emailMessage}
            </p>
          )}
          {emailError && (
            <p className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
              {emailError}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p>{PHONE_VERIFICATION_UNAVAILABLE_MESSAGE}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg py-3 text-sm font-semibold"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
              {t("Back")}
            </Button>
            <Button
              variant="default"
              onClick={() => setStep(5)}
              className="flex-1 rounded-lg py-3 text-sm font-semibold"
            >
              {t("Continue")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Government-issued ID (required before pro worker elevation) */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield
                aria-hidden="true"
                className="h-8 w-8 text-brand-purple"
              />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-primary-foreground">
              {t("Government ID Verification")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {t(
                "Submit a government-issued ID. Your account stays unverified until a FRELUX administrator reviews it.",
              )}
            </p>
          </div>

          {identitySubmitted ? (
            isIdentityVerified(identityStatus) ? (
              <div
                data-testid="identity-verified-panel"
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10"
              >
                <Check
                  aria-hidden="true"
                  className="mx-auto mb-2 h-8 w-8 text-emerald-500"
                />
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {t("Identity verified")}
                </p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  {identityReviewLabel(identityStatus)}
                </p>
              </div>
            ) : (
              <div
                data-testid="identity-pending-panel"
                className="rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10"
              >
                <Check
                  aria-hidden="true"
                  className="mx-auto mb-2 h-8 w-8 text-amber-500"
                />
                <p className="font-semibold text-amber-700 dark:text-amber-300">
                  {identitySuccess}
                </p>
                <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                  {identityReviewLabel(identityStatus)}
                </p>
                <p className="mt-2 text-xs text-amber-700/80 dark:text-amber-300/80">
                  {IDENTITY_AUTO_VERIFY_NOTICE}
                </p>
              </div>
            )
          ) : (
            <>
              <div>
                <label
                  htmlFor="identity-document-type"
                  className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60"
                >
                  {t("Document type")} *
                </label>
                <select
                  id="identity-document-type"
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value as IdentityDocumentType);
                    setDocumentNumber("");
                    setIdentityError("");
                  }}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
                >
                  {IDENTITY_DOCUMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="identity-document-number"
                  className="mb-1.5 block text-sm font-medium text-card-foreground dark:text-muted-foreground/60"
                >
                  {documentType === "national_id"
                    ? t("National Identification Number (NIN)")
                    : t("Document number")}{" "}
                  *
                </label>
                <input
                  id="identity-document-number"
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder={
                    documentType === "national_id"
                      ? "11-digit NIN"
                      : t("Document number")
                  }
                  maxLength={24}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm dark:border-white/10 dark:bg-background"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t(
                    "Stored securely and visible only to FRELUX administrators for verification.",
                  )}
                </p>
              </div>

              {identityError && (
                <p className="flex items-center gap-1.5 text-sm text-red-500">
                  <AlertCircle aria-hidden="true" className="h-4 w-4" />
                  {identityError}
                </p>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <div>
                  <p>{UNVERIFIED_ACCOUNT_NOTICE}</p>
                  <p className="mt-1">{IDENTITY_AUTO_VERIFY_NOTICE}</p>
                </div>
              </div>

              <Button
                variant="default"
                onClick={handleSubmitIdentity}
                disabled={identitySubmitting || !documentNumber.trim()}
                className="w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
              >
                {identitySubmitting
                  ? t("Submitting...")
                  : t("Submit ID for verification")}
              </Button>
            </>
          )}

          <div className="border-t border-border pt-4 dark:border-white/10">
            <Button
              variant="ghost"
              onClick={() => setStep(6)}
              className="text-sm text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground/80"
            >
              {t("Skip for now")} →
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Done */}
      {step === 6 && (
        <div className="text-center py-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
            <Check
              aria-hidden="true"
              className="h-10 w-10 text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground dark:text-primary-foreground">
            Profile Created!
          </h2>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
            Your profile details have been saved. Identity checks remain pending
            until approved by FRELUX administrators.
          </p>
          <div className="mt-4 rounded-lg border border-brand-purple/20 bg-primary/5 p-3 text-sm">
            {isEmailConfirmed(user) ? (
              <p className="text-emerald-500">{t("Email confirmed")}</p>
            ) : (
              <p className="text-amber-500">
                {t("Confirm your email address to secure the account")}
              </p>
            )}
            {identitySubmitted ? (
              <p className="mt-1 text-amber-500">
                {t("Government ID submitted, pending admin verification")}
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
                {UNVERIFIED_ACCOUNT_NOTICE}
              </p>
            )}
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to={`/pro-connect/${slug}/`}
              className="rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("View My Profile")}
            </Link>
            <Link
              to="/pro-connect/dashboard/"
              className="rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground dark:border-white/10 dark:text-muted-foreground/80"
            >
              {t("Go to Dashboard")}
            </Link>
            {identitySubmitted && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Worker Channels access becomes available after identity review
                is approved.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
