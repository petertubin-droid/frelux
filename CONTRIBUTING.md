# Contributing to FRELUX

This is a proprietary codebase. Internal developers only.

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in Supabase credentials
4. Run `npm run dev` to start the dev server

## Development Workflow

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes — ensure no `any` types, no `TODO`/`FIXME` stubs
3. Write tests for any new logic in `src/lib/`
4. Run all checks before committing:
   ```bash
   npm run typecheck
   npm run test
   npm run build
   ```
5. Push and open a Pull Request

## Globalization standard (mandatory)

FRELUX is a global product. Every new feature and every upgrade must meet the
globalization standard before it merges: market currency through the display
layer (no hardcoded `₦`/`NGN`/`en-NG`), market units, translatable copy, the
market dimension on stored and priced data, no region-locked assumptions, and
honest statements when a market's data is missing. Exports (PDF, receipts, CSV)
follow the same rules. The full checklist lives in
[docs/GLOBALIZATION-STANDARD.md](docs/GLOBALIZATION-STANDARD.md).

## Code Standards

- **TypeScript**: Strict mode, zero `any` casts. Use proper type augmentation when needed.
- **Tests**: All new business logic in `src/lib/` must have corresponding `.test.ts` files.
- **No TODOs**: Stubs and TODOs are not allowed in production code. Implement the real solution.
- **Formatting**: Prettier with default config. ESLint must pass with zero warnings.
- **Commits**: Use conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`)

## CI/CD

GitHub Actions runs on every push and PR:

- TypeScript type check
- Full test suite (Vitest)
- Production build
- Lighthouse audit (performance, accessibility, SEO)

All four must pass before merge to `main`.

## Project Structure

```
src/
├── lib/              # Core logic, engines, utilities
│   ├── engineering/  # Structural & foundation calculators
│   ├── estimation/   # Material estimation engines
│   ├── measurement/   # Measurement & takeoff engines
│   └── __tests__/    # Test files
├── pages/            # Route-level page components
├── components/       # Reusable UI components
├── types/            # TypeScript type definitions
└── lib/supabase.ts   # Supabase client
```

## Questions

Contact the project maintainer.
