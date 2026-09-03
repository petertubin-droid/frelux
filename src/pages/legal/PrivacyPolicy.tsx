import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  useSeo({
    title: 'Privacy Policy: FRELUX PROJECT CALC',
    description: 'How FRELUX PROJECT CALC handles your information when you use our website and tools. Read our privacy policy for details on data collection, usage, advertising, and your rights.',
    canonicalPath: '/privacy-policy',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="privacy-policy"
      title="Privacy Policy"
      updated="2026-09-03"
      intro={<p>This privacy policy describes how FRELUX PROJECT CALC collects, uses, and protects your information when you visit our website and use our tools.</p>}
      sections={[
        {
          heading: 'Information we collect',
          body: (
            <p>
              The public tools (Paint Calculator, Cost Estimator, Color Gallery, Tile Calculator, Screeding Calculator, POP Ceiling Calculator) run in your browser and do not require an account. When you use the Smart Color Assistant, your text description or uploaded image is sent to our secure backend and then to a third-party AI provider (Google AI) to generate your recommendation. We do not store your uploaded images or full descriptions long-term. If you create an account, we store your name, email, and project data. If you submit the contact form, the information you provide is used solely to respond to your inquiry.
            </p>
          ),
        },
        {
          heading: 'How we use your information',
          body: (
            <p>
              Information you provide is used to: respond to your inquiries; enforce daily AI usage limits; provide and improve our tools, calculators, and content; send service-related notifications when you have an account; and analyze aggregate usage patterns to improve user experience. We do not sell personal information to third parties.
            </p>
          ),
        },
        {
          heading: 'Cookies and local storage',
          body: (
            <p>
              Our website uses cookies and browser storage for several purposes:
              <br /><br />
              <strong>Essential cookies</strong> — These are necessary for the website to function. They include storing your theme preference (light/dark mode) and a random anonymous identifier in your browser's localStorage to enforce the shared daily AI usage limit. This identifier is a random token — it is not linked to your name, email, or identity.
              <br /><br />
              <strong>Analytics cookies</strong> — When Google Analytics or Meta Pixel is configured, these tools may set cookies to collect aggregate usage data such as page views, time on site, and event counts. These are third-party cookies controlled by their respective providers. We use this data only to understand how the tools are used and to improve them.
              <br /><br />
              <strong>Advertising cookies</strong> — See the Advertising section below for details.
              <br /><br />
              You can control and delete cookies through your browser settings. Disabling cookies may affect some features. See our{' '}
              <Link to="/cookie-policy" className="font-semibold text-brand-purple underline">Cookie Policy</Link>{' '}
              for more information.
            </p>
          ),
        },
        {
          heading: 'Advertising and Google AdSense',
          body: (
            <p>
              This website displays advertisements through Google AdSense and other advertising partners. When advertising is active, Google and its partner companies may use cookies, device identifiers, and similar technologies to serve ads based on your prior visits to this and other websites.
              <br /><br />
              <strong>Google AdSense cookies:</strong> Google uses the DoubleClick DART cookie and other advertising cookies to serve ads to users based on their visit to this site and other sites on the Internet. Users may opt out of personalized advertising by visiting{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Google Ads Settings</a>.
              <br /><br />
              <strong>Third-party vendors:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet.
              <br /><br />
              <strong>Device identifiers:</strong> Google and its partners may use device identifiers (such as advertising ID) and other information from your device to serve relevant ads.
              <br /><br />
              <strong>Opt-out options:</strong> You can opt out of personalized advertising by visiting:
              <br />
              • <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Google Ads Settings</a>
              <br />
              • <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Digital Advertising Alliance opt-out</a>
              <br />
              • <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">European Interactive Digital Advertising Alliance</a>
              <br /><br />
              We do not control the cookies set by advertising providers. See our{' '}
              <Link to="/cookie-policy" className="font-semibold text-brand-purple underline">Cookie Policy</Link>{' '}
              for how to manage advertising cookies.
            </p>
          ),
        },
        {
          heading: 'AI usage tracking',
          body: (
            <p>
              To enforce the shared daily AI usage limit, we store an anonymous random identifier in your browser's localStorage and a count of successful AI generations per day. This identifier is a random token — it is not linked to your name, email, or identity. Failed AI requests do not consume your daily allowance.
            </p>
          ),
        },
        {
          heading: 'Data sharing',
          body: (
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share non-personal, aggregated information with partners for analytics and improvement purposes. We may disclose information when required by law or to protect our rights and safety. When you use AI-powered features, your text description or image is sent to Google AI for processing — Google's privacy practices are governed by their own privacy policy.
            </p>
          ),
        },
        {
          heading: 'Data security',
          body: (
            <p>
              We take reasonable measures to protect your information using industry-standard security practices. User authentication is handled through Supabase Auth, which provides secure password hashing and session management. AI API keys are stored server-side and are never exposed to the browser. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          ),
        },
        {
          heading: "Children's privacy",
          body: (
            <p>
              Our website and services are not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can take appropriate action.
            </p>
          ),
        },
        {
          heading: 'Your rights',
          body: (
            <p>
              If you have an account, you can request access to, correction of, or deletion of your personal data. You can withdraw cookie consent at any time using the "Cookie Preferences" link in the footer. You can also adjust your advertising preferences using the opt-out links provided in the Advertising section above.
            </p>
          ),
        },
        {
          heading: 'Changes to this policy',
          body: (
            <p>
              We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated date. Continued use of the Service after changes constitutes acceptance of the revised policy.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about this privacy policy can be sent through our contact page or via WhatsApp. We will respond as soon as practical.
            </p>
          ),
        },
      ]}
    />
  );
}
