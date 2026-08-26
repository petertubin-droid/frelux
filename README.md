# FRELUX — Construction Cost Estimation Platform

A production-grade construction estimation platform built for the Nigerian and African market. Calculate material costs for paint, tiles, screeding, pop ceiling, roofing, and more — with AI-powered recommendations, marketplace integration, and multi-currency support.

## Features

### Calculators & Estimators

- **Paint Calculator** — Wall area, coats, paint type selection, cost estimation
- **Tile Calculator** — Floor & wall tiles with waste factor, adhesive, and grout
- **Screeding Calculator** — Wall surface area with door/window deductions
- **POP Ceiling Calculator** — Ceiling area with material breakdown
- **Roofing Estimator** — Building-to-roof pipeline with multi-building support
- **Tyrolene Estimator** — Exterior finishing estimation
- **Painting Estimator** — Full project estimation with labour costs
- **Image Estimator** — AI-powered area detection from photos
- **Construction Sequence** — Project phasing and timeline
- **Project Timeline** — Gantt-style project scheduling

### Platform

- **Marketplace** — Buy/sell construction materials with seller dashboards
- **Pro Connect** — Connect with contractors and professionals
- **AI Studio** — Color recommendations, AI learning assistant, AI monetization
- **Market Intelligence** — Automated price crawling and validation
- **Learn Hub** — Educational content for construction professionals
- **Credits System** — Premium feature access with Paystack integration
- **International Support** — Multi-currency, multi-country pricing rules

### Admin

- 49 admin pages covering analytics, branding, SEO, pricing, materials, users, ads, integrations, and more
- Full RBAC with admin-only routes
- Real-time error monitoring and health dashboards

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments:** Paystack
- **AI:** OpenAI integration for color recommendations and learning assistant
- **Testing:** Vitest (1,293 tests)
- **PWA:** Service worker, manifest, offline support
- **SEO:** Prerendered routes (76), structured data, sitemap generation

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/petertubin-droid/frelux.git
cd frelux
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev    # Start dev server at localhost:5173
```

### Build

```bash
npm run build  # Production build to dist/
npm run preview  # Preview the production build locally
```

### Testing

```bash
npx vitest run       # Run all 1,293 tests
npx vitest watch     # Watch mode
npx vitest coverage  # Coverage report
```

### Type Checking

```bash
npx tsc --noEmit -p tsconfig.app.json
```

## Project Structure

```
src/
├── components/        # 121 reusable UI components
│   ├── calculators/   # Calculator-specific UI (badges, result cards, FAQs)
│   ├── engine/        # Shared estimation engine UI (confidence, explanation)
│   ├── layout/        # Navigation, footer, routing
│   ├── credits/       # Credits wallet and payment UI
│   └── ui/            # Generic UI primitives (buttons, inputs, dialogs)
├── pages/             # 138 routes
│   ├── admin/         # 49 admin panel pages
│   ├── marketplace/   # Marketplace listing and seller dashboard
│   ├── pro-connect/   # Contractor network
│   ├── learn/         # Educational content
│   └── studio/        # AI studio and error analysis
├── lib/               # 222 modules
│   ├── measurement/   # Core estimation engine (paint, tile, screeding, roofing)
│   ├── market-intelligence/  # Price crawling and validation
│   ├── international/ # Multi-country config and pricing rules
│   ├── estimation/    # Build-to-roof pipeline and project engine
│   └── engine-integration/  # Engine bridge to frontend
└── types/             # Shared TypeScript types
```

## CI/CD

GitHub Actions runs on every push and PR:

1. **Type check** — `tsc --noEmit`
2. **Unit tests** — All 1,293 tests must pass
3. **Build** — Production build must succeed
4. **Lighthouse audit** — Performance, accessibility, best practices, and SEO thresholds

## Security

- Content-Security-Policy with strict defaults
- Row-level security via Supabase
- Admin-only route protection with RBAC
- Error monitoring with PII redaction
- HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff

## License

Proprietary — All rights reserved.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, code standards, and CI/CD requirements.

## API Documentation

See [docs/API.md](./docs/API.md) for Supabase backend API documentation, table schemas, query patterns, and Edge Function reference.

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability reporting process.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a history of notable changes.

## License

Proprietary — All rights reserved. See [LICENSE](./LICENSE) for details.
