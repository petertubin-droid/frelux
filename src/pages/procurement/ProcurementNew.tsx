/**
 * Buyer: post a material request.
 *
 * One request covers a list of materials. Suppliers in the same market see it
 * and quote per line, which is what makes the quotations comparable later.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import {
  createMaterialRequest,
  type RequestDraftItem,
} from "@/lib/suppliers/procurement";
import {
  SUPPLIER_CATEGORIES,
  categoryDefaultUnit,
} from "@/lib/suppliers/types";

const COUNTRIES = COUNTRY_OPTIONS.flatMap((group) => group.countries);

export default function ProcurementNew() {
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [marketCode, setMarketCode] = useState("NG");
  const [city, setCity] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [items, setItems] = useState<RequestDraftItem[]>([
    {
      materialCategory: params.get("category") ?? SUPPLIER_CATEGORIES[0].slug,
      materialSlug: null,
      productName: "",
      brand: null,
      specification: null,
      unit: categoryDefaultUnit(
        params.get("category") ?? SUPPLIER_CATEGORIES[0].slug,
      ),
      quantity: 1,
      targetPrice: null,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Post a material request",
    description:
      "Describe the materials you need once and collect quotations from verified-level suppliers in your market.",
    canonicalPath: "/procurement/new",
    noIndex: true,
  });

  useEffect(() => {
    if (params.get("supplier")) {
      setNotes(
        (prev) => prev || "Requested through a supplier profile on FRELUX.",
      );
    }
  }, [params]);

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
          Post a material request
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in so suppliers know who is asking.
        </p>
        <Link to="/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  const updateItem = (index: number, patch: Partial<RequestDraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const country = COUNTRIES.find((c) => c.code === marketCode);
    const { request, error: createError } = await createMaterialRequest(
      user.id,
      {
        marketCode,
        currency: country?.currency ?? "NGN",
        city: city || null,
        neighbourhood: neighbourhood || null,
        title,
        notes: notes || null,
        neededBy: neededBy || null,
        visibility: "public",
        items,
      },
    );
    setSaving(false);
    if (createError || !request) {
      setError(createError ?? "The request could not be created.");
      return;
    }
    navigate(`/procurement/${request.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/procurement"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to requests
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        Post a material request
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Suppliers in your market see the list and quote per line. Nothing is
        ordered until you award a quotation.
      </p>

      <section className="mt-5 space-y-2 text-sm">
        <Input
          placeholder="What do you need? e.g. Blockwork materials for a duplex"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={marketCode}
            onChange={(e) => setMarketCode(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <Input
            className="w-40"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Input
            className="w-48"
            placeholder="Neighbourhood / site area"
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
          />
          <Input
            className="w-40"
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            aria-label="Needed by"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Access notes, delivery instructions, quality requirements"
          className="w-full rounded-md border border-slate-200 p-3 text-sm"
        />
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-slate-900">Materials</h2>
        <div className="mt-2 space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap gap-2">
                <select
                  value={item.materialCategory}
                  onChange={(e) =>
                    updateItem(index, {
                      materialCategory: e.target.value,
                      unit: categoryDefaultUnit(e.target.value),
                    })
                  }
                  className="h-9 rounded-md border border-slate-200 px-2 text-sm"
                >
                  {SUPPLIER_CATEGORIES.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <Input
                  className="min-w-0 flex-1"
                  placeholder="Product, e.g. Dangote 42.5R cement"
                  value={item.productName}
                  onChange={(e) =>
                    updateItem(index, { productName: e.target.value })
                  }
                />
                <Input
                  className="w-32"
                  placeholder="Specification"
                  value={item.specification ?? ""}
                  onChange={(e) =>
                    updateItem(index, { specification: e.target.value || null })
                  }
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  className="w-24"
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, { quantity: Number(e.target.value) })
                  }
                  aria-label="Quantity"
                />
                <Input
                  className="w-24"
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => updateItem(index, { unit: e.target.value })}
                />
                <Input
                  className="w-32"
                  placeholder="Target price (optional)"
                  inputMode="decimal"
                  value={item.targetPrice ?? ""}
                  onChange={(e) =>
                    updateItem(index, {
                      targetPrice: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
                {items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="ml-auto inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              {
                materialCategory: SUPPLIER_CATEGORIES[0].slug,
                materialSlug: null,
                productName: "",
                brand: null,
                specification: null,
                unit: categoryDefaultUnit(SUPPLIER_CATEGORIES[0].slug),
                quantity: 1,
                targetPrice: null,
              },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add material
        </Button>
      </section>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Publish request
        </Button>
        <span className="text-xs text-slate-500">
          Requests stay open for 14 days unless you close them.
        </span>
      </div>
    </div>
  );
}
