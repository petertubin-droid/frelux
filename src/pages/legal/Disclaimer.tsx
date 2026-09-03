import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';

export default function Disclaimer() {
  useSeo({
    title: 'Disclaimer: FRELUX PROJECT CALC',
    description: 'Disclaimer for FRELUX PROJECT CALC tools and estimates. All calculations, costs, and recommendations are for general guidance only and not professional advice.',
    canonicalPath: '/disclaimer',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="disclaimer"
      title="Disclaimer"
      updated="2026-09-03"
      intro={
        <p>
          The information and tools provided on FRELUX PROJECT CALC are intended for
          general informational and planning purposes only. By using this website,
          you acknowledge that you have read and understood this disclaimer.
        </p>
      }
      sections={[
        {
          heading: 'No professional advice',
          body: (
            <p>
              All content, tools, calculators, cost estimates, color recommendations,
              and AI-generated suggestions on this website are provided for general
              informational and planning purposes only. They are not a substitute for
              professional advice from a qualified painter, decorator, contractor,
              engineer, or other licensed professional. You should always consult with
              a qualified professional before making decisions related to your
              construction, painting, or renovation project.
            </p>
          ),
        },
        {
          heading: 'Estimates are not guarantees',
          body: (
            <p>
              Paint quantities, surface areas, material costs, and project timelines
              produced by our calculators and estimators are approximate values based
              on the inputs you provide and general industry assumptions. Actual
              results will vary depending on surface condition, application method,
              product brand and quality, local labour rates, weather conditions, and
              other factors specific to your project. Always verify quantities and
              costs with your supplier or contractor before purchasing materials or
              starting work. FRELUX PROJECT CALC does not warrant that any estimate will
              match the actual materials required or the final cost of your project.
            </p>
          ),
        },
        {
          heading: 'Pricing and product information',
          body: (
            <p>
              Product names, prices, and availability displayed on this site are
              sourced from partner data, market surveys, and user contributions. We
              strive to keep information accurate and current, but prices and product
              availability change frequently. We do not guarantee the accuracy,
              completeness, or timeliness of any pricing or product information
              displayed. Always confirm current prices and product specifications
              directly with the seller or manufacturer before making a purchase.
            </p>
          ),
        },
        {
          heading: 'Color and image accuracy',
          body: (
            <p>
              Color images, swatches, and references shown on this site are for
              inspiration and illustration only. Actual paint colors vary
              significantly depending on the manufacturer, paint finish, sheen level,
              substrate, lighting conditions, and screen display settings. We
              strongly recommend testing a physical paint sample on your wall before
              committing to a color choice. FRELUX PROJECT CALC is not responsible for
              discrepancies between displayed colors and the final painted result.
            </p>
          ),
        },
        {
          heading: 'AI-generated content',
          body: (
            <p>
              Some features on this site, including the Smart Color Assistant, AI
              Color Preview, and the live chat assistant, use artificial intelligence
              to generate recommendations and responses. AI-generated content may be
              inaccurate, incomplete, or unsuitable for your specific situation.
              Treat all AI output as a starting point for your own research and
              judgment, not as definitive advice. See our AI Disclaimer page for
              full details on the limitations of AI features.
            </p>
          ),
        },
        {
          heading: 'External links and third-party content',
          body: (
            <p>
              This website may contain links to external websites and third-party
              services that are not operated or controlled by FRELUX PROJECT CALC. We
              have no control over and assume no responsibility for the content,
              accuracy, privacy practices, or availability of any external site or
              service. The inclusion of any link does not imply endorsement.
            </p>
          ),
        },
        {
          heading: 'Marketplace and Pro Connect',
          body: (
            <p>
              Our Marketplace and Pro Connect features allow third-party sellers,
              professionals, and workers to list products and services. We do not
              directly sell products and are not a party to any transaction between
              buyers and sellers. We are not responsible for the quality, safety, or
              legality of items listed, or the conduct of any user on the platform.
              Disputes should be resolved directly between the parties involved.
            </p>
          ),
        },
        {
          heading: 'Limitation of liability',
          body: (
            <p>
              To the fullest extent permitted by applicable law, FRELUX PROJECT CALC,
              its owners, and contributors shall not be liable for any direct,
              indirect, incidental, consequential, or special damages arising from
              your use of, or reliance on, this website or its tools, including but
              not limited to incorrect estimates, project delays, over-ordering or
              under-ordering of materials, or any decisions made based on information
              provided by this site.
            </p>
          ),
        },
        {
          heading: 'Changes to this disclaimer',
          body: (
            <p>
              We reserve the right to update or modify this disclaimer at any time
              without prior notice. Changes are effective immediately upon posting on
              this page. Continued use of the website after any changes constitutes
              acceptance of the updated disclaimer.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              If you have any questions about this disclaimer, please reach us through
              our contact page or via WhatsApp. We will respond as soon as practical.
            </p>
          ),
        },
      ]}
    />
  );
}
