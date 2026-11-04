// Static bodies for the legal, company and account pages.
//
// These pages render their real text from React components (LegalLayout and the
// account screens), so the served HTML carried a one-sentence summary and
// nothing else: 13 pages sat between 119 and 189 words. A visitor on a slow
// connection, a crawler, or anyone reading before JavaScript boots saw a stub.
//
// Everything below stays within what the components and the application
// actually do:
//   - section lists are the real headings from src/pages/legal/*.tsx;
//   - the policy details quoted here are the ones the components state
//     (Paystack as payment processor, location only on an explicit tap, a
//     30-day answer to data requests, no sale of personal information);
//   - no contact address, response time or contractual promise is invented.
//
// The full text remains on the page once React hydrates; these bodies are the
// summary and the table of contents, not a replacement.

const list = (items) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

const footerNav = (links) =>
  `<p>${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join(" &middot; ")}</p>`;

export const legalPageContent = {
  "/privacy-policy":
    `<h1>Privacy Policy</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Privacy Policy</nav>` +
    `<p>This policy describes how FRELUX collects, uses and protects your information when you visit the site and use the calculators. It was last updated on 31 October 2026.</p>` +
    `<h2>What the policy covers</h2>` +
    list([
      "<strong>Information we collect</strong>: what you give us directly, and what the site records as you use it",
      "<strong>Signing in with Google</strong>: which account details are read, and how to disconnect the account",
      "<strong>Location data</strong>: only read when you explicitly tap to share it, used to choose your market",
      "<strong>How we use your information</strong>: running the tools, keeping your projects, and improving them",
      "<strong>Cookies and local storage</strong>: the three consent categories, and what stays off until you accept",
      "<strong>Advertising and Google AdSense</strong>: how ad cookies work and how to opt out of them",
      "<strong>AI usage tracking</strong>: anonymous events recorded for AI-assisted features",
      "<strong>Data sharing, payments and security</strong>: who processes what, and how it is protected",
      "<strong>Your rights</strong>, including the GDPR section for EU and EEA visitors and the CCPA/CPRA section for California visitors",
    ]) +
    `<h2>Points worth knowing before you start</h2>` +
    `<p>Subscriptions and token purchases are processed by Paystack, our payment provider. Your email address and order details are shared with Paystack to take the payment and issue a receipt; card details never reach FRELUX.</p>` +
    `<p>You can withdraw cookie consent at any time from the cookie preferences control in the footer, and analytics and advertising stop on the next page load. A formal access, correction, deletion or portability request can be submitted on the <a href="/data-request">data subject request page</a>, and is answered within 30 days. We do not sell personal information for money.</p>` +
    footerNav([
      ["Terms of Service", "/terms"],
      ["Cookie policy", "/cookie-policy"],
      ["Data request", "/data-request"],
      ["Contact", "/contact"],
    ]),

  "/terms":
    `<h1>Terms of Service</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Terms of Service</nav>` +
    `<p>These terms govern your use of the FRELUX tools and website. They were last updated on 5 September 2026.</p>` +
    `<h2>What the terms cover</h2>` +
    list([
      "<strong>Use of the tools</strong>: what you may do with the calculators and the estimates they produce",
      "<strong>Estimates are guidance only</strong>: why a quantity is not a quotation or a guarantee",
      "<strong>Accounts</strong>: the responsibilities attached to signing in",
      "<strong>Pro Connect and Worker Channels</strong>: the rules for the professional and worker features",
      "<strong>AI features</strong>: what the AI does, and what it is not allowed to decide",
      "<strong>Credits, tokens and purchases</strong>: how paid access and purchases work",
      "<strong>Acceptable use, intellectual property and limitation of liability</strong>",
      "<strong>Privacy, changes and contact</strong>",
    ]) +
    `<h2>The part that matters most</h2>` +
    `<p>Every figure the calculators return is an estimate built from the measurements you enter and the price book of the market you select. It is not a contract price, and it does not replace a site survey, a structural assessment or a quote from a qualified contractor. Prices change, wastage varies with the site, and labour rates differ by team.</p>` +
    `<p>Calculations are performed by the deterministic engine for each discipline. AI features read and organise information; they do not perform the arithmetic that produces a quantity.</p>` +
    footerNav([
      ["Privacy Policy", "/privacy-policy"],
      ["Disclaimer", "/disclaimer"],
      ["AI Disclaimer", "/ai-disclaimer"],
      ["Contact", "/contact"],
    ]),

  "/disclaimer":
    `<h1>Disclaimer</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Disclaimer</nav>` +
    `<p>FRELUX produces planning estimates. This page sets out the limits of those estimates. It was last updated on 3 September 2026.</p>` +
    `<h2>What this disclaimer covers</h2>` +
    list([
      "<strong>No professional advice</strong>: the tools do not replace an architect, engineer, quantity surveyor or contractor",
      "<strong>Estimates are not guarantees</strong>: quantities assume the measurements you enter are correct",
      "<strong>Pricing and product information</strong>: market prices are observations, not offers",
      "<strong>Colour and image accuracy</strong>: screens, lighting and textures change how a colour reads",
      "<strong>AI-generated content</strong>: suggestions are checked by you, not by us",
      "<strong>External links, the marketplace and Pro Connect</strong>: third-party content and third-party work",
      "<strong>Limitation of liability, changes and contact</strong>",
    ]) +
    `<h2>How to use an estimate responsibly</h2>` +
    `<p>Measure the real space before you price it, and treat the output as a starting quantity to check rather than a final order. Add your own contingency for breakage, access and site conditions, and confirm the material specification with the supplier. Where a market has no verified price book, the tools say so instead of borrowing another country's prices.</p>` +
    footerNav([
      ["Terms of Service", "/terms"],
      ["AI Disclaimer", "/ai-disclaimer"],
      ["Privacy Policy", "/privacy-policy"],
    ]),

  "/ai-disclaimer":
    `<h1>AI Disclaimer</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; AI Disclaimer</nav>` +
    `<p>This disclaimer covers the AI-assisted features in FRELUX, such as the smart colour assistant. It was last updated on 27 July 2026.</p>` +
    `<h2>What this disclaimer covers</h2>` +
    list([
      "<strong>Not professional advice</strong>: AI suggestions are inspiration, not interior design, structural, electrical or safety advice",
      "<strong>Accuracy and suitability</strong>: a suggestion can be incomplete or wrong for your space",
      "<strong>How your data is used</strong>: your description and any uploaded image are sent to a third-party AI provider to produce the recommendation",
      "<strong>Your responsibility</strong>: verify a colour on a physical sample before committing to paint",
    ]) +
    `<h2>Where the boundary sits</h2>` +
    `<p>AI reads and organises information. It does not calculate quantities: every material figure, bucket count, tile box and labour hour comes from the deterministic engine for that discipline, using the measurements and the market price book. An AI suggestion can therefore change what you choose, but not the arithmetic behind a price.</p>` +
    `<p>Image data is used only to produce the recommendation and is not stored long term. The analytics record anonymous events, not your full description or image. Colour also changes with lighting, surface texture, screen calibration and surrounding decor, so a wall patch in daylight is the only reliable test.</p>` +
    footerNav([
      ["Disclaimer", "/disclaimer"],
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy-policy"],
    ]),

  "/data-request":
    `<h1>Data subject request</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Data subject request</nav>` +
    `<p>Use this page to make a formal request about the personal data FRELUX holds about you. It is answered within 30 days.</p>` +
    `<h2>Requests you can submit</h2>` +
    list([
      "<strong>Access</strong>: receive a copy of your personal data",
      "<strong>Deletion</strong>: have your personal data deleted",
      "<strong>Correction</strong>: fix personal data that is inaccurate",
      "<strong>Portability</strong>: export your data in a machine-readable format",
      "<strong>Advertising opt-out</strong>: opt out of advertising-related sharing if you are in California",
    ]) +
    `<h2>Before you submit</h2>` +
    `<p>Sign in first, so the request can be matched to the right account without asking you for identifying documents. The request records what you asked for and when; you do not need to send messages separately.</p>` +
    `<p>Some records have to be kept after a deletion request: completed purchases and their receipts stay with the payment provider for accounting, and security logs are retained for their stated period. Everything else tied to the account is removed. Details of what is held, and for how long, are in the <a href="/privacy-policy">privacy policy</a>.</p>` +
    footerNav([
      ["Privacy Policy", "/privacy-policy"],
      ["Cookie policy", "/cookie-policy"],
      ["Contact", "/contact"],
    ]),

  "/contact":
    `<h1>Contact FRELUX</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Contact</nav>` +
    `<p>Send the team a message using the form on this page. Every field is validated before a message is accepted, so nothing is lost to a silent failure.</p>` +
    `<h2>What the form asks for</h2>` +
    list([
      "<strong>Your name</strong>, so a reply can be addressed to a person",
      "<strong>Email</strong>, the address the reply goes to",
      "<strong>Subject</strong>, what the message is about",
      "<strong>Message</strong>, with room to describe the project or the problem",
    ]) +
    `<h2>Getting a faster answer</h2>` +
    `<p>If the message is about a calculation, include the calculator, the market, and the measurements you entered. That is usually enough to reproduce the result exactly, because the engine is deterministic: the same inputs and the same price book produce the same output.</p>` +
    `<p>For a problem with a specific page, the page address saves a round trip. For anything about data held on your account, use the <a href="/data-request">data subject request page</a> instead, which records the request formally and starts the 30-day clock. General feedback about the tools can also go through the <a href="/feedback">feedback form</a>.</p>` +
    footerNav([
      ["Feedback", "/feedback"],
      ["Partners", "/partners"],
      ["Privacy Policy", "/privacy-policy"],
      ["Data request", "/data-request"],
    ]),

  "/feedback":
    `<h1>Feedback</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Feedback</nav>` +
    `<p>Tell the team what is working and what is not. The form takes a category and a message, and the category routes the report to the right place.</p>` +
    `<h2>Categories</h2>` +
    list([
      "<strong>General feedback</strong>: impressions of the tools as a whole",
      "<strong>Suggest a development</strong>: a calculator, material or market that is missing",
      "<strong>Report a problem</strong>: something wrong, broken or misleading",
      "<strong>Marketplace</strong>: listings, suppliers and orders",
      "<strong>Other</strong>: anything that does not fit above",
    ]) +
    `<h2>What makes a report actionable</h2>` +
    `<p>A wrong number needs three things: the calculator, the market, and the inputs. With those, the result can be reproduced, because the same measurements and price book always produce the same output. A missing price needs the material and the country; a missing feature needs the job you were trying to price.</p>` +
    `<p>Feedback on the calculators is read against the actual engine behaviour, so a report that names the discipline and the measurement is far more useful than a description of the screen. Suggestions for new markets are checked against the rule that a market needs verified local sources before it can carry prices, which is why some markets show a note instead of figures.</p>` +
    footerNav([
      ["Contact", "/contact"],
      ["Calculators", "/calculators"],
      ["Markets", "/global-markets"],
    ]),

  "/credits":
    `<h1>FRELUX Credits</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Credits</nav>` +
    `<p>FRELUX Credits are the account balance used for the features that cost money to run. The wallet on this page shows the balance and the movements on it.</p>` +
    `<h2>How the page works</h2>` +
    list([
      "You must be signed in: the balance belongs to an account, not to a browser",
      "The wallet lists credit movements with their dates, so the balance can be traced rather than just displayed",
      "Purchases are taken through the payment provider, and the receipt is issued there",
      "Your credit balance is separate from your project estimates, which never consume credits",
    ]) +
    `<h2>Using credits well</h2>` +
    `<p>Deterministic calculations are free: entering measurements and pricing them against a market book does not spend anything. Credits are for the parts of the product that call a paid service, such as AI-assisted extraction. That separation is deliberate, so a contractor can price a full job without spending a credit, and only pays when a feature does work that cannot be done locally.</p>` +
    `<p>If a balance does not match what you expect, sign in with the account that made the purchase: credits follow the account, and a second sign-in method can create a second account. Purchase records are held by the payment provider and referenced on the <a href="/privacy-policy">privacy policy</a>.</p>` +
    footerNav([
      ["Pricing", "/pricing"],
      ["Terms of Service", "/terms"],
      ["Contact", "/contact"],
    ]),

  "/partners":
    `<h1>Partners</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Partners</nav>` +
    `<p>Two kinds of conversation start here: strategic partnerships with organisations that build or supply, and investor relations.</p>` +
    `<h2>What to send</h2>` +
    list([
      "<strong>Name and email</strong>, so a reply reaches the right person",
      "<strong>Company or organisation</strong>, the entity the partnership would sit with",
      "<strong>The subject</strong>, strategic partnership or investor relations",
      "<strong>The message</strong>, with the market, the discipline and what you would bring",
    ]) +
    `<h2>What FRELUX brings to a partnership</h2>` +
    `<p>A deterministic estimation engine across painting, tiling, screeding, POP ceilings, roofing and structural work, running against market price books rather than a single global average. That means a partner's rates, products or specifications can be represented honestly in the market where they operate, with the source of each price visible.</p>` +
    `<p>Suppliers benefit from being priced correctly in the market they actually serve; contractors benefit from quotes that match what they will pay. Where a market has no verified price book, the tools show a note instead of inventing figures, so a partnership that supplies real local prices improves the product measurably rather than cosmetically.</p>` +
    footerNav([
      ["Contact", "/contact"],
      ["Global markets", "/global-markets"],
      ["About", "/about"],
    ]),

  "/gallery":
    `<h1>Before and after gallery</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Gallery</nav>` +
    `<p>Finished projects, before and after, shared by the people who priced and built them.</p>` +
    `<h2>What the gallery shows</h2>` +
    list([
      "Completed jobs with the work that was done and the materials involved",
      "The before view beside the after view, so the change is visible rather than claimed",
      "Entries published by users who chose to share their project",
    ]) +
    `<h2>Sharing your own project</h2>` +
    `<p>Any signed-in user can submit a project from this page. Nothing is published automatically: an entry appears once it has been reviewed, and an empty gallery shows a plain notice rather than placeholder images of work that does not exist.</p>` +
    `<p>If you are pricing a similar job, the relevant calculators are the fastest route from the finished result back to a quantity: <a href="/paint-calculator/">paint</a>, <a href="/tile-calculator/">tiling</a>, <a href="/screeding-calculator/">screeding</a> and <a href="/pop-ceiling-calculator/">POP ceilings</a> all take room measurements and return materials against your market's prices.</p>` +
    footerNav([
      ["Calculators", "/calculators"],
      ["Case studies", "/case-studies"],
      ["Feedback", "/feedback"],
    ]),

  "/escrow":
    `<h1>Cross-border construction escrow</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Escrow</nav>` +
    `<p>Paying for work in another country is the part of a diaspora build that goes wrong most often. This page sets out the arrangement FRELUX models: money released against milestones, not against promises.</p>` +
    `<h2>The structure</h2>` +
    list([
      "<strong>Diaspora client</strong>: funds a job from abroad and needs proof that the money bought work",
      "<strong>Local executing contractor</strong>: carries out the scope on the ground",
      "<strong>Locked escrow pool</strong>: holds the funds until a milestone is verified",
      "<strong>Milestones</strong>: each with a deliverable scope, a local payout target and the evidence required to release it",
      "<strong>Financial audit and inflation view</strong>: shows what the money bought at the time it was released",
      "<strong>Forensic site imagery</strong>: site photographs with a digital watermark and location check attached to the milestone",
    ]) +
    `<h2>Why milestone release matters</h2>` +
    `<p>A single upfront transfer puts all the risk on the person furthest from the site. Releasing in stages moves the risk to where it can be managed: a milestone that is not delivered is not paid, and the evidence attached to it is what the release is judged against.</p>` +
    `<p>Use the <a href="/diaspora-budget-tracker">diaspora budget tracker</a> to plan the spend and the <a href="/calculators">calculators</a> to price the scope before it is funded, so the milestones are sized from quantities rather than estimates of effort.</p>` +
    footerNav([
      ["Diaspora budget tracker", "/diaspora-budget-tracker"],
      ["Calculators", "/calculators"],
      ["Global markets", "/global-markets"],
    ]),

  "/global-markets":
    `<h1>Global markets</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Global markets</nav>` +
    `<p>FRELUX prices work in the country where it will be built. Each market carries its own currency, its own block and bag sizes, its own standards, and its own price book.</p>` +
    `<h2>How a market is set up</h2>` +
    list([
      "Currency and formatting, so a total reads the way it does on a local invoice",
      "The local block, cement bag and sheet sizes, which change every quantity downstream",
      "The electrical, plumbing and building standards that apply there",
      "A price book of observed local prices, with the source recorded for each one",
    ]) +
    `<h2>The honesty rule</h2>` +
    `<p>Nigeria has a full verified price book, so its estimates carry complete figures. Other markets carry prices only where real local observations exist. Where no verified price is available, the page says so and asks you to enter the price you actually pay, instead of converting another country's prices or showing a default that looks authoritative.</p>` +
    `<p>Each market has its own set of building templates, so a three-bedroom bungalow is sized in metres or feet as that market builds it, and priced in that market's currency. Open a market to see its templates, its price coverage and its standards.</p>` +
    footerNav([
      ["Templates", "/templates"],
      ["Calculators", "/calculators"],
      ["Material prices", "/material-prices"],
    ]),

  "/about":
    `<h1>About FRELUX</h1>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; About</nav>` +
    `<p>FRELUX is a construction estimation platform built around one rule: the arithmetic must be deterministic, and the data must be honest about where it came from.</p>` +
    `<h2>What it does</h2>` +
    list([
      "Prices painting, tiling, screeding, POP ceilings, roofing and structural work from real measurements",
      "Runs each discipline through its own engine, so a bucket count and a rebar schedule are not the same calculation wearing different labels",
      "Keeps prices in the market where the work happens, with the source recorded",
      "Separates AI extraction from calculation: AI reads documents and images, the engine does the maths",
    ]) +
    `<h2>Why that separation matters</h2>` +
    `<p>An estimate is only useful if it can be checked. When a number comes from a deterministic engine, the same inputs and the same price book always produce the same output, which means a disagreement can be traced to a measurement or a price rather than to a model's mood. When a price is missing, the answer is a request for the real figure, not a plausible-looking substitute.</p>` +
    `<p>The same principle shapes the interface: professional, mobile-first, and free of decoration that gets in the way of a number. Start with the <a href="/calculators">calculators</a>, or read how pricing works in each <a href="/global-markets">market</a>.</p>` +
    footerNav([
      ["Calculators", "/calculators"],
      ["Contact", "/contact"],
      ["Privacy Policy", "/privacy-policy"],
    ]),
};
