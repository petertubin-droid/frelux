/**
 * SupplierPortal — System C: Localized Supplier Onboarding & Live Price Management
 *
 * Free dashboard for material suppliers across 20+ countries to maintain their
 * live inventory and price lists. When a supplier updates prices, the calculation
 * engine's default database variables update instantly.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { ALL_20_MARKETS } from "@/lib/international/engine-inventory-types";
import {
  Store,
  Package,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Save,
  Truck,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { useLanguage } from "@/lib/i18n";
import {
  fetchSupplierProfiles,
  saveSupplierProfile,
  saveSupplierInventoryItem,
} from "@/lib/international/supplier-inventory-engine";
import type {
  SupplierProfile,
  SupplierInventoryItem,
} from "@/types/hybrid-pricing";

const MARKET_OPTIONS = COUNTRY_OPTIONS.flatMap(
  (group) => group.countries,
).filter((country) =>
  ALL_20_MARKETS.includes(country.code as (typeof ALL_20_MARKETS)[number]),
);

export default function SupplierPortal() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>("KE");
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [inventory, setInventory] = useState<SupplierInventoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("cement");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("50kg bag");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const market = MARKET_OPTIONS.find((item) => item.code === selectedCountry);
  const currency = market?.currency || "";

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) {
        setLoadingData(false);
        setProfile(null);
        setInventory([]);
        return;
      }
      setLoadingData(true);
      setLoadError(null);
      try {
        const profiles = await fetchSupplierProfiles(selectedCountry);
        const ownProfile =
          profiles.find((item) => item.user_id === user.id) || null;
        if (!active) return;
        setProfile(ownProfile);
        if (!ownProfile) {
          setInventory([]);
          return;
        }
        const { data, error } = await supabase
          .from("supplier_inventory_items")
          .select("*, supplier:supplier_profiles(*)")
          .eq("supplier_id", ownProfile.id)
          .eq("market_code", selectedCountry)
          .order("product_name");
        if (error) throw error;
        if (active) setInventory((data || []) as SupplierInventoryItem[]);
      } catch (error) {
        if (active)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load supplier records.",
          );
      } finally {
        if (active) setLoadingData(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, selectedCountry]);

  const handleCreateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !companyName.trim() || !city.trim() || !market) return;
    setSavingProfile(true);
    setLoadError(null);
    try {
      const saved = await saveSupplierProfile({
        user_id: user.id,
        company_name: companyName.trim(),
        city: city.trim(),
        market_code: selectedCountry,
        country_name: market.name,
        email: user.email || "",
      });
      setProfile(saved);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Supplier profile was not saved.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unit_price: newPrice } : item,
      ),
    );
  };

  const handleStockToggle = (id: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              in_stock: !item.in_stock,
              stock_status: !item.in_stock ? "in_stock" : "out_of_stock",
            }
          : item,
      ),
    );
  };

  const handleSaveItem = async (item: SupplierInventoryItem) => {
    setSavingId(item.id);
    try {
      const saved = await saveSupplierInventoryItem(item);
      setInventory((prev) =>
        prev.map((entry) => (entry.id === item.id ? saved : entry)),
      );
      setSaveSuccessId(item.id);
      setTimeout(() => setSaveSuccessId(null), 2500);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Price update failed.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !profile ||
      !newItemName.trim() ||
      !newItemPrice ||
      Number(newItemPrice) <= 0
    )
      return;

    const newItem: Partial<SupplierInventoryItem> &
      Pick<
        SupplierInventoryItem,
        | "supplier_id"
        | "market_code"
        | "material_category"
        | "material_slug"
        | "product_name"
        | "unit"
        | "unit_price"
        | "currency"
      > = {
      supplier_id: profile.id,
      market_code: selectedCountry,
      category: newItemCategory,
      material_category: newItemCategory,
      material_slug: newItemName.toLowerCase().replace(/\s+/g, "-"),
      product_name: newItemName,
      unit: newItemUnit,
      unit_price: parseFloat(newItemPrice) || 0,
      currency,
      in_stock: true,
      stock_status: "in_stock",
      lead_time_days: 1,
      delivery_available: true,
      is_active: true,
    };

    try {
      const saved = await saveSupplierInventoryItem(newItem);
      setInventory((prev) => [saved, ...prev]);
      setShowAddForm(false);
      setNewItemName("");
      setNewItemPrice("");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Inventory item was not saved.",
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
              {t("System C")}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t("Localized Supplier Portal")}
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your own market-specific inventory. Saved quotes are not
            purchase orders, and pending supplier accounts are never labeled
            verified.
          </p>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Regional Market:
          </span>
          <select
            aria-label={t("Regional Market")}
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-semibold text-slate-800 dark:text-slate-200"
          >
            {COUNTRY_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.countries
                  .filter((c) =>
                    ALL_20_MARKETS.includes(
                      c.code as (typeof ALL_20_MARKETS)[number],
                    ),
                  )
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {authLoading || loadingData ? (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            Loading supplier records…
          </CardContent>
        </Card>
      ) : null}
      {!authLoading && !user ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="font-semibold">
              {t("Sign in to manage supplier listings")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Supplier prices are account-owned and saved to the database. Demo
              inventory is not displayed as live pricing.
            </p>
            <Button asChild>
              <Link to="/login">{t("Sign in")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {user && !loadingData && !profile ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Create your supplier profile")}</CardTitle>
            <CardDescription>
              Real supplier details only. New profiles require verification
              before quotes can be treated as verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateProfile}
              className="grid gap-3 sm:grid-cols-3"
            >
              <Input
                aria-label={t("Company name")}
                placeholder={t("Company name")}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <Input
                aria-label={t("City")}
                placeholder={t("City")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Button disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Create profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {loadError ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {loadError}
        </div>
      ) : null}
      {user && profile && inventory.length === 0 && !loadingData ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No saved supplier inventory in {market?.name} yet. Add a real quote
            to begin; no sample prices are used.
          </CardContent>
        </Card>
      ) : null}
      {user && profile ? (
        <>
          {/* Supplier Profile Banner */}
          <Card className="border-emerald-100 dark:border-emerald-950 bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
            <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {profile?.company_name || "Supplier workspace"}
                    </h2>
                    {profile?.is_verified ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        {t("Verified supplier")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {t("Pending verification")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                    <span>
                      {profile?.city || city || "Set your city"},{" "}
                      {profile?.country_name || market?.name}
                    </span>
                    <span>•</span>
                    <span>{profile.address}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Phone className="w-3 h-3" />
                      {profile?.phone || "Contact not provided"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="text-right">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {profile?.is_verified
                      ? "Verified supplier listing"
                      : "Verification pending"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t(
                      "Quotes are shown only when account and market data qualify",
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Inventory List */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    {t("Live Price List & Inventory Controls")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Only successfully saved, eligible supplier quotes can be
                    considered by matching-market calculators. Listings are not
                    procurement orders.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t("Add Material Quote")}
                </Button>
              </div>
            </CardHeader>

            {showAddForm && (
              <form
                onSubmit={handleAddNewItem}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    {t("Product Name")}
                  </label>
                  <Input
                    placeholder="e.g. Blue Triangle Cement"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    {t("Category")}
                  </label>
                  <select
                    aria-label={t("Category")}
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="h-8 w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                  >
                    <option value="cement">{t("Cement")}</option>
                    <option value="steel">{t("Steel / Rebar")}</option>
                    <option value="aggregates">{t("Aggregates / Sand")}</option>
                    <option value="paint">{t("Paint")}</option>
                    <option value="roofing">{t("Roofing Sheets")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    {t("Unit")}
                  </label>
                  <Input
                    placeholder="50kg bag, 12m length, ton"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Price ({currency})
                  </label>
                  <Input
                    type="number"
                    placeholder="950"
                    min="0.01"
                    step="any"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900 font-bold"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                  >
                    {t("Save supplier quote")}
                  </Button>
                </div>
              </form>
            )}

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[11px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">
                        {t("Material / Product")}
                      </th>
                      <th className="py-3 px-3 font-semibold">
                        {t("Category")}
                      </th>
                      <th className="py-3 px-3 font-semibold">
                        {t("Live Price")}
                      </th>
                      <th className="py-3 px-3 font-semibold">
                        {t("Stock Availability")}
                      </th>
                      <th className="py-3 px-3 font-semibold">
                        {t("Bulk Discount Tier")}
                      </th>
                      <th className="py-3 px-4 text-right font-semibold">
                        {t("Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inventory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.product_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.sku || "CUSTOM-SUPPLIER"} • {item.unit}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {item.category || item.material_category}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              aria-label={`Price for ${item.product_name}`}
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                handlePriceChange(
                                  item.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-24 h-7 text-xs font-bold font-mono text-slate-900 dark:text-slate-100"
                            />
                            <span className="text-slate-500 font-medium">
                              {item.currency}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleStockToggle(item.id)}
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                              item.in_stock
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${item.in_stock ? "bg-emerald-500" : "bg-rose-500"}`}
                            />
                            {item.in_stock ? "In Stock" : "Out of Stock"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {item.bulk_discount_pct ? (
                            <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {item.bulk_discount_pct}% off ≥{" "}
                              {item.bulk_discount_threshold} units
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {t("None")}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveItem(item)}
                            disabled={savingId === item.id}
                            className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                          >
                            {saveSuccessId === item.id ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Live!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Save className="w-3.5 h-3.5" />
                                {savingId === item.id
                                  ? "Updating..."
                                  : "Update"}
                              </span>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
