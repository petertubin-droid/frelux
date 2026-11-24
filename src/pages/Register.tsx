import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  HardHat,
  User,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { useAuth, type AccountType } from "@/lib/auth";
import {
  COUNTRY_OPTIONS,
  getCountryFlag,
  getCountryDialCode,
} from "@/lib/international/countries";
import { toE164 } from "@/lib/phone/msisdn";
import Logo from "@/components/brand/Logo";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { useTurnstileGate } from "@/components/security/useTurnstileGate";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

const PRO_TRADE_OPTIONS = [
  "General Contractor & Builder",
  "Masonry, Bricklaying & Concrete",
  "Plumbing, Drainage & Sanitary",
  "Electrical, Solar & Inverters",
  "Painting, Screeding & Wall Finishes",
  "POP Ceiling, Plastering & Drywall",
  "Carpentry, Woodwork & Roofing",
  "Tiling, Marble & Flooring",
  "Welding, Steel Fabrication & Ironwork",
  "HVAC, Refrigeration & Cooling",
  "Structural Engineering & Surveying",
  "Architectural Design & Planning",
];

const GOVT_ID_TYPES = [
  { value: "national_id", label: "National Identity Card / Citizen ID" },
  { value: "passport", label: "International Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "voters_card", label: "Voter's Registration Card" },
  { value: "tax_id", label: "State / National Tax ID (TIN / SSN)" },
];

export default function Register() {
  const { t } = useLanguage();
  const { signUp, configured } = useAuth();
  const navigate = useNavigate();

  useSeo({
    title: "Registration Form | FRELUX Worldwide",
    description:
      "Premium Google-form style registration for clients and pro workers with verified identity, location, and phone verification.",
  });

  const turnstile = useTurnstileGate("register");

  // Form states
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("NG");
  const [phone, setPhone] = useState("");
  const [ninNumber, setNinNumber] = useState("");
  const [governmentIdType, setGovernmentIdType] = useState("national_id");
  const [governmentIdNumber, setGovernmentIdNumber] = useState("");
  const [tradeCategory, setTradeCategory] = useState(PRO_TRADE_OPTIONS[0]);
  const [businessName, setBusinessName] = useState("");
  const [yearsExperience, setYearsExperience] = useState("3");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Submission UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedData, setSubmittedData] = useState<{
    email: string;
    accountType: AccountType;
    location: string;
    identitySummary: string;
  } | null>(null);

  const selectedCountry = useMemo(() => {
    for (const group of COUNTRY_OPTIONS) {
      const match = group.countries.find((c) => c.code === countryCode);
      if (match) return match;
    }
    return { code: "NG", name: "Nigeria" };
  }, [countryCode]);

  const dialCode = useMemo(() => {
    return getCountryDialCode(countryCode) || "234";
  }, [countryCode]);

  const isNigeria = countryCode === "NG";

  function handleClearForm() {
    if (
      window.confirm(
        "Are you sure you want to clear this registration form? All entered responses will be erased.",
      )
    ) {
      setFullName("");
      setEmail("");
      setLocation("");
      setCountryCode("NG");
      setPhone("");
      setNinNumber("");
      setGovernmentIdType("national_id");
      setGovernmentIdNumber("");
      setBusinessName("");
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setFieldErrors({});
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full legal name is required.";
    }

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = "Enter a valid email address.";
    }

    if (!location.trim()) {
      errors.location =
        "Location (City, State / Region) is a mandatory field for both Client and Pro accounts.";
    }

    if (!countryCode) {
      errors.countryCode = "Select your country or jurisdiction.";
    }

    const normalizedPhone = toE164(phone, countryCode);
    if (!phone.trim() || !normalizedPhone) {
      errors.phone = `A valid mobile phone number is required (with country dial code +${dialCode}).`;
    }

    if (isNigeria) {
      const cleanNin = ninNumber.replace(/\D/g, "");
      if (!cleanNin) {
        errors.ninNumber = "Nigerian NIN is required.";
      } else if (cleanNin.length !== 11) {
        errors.ninNumber = `NIN must contain exactly 11 digits (currently ${cleanNin.length} digits).`;
      }
    } else {
      const cleanGovtId = governmentIdNumber.trim();
      if (!cleanGovtId) {
        errors.governmentIdNumber =
          "Government-issued ID number is required for international accounts.";
      } else if (cleanGovtId.length < 4) {
        errors.governmentIdNumber = "Enter a valid government ID number.";
      }
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      setError(
        "Please fix the highlighted required questions before submitting.",
      );
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    const verdict = await turnstile.gate();
    if (!verdict.ok) {
      setError(turnstile.errorMessage(verdict));
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = toE164(phone, countryCode);
      const cleanNin = isNigeria ? ninNumber.replace(/\D/g, "") : "";
      const cleanGovtId = !isNigeria ? governmentIdNumber.trim() : "";

      const metadata = {
        full_name: fullName.trim(),
        phone: `+${normalizedPhone}`,
        country_code: countryCode,
        location: location.trim(),
        nin_number: cleanNin,
        government_id_type: isNigeria ? "national_id" : governmentIdType,
        government_id_number: isNigeria ? cleanNin : cleanGovtId,
        ...(accountType === "pro_worker"
          ? {
              trade_category: tradeCategory,
              business_name: businessName.trim(),
              years_experience: yearsExperience,
            }
          : {}),
      };

      const result = await signUp(
        email.trim().toLowerCase(),
        password,
        accountType,
        metadata,
      );

      setLoading(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubmittedData({
        email: email.trim(),
        accountType,
        location: location.trim(),
        identitySummary: isNigeria
          ? `NIN: ${cleanNin}`
          : `${governmentIdType.replace(/_/g, " ").toUpperCase()}: ${cleanGovtId}`,
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected registration error occurred.",
      );
    }
  }

  // Response Recorded Success View
  if (submittedData) {
    return (
      <div className="min-h-screen bg-slate-100/90 py-12 px-4 sm:px-6 dark:bg-background">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header Strip */}
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg dark:border-white/10">
            <div className="h-3.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <Logo size="md" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Response Recorded
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                FRELUX Registration Completed
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account details and verified government identity have been
                securely registered with the FRELUX platform.
              </p>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-2.5 text-xs text-foreground">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Account Classification:
                  </span>
                  <span className="font-semibold capitalize">
                    {submittedData.accountType === "pro_worker"
                      ? "Pro Worker / Contractor"
                      : "Client / Property Developer"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Registered Email:
                  </span>
                  <span className="font-mono">{submittedData.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-semibold">
                    {submittedData.location}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">
                    Government Identity:
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {submittedData.identitySummary}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() =>
                    navigate(
                      submittedData.accountType === "pro_worker"
                        ? "/pro-connect/register"
                        : "/dashboard",
                    )
                  }
                  className="w-full sm:w-auto bg-brand-purple hover:bg-brand-purple-dark text-white px-6 py-2.5"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link
                  to="/login"
                  className="w-full sm:w-auto text-center text-xs font-semibold text-brand-purple hover:underline"
                >
                  Sign in with credentials
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 py-10 px-4 sm:px-6 dark:bg-background">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Google Form Header Card */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md transition-shadow hover:shadow-lg dark:border-white/10">
          <div className="h-3.5 w-full bg-gradient-to-r from-brand-purple via-indigo-600 to-amber-500" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <Logo size="md" />
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple dark:text-brand-purple-lighter">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Identity Standard</span>
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              FRELUX Worldwide Registration
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground/90">
              Welcome to the official registration portal for Clients,
              Homeowners, Builders, and Pro Contractors. Verified credentials
              protect project escrow, guarantee fair dispute resolution, and
              unlock regional trade dispatch.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Global Regulatory Awareness
              </span>
              <span>•</span>
              <span>256-Bit TLS Secured</span>
              <span>•</span>
              <span>Nigeria NIMC NIN & International IDs</span>
            </div>

            <div className="pt-1 text-xs font-medium text-destructive">
              * Indicates required question
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive dark:border-destructive/30"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to submit registration</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Card 1: Account Classification */}
          <div
            className={classNames(
              "rounded-xl border bg-card p-6 shadow-sm transition-all sm:p-8 dark:border-white/10",
              fieldErrors.accountType
                ? "border-destructive ring-1 ring-destructive"
                : "border-border",
            )}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  1. Account Classification{" "}
                  <span className="text-destructive">*</span>
                </h2>
                <span className="text-xs text-muted-foreground">
                  Select one option
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose how you intend to operate on the FRELUX network.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Choice */}
              <button
                type="button"
                onClick={() => setAccountType("client")}
                className={classNames(
                  "relative flex flex-col items-start rounded-xl border-2 p-5 text-left transition-all",
                  accountType === "client"
                    ? "border-brand-purple bg-brand-purple/5 shadow-sm ring-1 ring-brand-purple"
                    : "border-border hover:border-border/80 hover:bg-muted/30",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      accountType === "client"
                        ? "bg-brand-purple text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div
                    className={classNames(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      accountType === "client"
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {accountType === "client" && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </div>
                </div>
                <span className="mt-3 font-semibold text-foreground">
                  Client / Property Developer
                </span>
                <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Estimate construction costs, generate verified BOQs, purchase
                  materials, and hire vetted pros with escrow safety.
                </span>
              </button>

              {/* Pro Worker Choice */}
              <button
                type="button"
                onClick={() => setAccountType("pro_worker")}
                className={classNames(
                  "relative flex flex-col items-start rounded-xl border-2 p-5 text-left transition-all",
                  accountType === "pro_worker"
                    ? "border-brand-purple bg-brand-purple/5 shadow-sm ring-1 ring-brand-purple"
                    : "border-border hover:border-border/80 hover:bg-muted/30",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      accountType === "pro_worker"
                        ? "bg-brand-purple text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <HardHat className="h-5 w-5" />
                  </div>
                  <div
                    className={classNames(
                      "flex h-5 w-5 items-center justify-center rounded-full border-2",
                      accountType === "pro_worker"
                        ? "border-brand-purple bg-brand-purple text-white"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {accountType === "pro_worker" && (
                      <Check className="h-3 w-3 stroke-[3]" />
                    )}
                  </div>
                </div>
                <span className="mt-3 font-semibold text-foreground">
                  Pro Worker / Contractor
                </span>
                <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Offer trade services, receive verified client leads, join
                  regional worker channels, and get paid for site labor.
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Contact & Personal Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-5 dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                2. Contact & Identity Information{" "}
                <span className="text-destructive">*</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Both Client and Pro accounts require verified identity, email
                reachability, and geographical location.
              </p>
            </div>

            {/* Full Legal Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-fullname"
                className="block text-sm font-medium text-foreground"
              >
                Full Legal Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName)
                      setFieldErrors({ ...fieldErrors, fullName: "" });
                  }}
                  placeholder="e.g. Chukwudi Okafor or David Miller"
                  className={classNames(
                    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                    fieldErrors.fullName
                      ? "border-destructive ring-1 ring-destructive"
                      : "border-border",
                  )}
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-email"
                className="block text-sm font-medium text-foreground"
              >
                Email Address <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors({ ...fieldErrors, email: "" });
                  }}
                  placeholder="name@company.com"
                  className={classNames(
                    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                    fieldErrors.email
                      ? "border-destructive ring-1 ring-destructive"
                      : "border-border",
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for sign-in authentication, contract notices, and export
                document receipts.
              </p>
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Location (City, State / Region) */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-location"
                className="block text-sm font-medium text-foreground"
              >
                Location (City, State / Region){" "}
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple" />
                <input
                  id="register-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location)
                      setFieldErrors({ ...fieldErrors, location: "" });
                  }}
                  placeholder="e.g. Victoria Island, Lagos or Austin, Texas"
                  className={classNames(
                    "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                    fieldErrors.location
                      ? "border-destructive ring-1 ring-destructive"
                      : "border-border",
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mandatory for both Client and Pro accounts to ensure accurate
                local material pricing, regional currency calculations, and
                localized trade dispatch.
              </p>
              {fieldErrors.location && (
                <p className="text-xs text-destructive">
                  {fieldErrors.location}
                </p>
              )}
            </div>

            {/* Country & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country Selection */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-country"
                  className="block text-sm font-medium text-foreground"
                >
                  Country / Jurisdiction{" "}
                  <span className="text-destructive">*</span>
                </label>
                <select
                  id="register-country"
                  value={countryCode}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setCountryCode(newCountry);
                    setFieldErrors({});
                  }}
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                >
                  {COUNTRY_OPTIONS.flatMap((g) => g.countries).map((c) => (
                    <option key={c.code} value={c.code}>
                      {getCountryFlag(c.code)} {c.name} ({c.code}){" "}
                      {getCountryDialCode(c.code)
                        ? `+${getCountryDialCode(c.code)}`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Determines your applicable regulatory compliance standard.
                </p>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-phone"
                  className="block text-sm font-medium text-foreground"
                >
                  Mobile / Phone Number{" "}
                  <span className="text-destructive">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-muted/60 px-3 text-xs font-mono font-medium text-muted-foreground">
                    +{dialCode}
                  </span>
                  <div className="relative flex-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="register-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone)
                          setFieldErrors({ ...fieldErrors, phone: "" });
                      }}
                      placeholder={isNigeria ? "801 234 5678" : "Phone number"}
                      className={classNames(
                        "w-full rounded-r-lg border bg-background py-2.5 pl-9 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                        fieldErrors.phone
                          ? "border-destructive ring-1 ring-destructive"
                          : "border-border",
                      )}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  International format (+{dialCode} code pre-applied).
                </p>
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Government Identity Verification (Global Aware) */}
          <div
            className={classNames(
              "rounded-xl border bg-card p-6 shadow-sm transition-all sm:p-8 space-y-4 dark:border-white/10",
              fieldErrors.ninNumber || fieldErrors.governmentIdNumber
                ? "border-destructive ring-1 ring-destructive"
                : "border-border",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  3. Government Identity Verification{" "}
                  <span className="text-destructive">*</span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mandatory identity verification prevents fraudulent escrow and
                  secures marketplace contracts.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Global Aware
              </span>
            </div>

            {/* DYNAMIC NIGERIA SECTION */}
            {isNigeria ? (
              <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-4 dark:bg-emerald-950/20 dark:border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg" role="img" aria-label="Nigeria">
                    🇳🇬
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Federal Republic of Nigeria — NIMC Standard
                    </span>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      National Identification Number (NIN) is mandatory for all
                      Nigerian clients and pro workers.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="register-nin"
                      className="block text-sm font-medium text-foreground"
                    >
                      National Identification Number (NIN){" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <span
                      className={classNames(
                        "text-xs font-mono font-medium",
                        ninNumber.replace(/\D/g, "").length === 11
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {ninNumber.replace(/\D/g, "").length} / 11 digits
                      {ninNumber.replace(/\D/g, "").length === 11 && " ✓"}
                    </span>
                  </div>

                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="register-nin"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={11}
                      value={ninNumber}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        setNinNumber(val);
                        if (fieldErrors.ninNumber)
                          setFieldErrors({ ...fieldErrors, ninNumber: "" });
                      }}
                      placeholder="Enter official 11-digit NIN"
                      className={classNames(
                        "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 font-mono text-sm tracking-widest text-foreground transition-colors placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                        fieldErrors.ninNumber
                          ? "border-destructive ring-1 ring-destructive"
                          : "border-border",
                      )}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Enter the 11 numbers printed on your National Identity Slip
                    or NIMC mobile app.
                  </p>
                  {fieldErrors.ninNumber && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.ninNumber}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* DYNAMIC INTERNATIONAL SECTION */
              <div className="space-y-4 rounded-xl border border-indigo-500/30 bg-indigo-50/50 p-4 dark:bg-indigo-950/20 dark:border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg"
                    role="img"
                    aria-label={selectedCountry.name}
                  >
                    {getCountryFlag(countryCode)}
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                      {selectedCountry.name} — Government Identity Document
                    </span>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                      Official government-issued identity document for
                      international verification.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ID Document Type */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="register-id-type"
                      className="block text-sm font-medium text-foreground"
                    >
                      Document Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="register-id-type"
                      value={governmentIdType}
                      onChange={(e) => setGovernmentIdType(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    >
                      {GOVT_ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ID Document Number */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="register-id-number"
                      className="block text-sm font-medium text-foreground"
                    >
                      Document Number{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="register-id-number"
                        type="text"
                        required
                        maxLength={30}
                        value={governmentIdNumber}
                        onChange={(e) => {
                          setGovernmentIdNumber(e.target.value);
                          if (fieldErrors.governmentIdNumber) {
                            setFieldErrors({
                              ...fieldErrors,
                              governmentIdNumber: "",
                            });
                          }
                        }}
                        placeholder="e.g. P12345678 or DL-892301"
                        className={classNames(
                          "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                          fieldErrors.governmentIdNumber
                            ? "border-destructive ring-1 ring-destructive"
                            : "border-border",
                        )}
                      />
                    </div>
                    {fieldErrors.governmentIdNumber && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.governmentIdNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Pro Worker Specialization (Conditional) */}
          {accountType === "pro_worker" && (
            <div className="rounded-xl border border-brand-purple/40 bg-card p-6 shadow-sm sm:p-8 space-y-4 dark:border-brand-purple/30">
              <div>
                <div className="flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-brand-purple" />
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">
                    4. Professional Trade & Experience{" "}
                    <span className="text-destructive">*</span>
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Provide your construction specialty to match you with vetted
                  client project requests.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="register-trade"
                    className="block text-sm font-medium text-foreground"
                  >
                    Primary Trade / Specialization{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="register-trade"
                    value={tradeCategory}
                    onChange={(e) => setTradeCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                  >
                    {PRO_TRADE_OPTIONS.map((trade) => (
                      <option key={trade} value={trade}>
                        {trade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="register-business"
                      className="block text-sm font-medium text-foreground"
                    >
                      Business / Trade Name (Optional)
                    </label>
                    <input
                      id="register-business"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Masonry & Finishes Ltd"
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-3.5 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="register-experience"
                      className="block text-sm font-medium text-foreground"
                    >
                      Years of Experience
                    </label>
                    <select
                      id="register-experience"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2.5 px-3 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    >
                      <option value="1">1 - 2 years</option>
                      <option value="3">3 - 5 years</option>
                      <option value="6">6 - 9 years</option>
                      <option value="10">10+ years (Master Craftsman)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Account Security / Password */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-4 dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                {accountType === "pro_worker"
                  ? "5. Account Security"
                  : "4. Account Security"}{" "}
                <span className="text-destructive">*</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set a strong password (minimum 6 characters) to protect your
                account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="block text-sm font-medium text-foreground"
                >
                  Create Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors({ ...fieldErrors, password: "" });
                    }}
                    placeholder="At least 6 characters"
                    className={classNames(
                      "w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                      fieldErrors.password
                        ? "border-destructive ring-1 ring-destructive"
                        : "border-border",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-sm font-medium text-foreground"
                >
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="register-confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                      }
                    }}
                    placeholder="Repeat password"
                    className={classNames(
                      "w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20",
                      fieldErrors.confirmPassword
                        ? "border-destructive ring-1 ring-destructive"
                        : "border-border",
                    )}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Turnstile Security Check */}
          <div className="flex justify-center py-1">
            <TurnstileWidget
              action="register"
              onToken={(token) => turnstile.setToken(token)}
            />
          </div>

          {/* Submit Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-w-[180px] bg-brand-purple hover:bg-brand-purple-dark text-white px-6 py-2.5 font-semibold shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    Submit Registration <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleClearForm}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear form
              </button>
            </div>

            <div className="text-xs text-muted-foreground text-center sm:text-right">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-brand-purple hover:underline dark:text-brand-purple-lighter"
              >
                Sign in here
              </Link>
            </div>
          </div>

          {/* Form Footer */}
          <div className="pt-6 pb-8 text-center text-xs text-muted-foreground/70 space-y-1">
            <p>
              This content is created and secured by FRELUX Worldwide
              Construction Estimation.
            </p>
            <p>
              Never submit unencrypted passwords · Verified Identity Protocol ·
              2026
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
