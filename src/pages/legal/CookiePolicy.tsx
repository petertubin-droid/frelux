import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';

export default function CookiePolicy() {
  useSeo({
    title: 'Cookie Policy — FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC uses cookies. Learn about the cookies we use and how they improve your experience.',
    canonicalPath: '/cookie-policy',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="cookie-policy"
      title="Cookie Policy"
      updated="2026-07-27"
      intro={<p>This cookie policy explains how FRELUX PAINT CALC uses cookies and similar technologies.</p>}
      sections={[
        {
          heading: 'What cookies are',
          body: (
            <p>
              Cookies are small data files stored on your device. They help sites remember preferences and understand how
              features are used.
            </p>
          ),
        },
        {
          heading: 'Essential storage',
          body: (
            <p>
              The site uses your browser's localStorage to store a random anonymous identifier for AI usage limiting. This
              is not a cookie and does not track you across other sites. It is required for the daily AI usage limit to
              function.
            </p>
          ),
        },
        {
          heading: 'Analytics cookies',
          body: (
            <p>
              When Google Analytics or Meta Pixel is configured, these tools may set cookies to collect aggregate usage
              data. These are third-party cookies controlled by their respective providers. We use this data only to
              understand how the tools are used and to improve them.
            </p>
          ),
        },
        {
          heading: 'Advertising cookies',
          body: (
            <p>
              When Google AdSense is activated (only after a real publisher ID is configured), Google may set cookies to
              serve and measure advertisements. These cookies are controlled by Google. See{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Google's Ads policy</a>{' '}
              for details.
            </p>
          ),
        },
        {
          heading: 'Managing cookies',
          body: (
            <p>
              You can control and delete cookies through your browser settings. Disabling cookies may affect some
              features. Third-party cookies (analytics, advertising) are governed by their respective providers' policies.
            </p>
          ),
        },
      ]}
    />
  );
}
