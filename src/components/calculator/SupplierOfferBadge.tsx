import React, { useState, useEffect } from "react";
import {
  Store,
  CheckCircle2,
  ExternalLink,
  Phone,
  Package,
  Sparkles,
  Percent,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import {
  fetchSupplierOffersForMaterial,
  type SupplierOfferCardData,
} from "@/lib/international/supplier-inventory-engine";
import { slugifyMaterial } from "@/lib/international/crowdsourcing-engine";

interface SupplierOfferBadgeProps {
  materialName: string;
  marketCode: string;
  quantity?: number;
  onSelectSupplierPrice?: (price: number, supplierName: string) => void;
  className?: string;
}

export const SupplierOfferBadge: React.FC<SupplierOfferBadgeProps> = ({
  materialName,
  marketCode,
  quantity = 1,
  onSelectSupplierPrice,
  className = "",
}) => {
  const [offers, setOffers] = useState<SupplierOfferCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!materialName) return;
    setLoading(true);
    const slug = slugifyMaterial(materialName);
    fetchSupplierOffersForMaterial({
      marketCode,
      materialSlug: slug,
      quantity,
    })
      .then((data) => setOffers(data))
      .finally(() => setLoading(false));
  }, [materialName, marketCode, quantity]);

  if (loading || offers.length === 0) {
    return null;
  }

  const bestOffer = offers[0];

  return (
    <div className={`space-y-2 mt-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Store className="w-3.5 h-3.5" />
          Matching-market verified supplier quote
        </span>
        <span className="text-[11px] text-slate-400">
          Supplier quote · updated within 30 days
        </span>
      </div>

      <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {bestOffer.supplierName}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300"
            >
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />
              Verified supplier
            </Badge>
            <span className="text-[11px] text-slate-400">{bestOffer.city}</span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {bestOffer.unitPrice} {bestOffer.currency}
            </span>
            <span className="text-[11px] text-slate-500">/ unit</span>
            {bestOffer.bulkDiscountApplied && (
              <Badge
                variant="secondary"
                className="text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950"
              >
                <Percent className="w-2.5 h-2.5 mr-0.5 inline" />
                Bulk Tier Applied
              </Badge>
            )}
            <span className="text-[11px] text-emerald-600 font-medium">
              {(bestOffer.stockQuantity ?? 0) > 0 ? `(${bestOffer.stockQuantity} in stock)` : "(stock quantity not provided)"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSelectSupplierPrice && (
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() =>
                onSelectSupplierPrice(
                  bestOffer.unitPrice,
                  bestOffer.supplierName,
                )
              }
            >
              Use Supplier Quote
            </Button>
          )}
          {bestOffer.phone && (
            <a
              href={`tel:${bestOffer.phone}`}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900"
              title="Call Supplier"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
