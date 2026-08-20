import { Link } from 'react-router-dom';
import { MessageCircle, ArrowRight, Mail, MapPin } from 'lucide-react';
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
    <footer className="relative overflow-hidden border-t border-neutral-200/60 bg-neutral-50/50 dark:border-white/5 dark:bg-brand-navy bg-noise">
      {/* Premium top gradient line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/30 to-transparent" />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 -top-24 h-48 w-[700px] -translate-x-1/2 rounded-full bg-brand-purple/6 blur-[120px]" aria-hidden="true" />

      {/* Newsletter / CTA strip */}
      <div className="relative border-b border-neutral-200/60 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-neutral-200/60 bg-white p-8 sm:flex-row dark:border-white/5 dark:bg-brand-navy-mid">
            <div>
              <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
                Start your next calculation
              </h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Free calculators for paint, screeding, POP, tiles, and finishing materials.
              </p>
            </div>
            <Link
              to="/paint-calculator"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>Start Calculating</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              Practical tools to plan paint, estimate cost, and discover the right colors for your space.
            </p>

            {/* Contact info */}
            <div className="mt-5 space-y-2.5">
              <a
                href={whatsappUrl('Hello FRELUX, I have a question about a paint project.')}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-lg bg-accent-green/10 px-3 py-2 text-sm font-semibold text-accent-green transition-all hover:bg-accent-green/15 hover:scale-105 dark:bg-accent-green/15 dark:text-accent-green-light dark:hover:bg-accent-green/25"
              >
                <MessageCircle className="h-4 w-4" />
                {siteConfig.whatsappDisplay}
              </a>
            </div>

            {/* Built for Nigeria badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200/60 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 dark:border-white/5 dark:bg-white/5 dark:text-neutral-400">
              <MapPin className="h-3 w-3 text-brand-purple" />
              Built for Nigerian construction
            </div>
          </div>

          <FooterColumn title="Calculate" links={calculateLinks} />
          <FooterColumn title="Estimate" links={estimateLinks} />
          <FooterColumn title="Colors & AI" links={[...colorLinks]} />
          <FooterColumn title="Learn & Account" links={[...learnLinks, ...accountLinks]} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
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
            <Link to={link.path} className="group inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter">
              <span className="inline-block w-0 overflow-hidden whitespace-nowrap text-[10px] opacity-0 transition-all duration-200 group-hover:w-3 group-hover:opacity-100">
                <ArrowRight className="h-3 w-3" />
              </span>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
