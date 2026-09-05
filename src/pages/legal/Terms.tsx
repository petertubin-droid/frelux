import LegalLayout from "@/components/legal/LegalLayout";
import { useSeo } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export default function Terms() {
  useSeo({
    title: "Terms of Service: FRELUX PROJECT CALC",
    description:
      "Terms of service for using FRELUX PROJECT CALC tools and website. Read our terms for usage guidelines and limitations.",
    canonicalPath: "/terms",
    ogType: "website",
    noIndex: false,
  });

  return (
    <LegalLayout
      slug="terms"
      title="Terms of Service"
      updated="2026-09-05"
      intro={
        <p>
          By accessing or using FRELUX PROJECT CALC (the "Service"), you agree to
          be bound by these Terms of Service. If you do not agree to these
          terms, please discontinue use of the Service.
        </p>
      }
      sections={[
        {
          heading: "Use of the tools",
          body: (
            <p>
              The paint calculator, cost estimator, color tools, and other
              features on this website are provided to help you plan
              construction and finishing projects. You are responsible for
              verifying all measurements, prices, and product suitability before
              making purchases or starting work. The Service is available to
              users in Nigeria and internationally, but pricing and product data
              are calibrated for the Nigerian market.
            </p>
          ),
        },
        {
          heading: "Estimates are guidance only",
          body: (
            <p>
              All quantities, areas, and costs produced by the tools are
              estimates. Actual results vary based on surface condition,
              application method, product, and local rates. The estimates are
              not a guarantee of final cost or quantity. FRELUX PROJECT CALC does
              not warrant that any estimate will match the actual materials
              required or the final cost of your project.
            </p>
          ),
        },
        {
          heading: "Accounts",
          body: (
            <p>
              Some features require an account. You are responsible for
              maintaining the security of your account credentials and for all
              activity under your account. You must provide accurate information
              when registering. We reserve the right to suspend or terminate
              accounts that violate these terms or applicable law.
            </p>
          ),
        },
        {
          heading: "Pro Connect and Worker Channels",
          body: (
            <p>
              Pro Connect and Worker Channels allow professionals and workers to
              communicate, share price updates, and connect with clients.
              Messages are subject to automated AI moderation. You agree not to
              post fraudulent, offensive, spam, off-platform solicitation, or
              illegal content. We reserve the right to remove messages, restrict
              access, or ban users who violate these rules. Content posted in
              these channels reflects the views of the sender, not FRELUX PROJECT
              CALC.
            </p>
          ),
        },
        {
          heading: "AI features",
          body: (
            <p>
              The Service includes AI-powered features such as the Smart Color
              Assistant, AI Color Preview, and the live chat assistant.
              AI-generated recommendations are suggestions for inspiration only
              and are not professional advice. See our AI Disclaimer page for
              full details on AI feature limitations.
            </p>
          ),
        },
        {
          heading: "Credits, tokens, and purchases",
          body: (
            <p>
              FRELUX Credits (including tokens you purchase) are a virtual
              currency for using premium features on the Service. They hold no
              cash value, cannot be transferred to other users, and are not
              refundable once used. Purchases are processed by Paystack; the
              price and token amount for each pack are shown before you pay.
              Rewarded ads are optional — you can earn credits by watching ads,
              purchase tokens directly, or use the free tools. We may adjust
              pricing for future purchases at any time; changes never affect
              tokens already credited to your balance.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              You agree not to misuse the Service, attempt to disrupt it,
              reverse-engineer its code, or use it for unlawful purposes.
              Automated access that harms the Service, including scraping at a
              rate that degrades performance, is not permitted. You may not use
              the Service to distribute malware, phishing content, or any
              material that violates Nigerian law or the laws of your
              jurisdiction.
            </p>
          ),
        },
        {
          heading: "Intellectual property",
          body: (
            <p>
              The FRELUX PROJECT CALC name, logo, design, calculator methodology,
              and website content are owned by FRELUX PROJECT CALC. You may not
              copy, modify, or redistribute our content without permission.
              Calculator templates and estimates you create remain your
              intellectual property.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              FRELUX PROJECT CALC is provided "as is" without warranties of any
              kind, express or implied. To the maximum extent permitted by law,
              FRELUX PROJECT CALC shall not be liable for any damages arising from
              the use of, or inability to use, the Service, including but not
              limited to direct, indirect, incidental, or consequential damages.
            </p>
          ),
        },
        {
          heading: "Privacy",
          body: (
            <p>
              We handle your data in accordance with our Privacy Policy. By
              using the Service, you consent to the data practices described
              therein.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these Terms of Service from time to time. Material
              changes will be posted on this page with an updated date.
              Continued use of the Service after changes constitutes acceptance
              of the revised terms.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about these terms? Contact us at {siteConfig.email} or
              via the Contact page.
            </p>
          ),
        },
      ]}
    />
  );
}
