/**
 * Supplier registration.
 *
 * Creates an `unverified` profile. The form collects only what a directory
 * needs, and the page explains - before anything is submitted - that a new
 * account carries no badge and must request each verification level.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { fetchMySupplier, registerSupplier } from "@/lib/suppliers/queries";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers/types";
import { VERIFICATION_LEVELS } from "@/lib/suppliers/verification";

const COUNTRIES = COUNTRY_OPTIONS.flatMap((group) => group.countries);

export default function SupplierRegister() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    marketCode: "NG",
    city: "",
    neighbourhood: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    businessRegNo: "",
    taxId: "",
    description: "",
    deliveryFeeModel: "quoted" as "free" | "per_order" | "per_km" | "quoted",
    minimumOrderValue: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Register a construction material supply business",
    description:
      "Publish your material catalogue, delivery coverage and prices to FRELUX buyers. Registration starts unverified; each verification level states exactly what has been checked.",
    canonicalPath: "/suppliers/register",
  });

  useEffect(() => {
    if (!user) return;
    fetchMySupplier(user.id).then(({ supplier }) => {
      if (supplier) {
        setExistingId(supplier.id);
        setForm((prev) => ({
          ...prev,
          companyName: supplier.company_name,
          contactName: supplier.contact_name ?? "",
          marketCode: supplier.market_code,
          city: supplier.city ?? "",
          neighbourhood: supplier.neighbourhood ?? "",
          address: supplier.address ?? "",
          phone: supplier.phone ?? "",
          whatsapp: supplier.whatsapp ?? "",
          email: supplier.email ?? "",
          businessRegNo: supplier.business_reg_no ?? "",
          taxId: supplier.tax_id ?? "",
          description: supplier.description ?? "",
          deliveryFeeModel: supplier.delivery_fee_model,
          minimumOrderValue: supplier.minimum_order_value?.toString() ?? "",
        }));
        setCategories(supplier.product_categories ?? []);
      }
    });
  }, [user]);

  const submit = async () => {
    if (!user) return;
    setError(null);
    if (!form.companyName.trim() || !form.city.trim() || !form.address.trim()) {
      setError("Business name, city and business address are required.");
      return;
    }
    if (!form.phone.trim() || !form.email.trim()) {
      setError(
        "A phone number and business email are required so buyers can reach you.",
      );
      return;
    }
    if (categories.length === 0) {
      setError("Select at least one product category.");
      return;
    }
    setSaving(true);
    const country = COUNTRIES.find((c) => c.code === form.marketCode);
    const { supplier, error: registerError } = await registerSupplier(user.id, {
      companyName: form.companyName,
      contactName: form.contactName,
      marketCode: form.marketCode,
      countryName: country?.name ?? null,
      city: form.city,
      neighbourhood: form.neighbourhood,
      address: form.address,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      businessRegNo: form.businessRegNo,
      taxId: form.taxId,
      description: form.description,
      categories,
      deliveryFeeModel: form.deliveryFeeModel,
      minimumOrderValue: form.minimumOrderValue
        ? Number(form.minimumOrderValue)
        : null,
      currency: country?.currency ?? "NGN",
    });
    setSaving(false);
    if (registerError || !supplier) {
      setError(registerError ?? "Registration could not be saved.");
      return;
    }
    navigate("/suppliers/workspace");
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your account…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Register a supply business
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in first so the catalogue and requests stay tied to a verified
          account.
        </p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Sign in to continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {existingId ? "Your supplier profile" : "Register a supply business"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Buyers search these details, so keep the city, address and categories
          accurate. Registration sets your level to{" "}
          <span className="font-medium">unverified</span>: nothing has been
          checked yet.
        </p>
      </header>

      {existingId ? (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          You already have a supplier profile in this market.{" "}
          <Link to="/suppliers/workspace" className="font-medium underline">
            Open your workspace
          </Link>{" "}
          to manage the catalogue, requests and verification.
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium text-slate-800">Business name</span>
          <Input
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">Contact name</span>
          <Input
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">Market</span>
          <select
            value={form.marketCode}
            onChange={(e) => setForm({ ...form, marketCode: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">City</span>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">
            Market location / neighbourhood
          </span>
          <Input
            value={form.neighbourhood}
            onChange={(e) =>
              setForm({ ...form, neighbourhood: e.target.value })
            }
            placeholder="e.g. Ojota market, Ile-Epo"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">Business address</span>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">Phone</span>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">
            WhatsApp (optional)
          </span>
          <Input
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">Business email</span>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">
            Business registration number (optional)
          </span>
          <Input
            value={form.businessRegNo}
            onChange={(e) =>
              setForm({ ...form, businessRegNo: e.target.value })
            }
            placeholder="CAC or local equivalent"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">
            Tax identification (optional)
          </span>
          <Input
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-slate-800">
            Minimum order value (optional)
          </span>
          <Input
            value={form.minimumOrderValue}
            onChange={(e) =>
              setForm({ ...form, minimumOrderValue: e.target.value })
            }
            inputMode="numeric"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">
            How do you charge delivery?
          </span>
          <select
            value={form.deliveryFeeModel}
            onChange={(e) =>
              setForm({
                ...form,
                deliveryFeeModel: e.target
                  .value as typeof form.deliveryFeeModel,
              })
            }
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3"
          >
            <option value="quoted">Quoted per order</option>
            <option value="free">Free within coverage</option>
            <option value="per_order">Fixed fee per order</option>
            <option value="per_km">Per kilometre</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">
            Business description
          </span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
            placeholder="What you stock, where you deliver, how quickly you usually respond."
          />
        </label>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Product categories
        </h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPLIER_CATEGORIES.map((category) => {
            const checked = categories.includes(category.slug);
            return (
              <label
                key={category.slug}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setCategories((prev) =>
                      e.target.checked
                        ? [...prev, category.slug]
                        : prev.filter((slug) => slug !== category.slug),
                    )
                  }
                />
                {category.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> What registration
          does and does not mean
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {VERIFICATION_LEVELS.map((level) => (
            <li key={level.level}>
              <span className="font-medium text-slate-800">{level.label}:</span>{" "}
              {level.meaning}
            </li>
          ))}
        </ul>
      </section>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={saving || Boolean(existingId)}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Create supplier profile
        </Button>
        <span className="text-xs text-slate-500">
          You can add products and request verification straight after this
          step.
        </span>
      </div>
    </div>
  );
}
