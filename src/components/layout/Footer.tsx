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
    <footer className="border-t border-neutral-200/80 bg-neutral-50/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Practical tools to plan paint, estimate cost, and discover the right colors for your space.
            </p>
            <a
              href={whatsappUrl('Hello FRELUX, I have a question about a paint project.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-green hover:underline"
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

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-200/80 pt-6 sm:flex-row">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-xs text-neutral-400">
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
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={link.path} className="text-sm text-neutral-500 transition-colors hover:text-brand-purple">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
