import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';

export default function PrivacyPolicy() {
  useSeo({
    title: 'Privacy Policy — FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC handles your information when you use our website and tools. Read our privacy policy for details on data collection and usage.',
    canonicalPath: '/privacy-policy',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="privacy-policy"
      title="Privacy Policy"
      updated="2026-07-27"
      intro={<p>This privacy policy describes how FRELUX PAINT CALC handles your information when you use our website and tools.</p>}
      sections={[
        {
          heading: 'Information we collect',
          body: (
            <p>
              The public tools (Paint Calculator, Cost Estimator, Color Gallery) run in your browser and do not require an
              account. When you use the Smart Color Assistant, your text description or uploaded image is sent to our secure
              backend and then to a third-party AI provider (Google AI) to generate your recommendation. We do not store
              your uploaded images or full descriptions long-term. If you submit the contact form, the information you
              provide is used solely to respond to your inquiry.
            </p>
          ),
        },
        {
          heading: 'Analytics',
          body: (
            <p>
              We log anonymous analytics events (such as "calculator started" or "AI recommendation generated") to
              understand how the tools are used. These events do not include your full AI descriptions, uploaded images,
              or personal information. We may use Google Analytics and Meta Pixel when configured, these tools collect
              aggregate usage data through their own cookies. No private AI API keys are ever exposed to the browser.
            </p>
          ),
        },
        {
          heading: 'AI usage tracking',
          body: (
            <p>
              To enforce the shared daily AI usage limit, we store an anonymous random identifier in your browser's
              localStorage and a count of successful AI generations per day. This identifier is a random token, it is not
              linked to your name, email, or identity. Failed AI requests do not consume your daily allowance.
            </p>
          ),
        },
        {
          heading: 'Advertising',
          body: (
            <p>
              The site is prepared to display advertisements through Google AdSense. Advertising is only activated when a
              real publisher ID is configured by an administrator. When advertising is active, Google may use cookies to
              serve relevant ads. We do not control the cookies set by advertising providers, see our Cookie Policy for
              how to manage them.
            </p>
          ),
        },
        {
          heading: 'How we use information',
          body: (
            <p>
              Information you provide is used to respond to inquiries, enforce usage limits, and improve the tools and
              content. We do not sell personal information.
            </p>
          ),
        },
        {
          heading: 'Contact',
          body: (
            <p>
              Questions about privacy can be sent through the contact page or via WhatsApp. We will respond as soon as
              practical.
            </p>
          ),
        },
      ]}
    />
  );
}
