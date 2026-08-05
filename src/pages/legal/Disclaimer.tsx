import LegalLayout from '@/components/legal/LegalLayout';

export default function Disclaimer() {
  return (
    <LegalLayout
      slug="disclaimer"
      title="Disclaimer"
      updated="2026-07-26"
      intro={
        <p>
          This is draft disclaimer content for FRELUX PAINT CALC. It will be finalized before launch.
        </p>
      }
      sections={[
        {
          heading: 'General information only',
          body: (
            <p>
              All content, tools, and outputs on this site are provided for general informational and planning
              purposes only. They are not professional advice and should not be relied upon as the sole basis for
              decisions.
            </p>
          ),
        },
        {
          heading: 'Estimates are not guarantees',
          body: (
            <p>
              Paint quantities, areas, and costs produced by the tools are estimates. Actual results vary based on
              surface condition, application method, product, and local rates. Always verify with your supplier or
              contractor.
            </p>
          ),
        },
        {
          heading: 'External content',
          body: (
            <p>
              Color images and references are for inspiration. Actual paint colors vary by manufacturer, finish, and
              lighting. Always test a sample before committing to a color.
            </p>
          ),
        },
      ]}
    />
  );
}
