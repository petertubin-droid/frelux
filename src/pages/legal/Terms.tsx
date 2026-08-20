import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';

export default function Terms() {
  useSeo({
    title: 'Terms of Service — FRELUX PAINT CALC',
    description: 'Terms of service for using FRELUX PAINT CALC tools and website. Read our terms for usage guidelines and limitations.',
    canonicalPath: '/terms',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="terms"
      title="Terms of Service"
      updated="2026-07-26"
      intro={
        <p>
          These are draft terms for FRELUX PAINT CALC. They will be finalized before launch and do not yet represent
          a binding agreement.
        </p>
      }
      sections={[
        {
          heading: 'Use of the tools',
          body: (
            <p>
              The paint calculator, cost estimator, and color tools are provided to help you plan projects. You are
              responsible for verifying measurements, prices, and product suitability before making purchases or
              starting work.
            </p>
          ),
        },
        {
          heading: 'Estimates are guidance only',
          body: (
            <p>
              All quantities, areas, and costs produced by the tools are estimates. Actual results vary based on
              surface condition, application method, product, and local rates. The estimates are not a guarantee of
              final cost or quantity.
            </p>
          ),
        },
        {
          heading: 'Acceptable use',
          body: (
            <p>
              You agree not to misuse the site, attempt to disrupt it, or use it for unlawful purposes. Automated
              access that harms the service is not permitted.
            </p>
          ),
        },
        {
          heading: 'Changes',
          body: (
            <p>
              We may update these terms and the tools over time. Final change-management and notice details will be
              added before launch.
            </p>
          ),
        },
      ]}
    />
  );
}
