/**
 * FRELUX Enterprise Cross-Border Financial Escrow System (Diaspora Infrastructure)
 *
 * Facilitates diaspora funding loops (US/UK/CA/EU -> Emerging Markets / Home Country builds).
 * Handles:
 * - Milestone-based escrow locking & staged capital release
 * - Multi-currency deposit & local payout FX conversion
 * - Forensic inspection & verification photo requirement validation
 * - Digital site clearance approval workflows
 * - Anti-fraud, chargeback mitigation & dispute resolution holdbacks
 */

import { formatByCode } from '@/lib/international/currency-format';

export type EscrowMilestoneStatus = 
  | 'funded_locked' 
  | 'in_progress' 
  | 'pending_client_approval' 
  | 'released' 
  | 'disputed';

export interface EscrowMilestone {
  id: string;
  phaseName: string;
  description: string;
  fundedAmount: number; // In source currency (USD/GBP/EUR/CAD)
  localPayoutAmount: number; // In local currency (e.g. NGN/KES/GHS/INR)
  sourceCurrency: string;
  localCurrency: string;
  fxRateLocked: number;
  status: EscrowMilestoneStatus;
  verificationPhotos: Array<{
    id: string;
    url: string;
    caption: string;
    uploadedAt: string;
    verifiedByForeman: boolean;
  }>;
  foremanNotes?: string;
  completionDateEstimated: string;
  releasedAt?: string;
}

export interface EscrowContract {
  id: string;
  contractTitle: string;
  diasporaClientName: string;
  diasporaClientLocation: string; // e.g. 'Houston, TX (USA)'
  localContractorName: string;
  localContractorCountry: string; // e.g. 'NG'
  totalFundedSource: number;
  sourceCurrency: string;
  totalLocalPayout: number;
  localCurrency: string;
  escrowFeePercent: number; // Standard 1.5% - 2.5% platform custody fee
  escrowFeeAmount: number;
  milestones: EscrowMilestone[];
  createdAt: string;
}

export const DEMO_ESCROW_CONTRACT: EscrowContract = {
  id: 'ESC-2026-DIASPORA-049',
  contractTitle: '4-Bedroom Contemporary Duplex — Phase 1 & 2 Execution',
  diasporaClientName: 'Engr. Adeola Balogun',
  diasporaClientLocation: 'London, United Kingdom (GB)',
  localContractorName: 'Apex Prime Structural Ltd (Lead Engr: Babatunde F.)',
  localContractorCountry: 'NG',
  totalFundedSource: 35000,
  sourceCurrency: 'GBP',
  totalLocalPayout: 71750000,
  localCurrency: 'NGN',
  escrowFeePercent: 1.8,
  escrowFeeAmount: 630,
  createdAt: '2026-10-01T08:30:00Z',
  milestones: [
    {
      id: 'MS-01',
      phaseName: 'Substructure & Foundation Raft Casting',
      description: 'Excavation to hard pan, blinding, dual-layer 16mm rebar cage, and C30 ready-mix concrete pouring.',
      fundedAmount: 15000,
      localPayoutAmount: 30750000,
      sourceCurrency: 'GBP',
      localCurrency: 'NGN',
      fxRateLocked: 2050,
      status: 'released',
      releasedAt: '2026-10-10T14:15:00Z',
      completionDateEstimated: '2026-10-08',
      foremanNotes: 'All soil test benchmarks cleared. 42 tonnes of granite & 380 bags of Dangote 42.5R consumed.',
      verificationPhotos: [
        {
          id: 'P-01',
          url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=800&q=80',
          caption: 'Trench depth laser verification & ground beam rebar binding.',
          uploadedAt: '2026-10-06T16:20:00Z',
          verifiedByForeman: true,
        },
        {
          id: 'P-02',
          url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
          caption: 'Ready-mix batch slump test clearance prior to pouring.',
          uploadedAt: '2026-10-07T11:00:00Z',
          verifiedByForeman: true,
        }
      ]
    },
    {
      id: 'MS-02',
      phaseName: 'Ground Floor Columns, Decking & Beam Framework',
      description: 'Vibrated hollow block masonry to lintel level, suspended slab formwork, electrical conduit installation and deck casting.',
      fundedAmount: 12000,
      localPayoutAmount: 24600000,
      sourceCurrency: 'GBP',
      localCurrency: 'NGN',
      fxRateLocked: 2050,
      status: 'pending_client_approval',
      completionDateEstimated: '2026-10-18',
      foremanNotes: 'Deck reinforcement completely tied with 12mm & 16mm TMT high-yield bars. Ready for client inspection & milestone release.',
      verificationPhotos: [
        {
          id: 'P-03',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
          caption: 'Ground floor slab propping and conduit piping run checks.',
          uploadedAt: '2026-10-14T17:40:00Z',
          verifiedByForeman: true,
        }
      ]
    },
    {
      id: 'MS-03',
      phaseName: 'First Floor Superstructure & Roof Level Trusses',
      description: 'First floor perimeter blockwork, hardwood roof carcass, 0.55mm aluminium standing seam roofing sheets.',
      fundedAmount: 8000,
      localPayoutAmount: 16400000,
      sourceCurrency: 'GBP',
      localCurrency: 'NGN',
      fxRateLocked: 2050,
      status: 'funded_locked',
      completionDateEstimated: '2026-11-05',
      verificationPhotos: []
    }
  ]
};

export function calculateEscrowSummary(contract: EscrowContract) {
  const totalFunded = contract.milestones.reduce((acc, m) => acc + m.fundedAmount, 0);
  const releasedFunded = contract.milestones
    .filter(m => m.status === 'released')
    .reduce((acc, m) => acc + m.fundedAmount, 0);
  const lockedFunded = totalFunded - releasedFunded;

  const totalPayout = contract.milestones.reduce((acc, m) => acc + m.localPayoutAmount, 0);
  const releasedPayout = contract.milestones
    .filter(m => m.status === 'released')
    .reduce((acc, m) => acc + m.localPayoutAmount, 0);
  const pendingPayout = totalPayout - releasedPayout;

  return {
    totalFunded,
    releasedFunded,
    lockedFunded,
    totalPayout,
    releasedPayout,
    pendingPayout,
    completionPercentage: totalFunded > 0 ? Math.round((releasedFunded / totalFunded) * 100) : 0
  };
}
