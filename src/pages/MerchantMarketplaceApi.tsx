import React, { useState } from 'react';
import { useSeo } from '@/lib/seo';
import PageHeader from '@/components/ui/PageHeader';
import Container from '@/components/ui/Container';
import { Button } from '@/components/ui/shadcn/button';
import { 
  Store, 
  MapPin, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  Code2, 
  CheckCircle2, 
  Sparkles, 
  Webhook, 
  Building2, 
  ShoppingCart,
  Send,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { 
  SAMPLE_PARTNER_MERCHANTS, 
  findNearbyMerchantInventory, 
  type MerchantInventoryItem 
} from '@/lib/integrations/merchant-webhooks';
import { formatByCode } from '@/lib/international/currency-format';

export default function MerchantMarketplaceApi() {
  useSeo({
    title: 'Global Merchant API & Live Inventory Webhooks | FRELUX',
    description: 'Connect hardware store inventories (Hornbach, Wickes, Home Depot, Leroy Merlin, Buildzone) directly to FRELUX calculation outputs via live webhooks.',
  });

  const [selectedCategory, setSelectedCategory] = useState<MerchantInventoryItem['materialCategory']>('cement');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 6.5244,
    lng: 3.3792
  });
  const [webhookSimulated, setWebhookSimulated] = useState<boolean>(false);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  const nearbyItems = findNearbyMerchantInventory({
    category: selectedCategory,
    userLat: userLocation.lat,
    userLng: userLocation.lng
  });

  const handleSimulateWebhook = () => {
    setWebhookSimulated(true);
    setSimulatedLogs([
      `[${new Date().toISOString()}] POST /v1/webhooks/merchant-inventory HTTP/1.1`,
      'Signature: sha256=9f82d8c304... verified via Frelux Developer Portal',
      `Merchant ID: merch_homedepot_global -> Updated 14 items across 4 categories`,
      'Inventory sync completed. Live pricing and stock cache renewed in 12ms.'
    ]);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background Image Texture */}
      <div className="relative border-b border-border/40 bg-gradient-to-b from-card/80 to-background">
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2000&q=80')"
          }}
        />
        <Container className="relative py-12">
          <PageHeader
            eyebrow="Direct Retail Infrastructure"
            title="Global Merchant API & Inventory Webhooks"
            subtitle="Connect multinational hardware retail networks directly to FRELUX calculation outputs. The moment a contractor calculates an area, local store inventories are matched with live buy buttons."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Developers", path: "/developers" },
              { label: "Merchant Webhooks API" },
            ]}
          />
        </Container>
      </div>

      <Container className="py-10 space-y-10">
        {/* Architecture Showcase Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Webhook className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Direct Retail Webhooks</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Global suppliers push inventory stock updates, branch coordinates, and bulk price tiers directly into Frelux calculation engines.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">GPS Inventory Matching</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every BOQ or estimator line queries stores within the project radius to minimize transit lead times and transport haulage fees.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Instant One-Click Order</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Converts calculated bill quantities into pre-filled merchant shopping carts for instant trade account checkout.
            </p>
          </div>
        </div>

        {/* Live Material Matching Explorer */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Live Inventory Matcher
              </span>
              <h3 className="text-lg font-bold text-foreground mt-1">
                Nearby Partner Stock Feeds
              </h3>
            </div>

            {/* Category Selector */}
            <div className="flex flex-wrap gap-2">
              {(['cement', 'rebar', 'paint'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Matched Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nearbyItems.map((item) => (
              <div 
                key={item.sku}
                className="rounded-xl border border-border bg-background/50 p-5 space-y-4 hover:border-primary/50 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" /> {item.merchantName}
                    </span>
                    <h4 className="text-sm font-bold text-foreground mt-1">
                      {item.name}
                    </h4>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                    {item.inStockQuantity.toLocaleString()} {item.unit}s in stock
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <span className="flex items-center gap-1 text-foreground/80">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.storeLocation.address} ({item.storeLocation.distanceKm ? `${item.storeLocation.distanceKm} km` : 'Local'})
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatByCode(item.unitPrice, item.currency)} / {item.unit}
                  </span>
                </div>

                <div className="pt-2">
                  <a
                    href={item.directCheckoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary py-2 text-xs font-semibold transition-colors"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Live Checkout with Merchant
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Developer Console / Test Simulator */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Developer Webhook Gateway Simulator
              </h3>
            </div>
            <Button
              onClick={handleSimulateWebhook}
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Dispatch Simulated Inventory Webhook
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Merchants configure outbound webhooks pointing to <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">https://api.frelux.com/v1/webhooks/merchant-inventory</code>. Every payload updates live unit pricing and regional supply stock across all 20 international markets.
          </p>

          {webhookSimulated && (
            <div className="rounded-xl border border-border bg-zinc-950 p-4 font-mono text-xs text-emerald-400 space-y-1">
              {simulatedLogs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
