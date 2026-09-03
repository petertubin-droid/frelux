import LegalLayout from '@/components/legal/LegalLayout';
import { useSeo } from '@/lib/seo';
import { Link } from 'react-router-dom';

export default function CookiePolicy() {
  useSeo({
    title: 'Cookie Policy: FRELUX PAINT CALC',
    description: 'How FRELUX PAINT CALC uses cookies and similar technologies. Learn about the cookies we use, including advertising cookies from Google AdSense, and how to manage your preferences.',
    canonicalPath: '/cookie-policy',
    ogType: 'website',
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="cookie-policy"
      title="Cookie Policy"
      updated="2026-09-03"
      intro={<p>This cookie policy explains how FRELUX PAINT CALC uses cookies and similar technologies on our website, and how you can control them.</p>}
      sections={[
        {
          heading: 'What are cookies',
          body: (
            <p>
              Cookies are small text files stored on your device (computer, phone, or tablet) by websites you visit. They help sites remember your preferences, keep you logged in, and understand how features are used. Cookies are widely used to make online experiences more efficient and to provide information to site owners.
            </p>
          ),
        },
        {
          heading: 'Types of cookies we use',
          body: (
            <p>
              We categorize our cookies into three types:
              <br /><br />
              <strong>Essential</strong> — Required for the website to function correctly. These include your theme preference (light/dark mode) and an anonymous identifier used for AI usage limiting. These cannot be disabled as they are necessary for the service.
              <br /><br />
              <strong>Analytics</strong> — Help us understand how visitors use our tools so we can improve them. These include Google Analytics and Meta Pixel cookies, which collect aggregate, anonymized data such as page views, session duration, and event counts.
              <br /><br />
              <strong>Advertising</strong> — Used to display and measure advertisements. These include cookies set by Google AdSense and other advertising partners. See the section on advertising cookies below for full details.
            </p>
          ),
        },
        {
          heading: 'Essential storage',
          body: (
            <p>
              The site uses your browser's localStorage to store a random anonymous identifier for AI usage limiting. This is not a cookie and does not track you across other sites. It is required for the daily AI usage limit to function. Your theme preference (light/dark mode) is also stored in localStorage.
            </p>
          ),
        },
        {
          heading: 'Analytics cookies',
          body: (
            <p>
              When Google Analytics or Meta Pixel is configured, these tools may set cookies to collect aggregate usage data. These are third-party cookies controlled by their respective providers. We use this data only to understand how the tools are used and to improve them. You can manage these cookies through our cookie banner (select "Reject All" or toggle off Analytics) or through your browser settings.
            </p>
          ),
        },
        {
          heading: 'Advertising cookies (Google AdSense and partners)',
          body: (
            <p>
              When Google AdSense and other advertising partners are active, they may use cookies, device identifiers, and similar technologies to serve and measure advertisements:
              <br /><br />
              <strong>Google AdSense</strong> — Google uses the DoubleClick DART cookie and other advertising cookies to serve ads based on your visits to this site and other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on prior visits to our site and/or other sites on the Internet.
              <br /><br />
              <strong>Third-party vendors</strong> — Third-party vendors, including Google, use cookies to serve relevant ads based on a user's prior visits to this website or other websites. These vendors may use device identifiers (such as advertising ID) to serve relevant ads.
              <br /><br />
              <strong>Opting out</strong> — Users may opt out of personalized advertising by visiting:
              <br />
              • <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Google Ads Settings</a>
              <br />
              • <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Digital Advertising Alliance</a>
              <br />
              • <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">European Interactive Digital Advertising Alliance</a>
              <br /><br />
              We do not control the cookies set by advertising providers. For more details, see Google's{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-purple underline">Advertising Privacy policies</a>.
            </p>
          ),
        },
        {
          heading: 'Managing cookies',
          body: (
            <p>
              You can control and delete cookies through your browser settings. Disabling cookies may affect some features of the site. You can also manage your cookie preferences using our cookie banner — click "Cookie Preferences" in the website footer at any time to accept, reject, or customize which cookie categories you allow. Third-party cookies (analytics, advertising) are governed by their respective providers' policies.
            </p>
          ),
        },
        {
          heading: 'Changes to this policy',
          body: (
            <p>
              We may update this Cookie Policy from time to time as we add new features or partners. Material changes will be posted on this page with an updated date. See our{' '}
              <Link to="/privacy-policy" className="font-semibold text-brand-purple underline">Privacy Policy</Link>{' '}
              for full details on how we handle your data.
            </p>
          ),
        },
      ]}
    />
  );
}
