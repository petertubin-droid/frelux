import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface ProConnectCTAProps {
  calculatorType: string;
  projectContext?: Record<string, unknown>;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  painters: 'Painters',
  tilers: 'Tilers',
  'wall-screeders': 'Wall Screeders',
  'pop-installers': 'POP Installers',
  'building-contractors': 'Building Contractors',
};

const ctaTexts: Record<string, { title: string; subtitle: string }> = {
  paint: { title: 'Need a professional painter?', subtitle: 'Find verified painters in your area' },
  painting: { title: 'Need a professional painter?', subtitle: 'Find verified painters in your area' },
  tile: { title: 'Need a professional tiler?', subtitle: 'Find verified tilers in your area' },
  tiling: { title: 'Need a professional tiler?', subtitle: 'Find verified tilers in your area' },
  screeding: { title: 'Need a screeding professional?', subtitle: 'Find wall screeders in your area' },
  pop: { title: 'Need a POP installer?', subtitle: 'Find POP ceiling professionals in your area' },
  pop_ceiling: { title: 'Need a POP installer?', subtitle: 'Find POP ceiling professionals in your area' },
  finish: { title: 'Need professionals for this project?', subtitle: 'Find contractors and specialists' },
  tyrolene: { title: 'Need professionals for this project?', subtitle: 'Find contractors and specialists' },
  contractor: { title: 'Need professionals for this project?', subtitle: 'Find contractors and specialists' },
};

export default function ProConnectCTA({ calculatorType, className = '' }: ProConnectCTAProps) {
  const categorySlug = getCategorySlug(calculatorType);
  if (!categorySlug) return null;

  const text = ctaTexts[calculatorType] || ctaTexts.paint;
  const label = categoryLabels[categorySlug] || 'Professionals';

  return (
    <div className={`mt-8 rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-purple-light/5 p-6 dark:border-brand-purple-lighter/20 ${className}`}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{text.title}</h3>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{text.subtitle}</p>
      <Link
        to={`/pro-connect?category=${categorySlug}`}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple-dark"
      >
        Find {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function getCategorySlug(calculatorType: string): string | null {
  const mapping: Record<string, string> = {
    paint: 'painters',
    painting: 'painters',
    tile: 'tilers',
    tiling: 'tilers',
    screeding: 'wall-screeders',
    pop: 'pop-installers',
    pop_ceiling: 'pop-installers',
    finish: 'building-contractors',
    tyrolene: 'building-contractors',
    contractor: 'building-contractors',
  };
  return mapping[calculatorType] || null;
}
