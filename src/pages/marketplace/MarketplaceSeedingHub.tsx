import React, { useState } from 'react';
import { useSeo } from '@/lib/seo';
import PageHeader from '@/components/ui/PageHeader';
import Container from '@/components/ui/Container';
import { Button } from '@/components/ui/shadcn/button';
import {
  Users2,
  Building,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  UserPlus,
  Compass,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  LAUNCH_TERRITORIES,
  getTerritoryLiquidity,
  submitConciergeRequest,
  nominateArtisanForEscrow,
  listSavedConciergeRequests,
  listSavedArtisanNominations,
  type LiquidityTier,
  type TerritoryLiquidityProfile,
} from '@/lib/marketplace/liquidity-seeding-protocol';

export default function MarketplaceSeedingHub() {
  useSeo({
    title: 'Marketplace Seeding Planning Prototype | FRELUX',
    description:
      'Dual-sided marketplace liquidity architecture. Density gating across 20+ countries, accredited trade association partnerships, concierge artisan dispatch, and fast-track contractor nomination.',
  });

  const [activeTierFilter, setActiveTierFilter] = useState<LiquidityTier | 'all'>('all');
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryLiquidityProfile>(LAUNCH_TERRITORIES[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Concierge Form State
  const [conciergeName, setConciergeName] = useState('');
  const [conciergeEmail, setConciergeEmail] = useState('');
  const [conciergeTrade, setConciergeTrade] = useState('Structural Concrete & Rebar');
  const [conciergeBudget, setConciergeBudget] = useState('$25,000 USD');
  const [conciergeFeedback, setConciergeFeedback] = useState<string | null>(null);

  // Nomination Form State
  const [nomArtisanName, setNomArtisanName] = useState('');
  const [nomArtisanPhone, setNomArtisanPhone] = useState('');
  const [nomArtisanTrade, setNomArtisanTrade] = useState('Master Mason / Bricklayer');
  const [nomCity, setNomCity] = useState('');
  const [nomEmail, setNomEmail] = useState('');
  const [nomFeedback, setNomFeedback] = useState<string | null>(null);

  const filteredTerritories = LAUNCH_TERRITORIES.filter((t) => {
    if (activeTierFilter !== 'all' && t.tier !== activeTierFilter) return false;
    if (searchQuery.trim() && !t.territoryName.toLowerCase().includes(searchQuery.toLowerCase()) && !t.countryName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleConciergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeName || !conciergeEmail) return;
    submitConciergeRequest({
      clientName: conciergeName,
      clientEmail: conciergeEmail,
      territoryName: selectedTerritory.territoryName,
      tradeNeeded: conciergeTrade,
      projectBudgetEstimate: conciergeBudget,
      escrowRequired: true,
    });
    setConciergeFeedback(
      `Concierge request dispatched for ${selectedTerritory.territoryName}. Trade guild coordinators have been notified.`
    );
    setConciergeName('');
    setConciergeEmail('');
  };

  const handleNominationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomArtisanName || !nomArtisanPhone || !nomEmail) return;
    nominateArtisanForEscrow({
      clientEmail: nomEmail,
      artisanName: nomArtisanName,
      artisanPhone: nomArtisanPhone,
      artisanTrade: nomArtisanTrade,
      locationCity: nomCity || selectedTerritory.territoryName,
    });
    setNomFeedback(
      `Fast-track invite sent to ${nomArtisanName}. Identity verification initiated for escrow milestone clearance.`
    );
    setNomArtisanName('');
    setNomArtisanPhone('');
    setNomEmail('');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="Marketplace Economics & Trust"
        title="Marketplace Seeding Planning Prototype"
        subtitle="Solving the two-sided cold-start liquidity gap. Illustrative territory planning and local request-form prototype. Partner coverage, response times, and marketplace liquidity are not verified or guaranteed."
        image="/assets/headers/pro.jpg"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Pro Connect', path: '/pro-connect' },
          { label: 'Marketplace Seeding' },
        ]}
      />

      <Container className="py-10 space-y-10">
        <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
          <strong>Prototype limitation:</strong> territory counts and partner labels are planning examples, not verified network data or affiliations. Submissions are stored only in this browser and are not sent to FRELUX staff, trade associations, artisans, or escrow providers. No response time or match is guaranteed.
        </div>
        {/* Architectural Overview */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 text-sm">
              <h3 className="font-semibold text-foreground text-base">
                Operational Liquidity & Density Gating Architecture
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                A dual-sided construction marketplace fails if an international developer in an emerging territory encounters an empty artisan directory or zero merchant webhooks. FRELUX enforces strict density gating: Tier 1 hubs offer instant self-serve matching; Tier 2 seeded corridors provide guaranteed 4-hour trade-association concierge matching; and Tier 3 emerging areas activate our artisan nomination protocol to onboard the client&apos;s trusted local contractor within 24 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Territory Matrix & Directory */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Launch Territories & Liquidity Matrix</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse density index, verified artisan counts, and accredited trade guild partners by territory.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeTierFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTierFilter('all')}
                className="text-xs"
              >
                All Territories
              </Button>
              <Button
                variant={activeTierFilter === 'tier_1_active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTierFilter('tier_1_active')}
                className="text-xs"
              >
                Tier 1: Active Hubs
              </Button>
              <Button
                variant={activeTierFilter === 'tier_2_seeded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTierFilter('tier_2_seeded')}
                className="text-xs"
              >
                Tier 2: Seeded Corridors
              </Button>
              <Button
                variant={activeTierFilter === 'tier_3_emerging' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTierFilter('tier_3_emerging')}
                className="text-xs"
              >
                Tier 3: Emerging
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTerritories.map((t) => {
              const isSelected = selectedTerritory.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTerritory(t)}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/70 bg-card hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {t.territoryName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.countryName}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.tier === 'tier_1_active'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : t.tier === 'tier_2_seeded'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {t.tier === 'tier_1_active' ? 'Tier 1' : t.tier === 'tier_2_seeded' ? 'Tier 2' : 'Tier 3'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] border-t border-border/50 pt-3">
                    <div>
                      <div className="text-muted-foreground">Density Index</div>
                      <div className="font-bold text-foreground mt-0.5">{t.densityScore} / 100</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Verified Artisans</div>
                      <div className="font-bold text-foreground mt-0.5">{t.verifiedArtisanCount} Masters</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-muted-foreground truncate">
                    Guild: <strong className="text-foreground">{t.partnerAcronym}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Territory Detailed Command Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{selectedTerritory.territoryName}</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {selectedTerritory.countryCode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedTerritory.description}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4 text-primary" />
                <span>{selectedTerritory.dispatchGuaranteedHours}h Illustrative Target</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Building className="w-4 h-4" />
                <span>{selectedTerritory.partnerAssociation}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Action 1: Concierge Sourcing Request */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Request On-Demand Concierge Sourcing</h4>
                  <p className="text-[11px] text-muted-foreground">
                    For developers building in areas with specific trade requirements. Illustrative response target only; no concierge dispatch service is connected.
                  </p>
                </div>
              </div>

              {conciergeFeedback ? (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
                  {conciergeFeedback}
                </div>
              ) : (
                <form onSubmit={handleConciergeSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={conciergeName}
                      onChange={(e) => setConciergeName(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Contact Email"
                      value={conciergeEmail}
                      onChange={(e) => setConciergeEmail(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={conciergeTrade}
                      onChange={(e) => setConciergeTrade(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    >
                      <option value="Structural Concrete & Rebar">Structural Concrete & Rebar</option>
                      <option value="Roof Truss & Aluminum Sheet">Roof Truss & Aluminum Sheet</option>
                      <option value="Electrical & MEP Infrastructure">Electrical & MEP Infrastructure</option>
                      <option value="Interior Screeding & Tiling">Interior Screeding & Tiling</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Budget (e.g. $25,000 USD)"
                      value={conciergeBudget}
                      onChange={(e) => setConciergeBudget(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full text-xs font-semibold gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Dispatch Guild Concierge Request
                  </Button>
                </form>
              )}
            </div>

            {/* Action 2: Nominate Trusted Family Contractor */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Nominate Family Contractor for Escrow</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Have a trusted local contractor? Fast-track their KYC and onboard them into Frelux escrow clearance within 24h.
                  </p>
                </div>
              </div>

              {nomFeedback ? (
                <div className="p-3.5 rounded-lg bg-blue-500/10 text-blue-600 text-xs font-medium border border-blue-500/20">
                  {nomFeedback}
                </div>
              ) : (
                <form onSubmit={handleNominationSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Contractor's Full Name"
                      value={nomArtisanName}
                      onChange={(e) => setNomArtisanName(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Contractor's Phone Number"
                      value={nomArtisanPhone}
                      onChange={(e) => setNomArtisanPhone(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Town / City"
                      value={nomCity}
                      onChange={(e) => setNomCity(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Your Email (for notification)"
                      value={nomEmail}
                      onChange={(e) => setNomEmail(e.target.value)}
                      className="text-xs rounded-md border border-input bg-card px-3 py-2"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" className="w-full text-xs font-semibold gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Start 24h Escrow Onboarding
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
