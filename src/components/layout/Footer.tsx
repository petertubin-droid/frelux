import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { siteConfig } from '@/config/site';
import { whatsappUrl } from '@/lib/analytics';

const calculateLinks = [
  { label: 'Wall Screeding Calculator', path: '/screeding-calculator' },
  { label: 'Paint Calculator', path: '/paint-calculator' },
  { label: 'POP Ceiling Calculator', path: '/pop-ceiling-calculator' },
  { label: 'Tile Calculator', path: '/tile-calculator' },
];

const estimateLinks = [
  { label: 'Screeding Cost Estimator', path: '/screeding-cost-estimator' },
  { label: 'Paint Cost Estimator', path: '/cost-estimator' },
  { label: 'POP Ceiling Cost Estimator', path: '/pop-ceiling-cost-estimator' },
  { label: 'Tile Cost Estimator', path: '/tile-cost-estimator' },
];

const colorLinks = [
  { label: 'Color Library', path: '/colors' },
  { label: 'Compare Colors', path: '/colors/compare' },
  { label: 'Smart Color Assistant', path: '/ai-color-assistant' },
];

const learnLinks = [
  { label: 'Learn Hub', path: '/learn' },
];

const accountLinks = [
  { label: 'Sign In', path: '/login' },
  { label: 'My Projects', path: '/my-projects' },
  { label: 'Contact', path: '/contact' },
  { label: 'About', path: '/about' },
];

const legalLinks = [
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Terms of Service', path: '/terms' },
  { label: 'Cookie Policy', path: '/cookie-policy' },
  { label: 'Disclaimer', path: '/disclaimer' },
  { label: 'AI Disclaimer', path: '/ai-disclaimer' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-neutral-200/60 bg-neutral-50/50 dark:border-white/5 dark:bg-brand-navy">
      {/* Subtle top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              Practical tools to plan paint, estimate cost, and discover the right colors for your space.
            </p>
            <a
              href={whatsappUrl('Hello FRELUX, I have a question about a paint project.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-green/10 px-3 py-2 text-sm font-semibold text-accent-green transition-colors hover:bg-accent-green/15 dark:bg-accent-green/15 dark:text-accent-green-light dark:hover:bg-accent-green/25"
            >
              <MessageCircle className="h-4 w-4" />
              {siteConfig.whatsappDisplay}
            </a>
          </div>

          <FooterColumn title="Calculate" links={calculateLinks} />
          <FooterColumn title="Estimate" links={estimateLinks} />
          <FooterColumn title="Colors & AI" links={[...colorLinks]} />
          <FooterColumn title="Learn & Account" links={[...learnLinks, ...accountLinks]} />

          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-neutral-200/60 pt-6 sm:flex-row dark:border-white/5">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Estimates are for guidance only and not a guarantee of final cost or quantity.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; path: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={link.path} className="text-sm text-neutral-500 transition-colors hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
