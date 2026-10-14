/**
 * SupplierPortal — System C: Localized Supplier Onboarding & Live Price Management
 *
 * Free dashboard for material suppliers across 20+ countries to maintain their
 * live inventory and price lists. When a supplier updates prices, the calculation
 * engine's default database variables update instantly.
 */

import React, { useState, useEffect } from "react";
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
import {
  SAMPLE_SUPPLIER_PROFILES,
  SAMPLE_SUPPLIER_INVENTORY,
  saveSupplierInventoryItem,
} from "@/lib/international/supplier-inventory-engine";
import type {
  SupplierProfile,
  SupplierInventoryItem,
} from "@/types/hybrid-pricing";

const COUNTRY_OPTIONS = [
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "US", name: "United States", currency: "USD", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
];

export default function SupplierPortal() {
  const [selectedCountry, setSelectedCountry] = useState<string>("KE");
  const [profile, setProfile] = useState<SupplierProfile>(
    SAMPLE_SUPPLIER_PROFILES[0],
  );
  const [inventory, setInventory] = useState<SupplierInventoryItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // New item modal/inline form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemCategory, setNewItemCategory] = useState<string>("cement");
  const [newItemPrice, setNewItemPrice] = useState<string>("1000");
  const [newItemUnit, setNewItemUnit] = useState<string>("50kg bag");

  useEffect(() => {
    const prof =
      SAMPLE_SUPPLIER_PROFILES.find((p) => p.market_code === selectedCountry) ||
      SAMPLE_SUPPLIER_PROFILES[0];
    setProfile(prof);

    const items = SAMPLE_SUPPLIER_INVENTORY.filter(
      (item) => item.market_code === selectedCountry,
    );
    setInventory(items.length > 0 ? items : SAMPLE_SUPPLIER_INVENTORY);
  }, [selectedCountry]);

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
      await saveSupplierInventoryItem(item);
      setSaveSuccessId(item.id);
      setTimeout(() => setSaveSuccessId(null), 2500);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem: SupplierInventoryItem = {
      id: `custom-item-${Date.now()}`,
      supplier_id: profile.id,
      market_code: selectedCountry,
      category: newItemCategory,
      material_category: newItemCategory,
      material_slug: newItemName.toLowerCase().replace(/\s+/g, "-"),
      product_name: newItemName,
      unit: newItemUnit,
      unit_price: parseFloat(newItemPrice) || 0,
      currency: profile.country_name === "Kenya" ? "KES" : "USD",
      in_stock: true,
      stock_status: "in_stock",
      lead_time_days: 1,
      delivery_available: true,
      is_active: true,
    };

    setInventory((prev) => [newItem, ...prev]);
    setShowAddForm(false);
    setNewItemName("");
    setNewItemPrice("1000");

    await saveSupplierInventoryItem(newItem);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
              System C
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Localized Supplier Portal
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Free merchant dashboard to publish live material prices directly
            into the Frelux calculator.
          </p>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Regional Market:
          </span>
          <select
            aria-label="Regional Market"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 font-semibold text-slate-800 dark:text-slate-200"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

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
                  {profile.company_name}
                </h2>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                  Verified Merchant
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                <span>
                  {profile.city}, {profile.country_name}
                </span>
                <span>•</span>
                <span>{profile.address}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-slate-600">
                  <Phone className="w-3 h-3" />
                  {profile.phone}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="text-right">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                Top Pricing Priority
              </div>
              <div className="text-[11px] text-slate-400">
                Calculator displays verified quotes first
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
                Live Price List & Inventory Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Prices modified below reflect in customer calculators
                immediately.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Material Quote
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
                Product Name
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
                Category
              </label>
              <select
                aria-label="Category"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="h-8 w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="cement">Cement</option>
                <option value="steel">Steel / Rebar</option>
                <option value="aggregates">Aggregates / Sand</option>
                <option value="paint">Paint</option>
                <option value="roofing">Roofing Sheets</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Unit
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
                Price ({profile.country_name === "Kenya" ? "KES" : "USD"})
              </label>
              <Input
                type="number"
                placeholder="950"
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
                Save & Broadcast
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
                    Material / Product
                  </th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Live Price</th>
                  <th className="py-3 px-3 font-semibold">
                    Stock Availability
                  </th>
                  <th className="py-3 px-3 font-semibold">
                    Bulk Discount Tier
                  </th>
                  <th className="py-3 px-4 text-right font-semibold">
                    Actions
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
                        <span className="text-[11px] text-slate-400">None</span>
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
                            {savingId === item.id ? "Updating..." : "Update"}
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
    </div>
  );
}
