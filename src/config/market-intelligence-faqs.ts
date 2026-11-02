/**
 * Market intelligence FAQs.
 *
 * Each public market intelligence page answers the questions a reader asks
 * before trusting a figure: where it came from, how old it is, what it does not
 * cover and what it must never be mistaken for. The pages render these exact
 * strings, and the same array feeds FAQPage structured data, so the markup can
 * never drift from what a visitor reads.
 *
 * Editorial rules: practitioner register, no em dashes and no en dashes, and no
 * promise about a number we do not publish. Where a figure is missing, these
 * answers say so instead of explaining it away.
 */

export interface MarketIntelFaq {
  question: string;
  answer: string;
}

export const MARKET_INTEL_FAQS: Record<string, MarketIntelFaq[]> = {
  overview: [
    {
      question: "Where do the prices and index figures on this page come from?",
      answer:
        "Every figure is either an official statistical series from a national statistics office or central bank, a filing published by a listed company, or a price a retailer publishes itself. Each card names its publisher, its licence where one applies, and the date the observation belongs to. Nothing is invented to fill a gap.",
    },
    {
      question: "How current is the data?",
      answer:
        "It moves at the speed of the publisher, not ours. Producer price indices typically lag by a month or a quarter, exchange filings appear after the announcement, and retailer prices are as fresh as the retailer makes them. The observation date is shown beside every number so you can judge it yourself.",
    },
    {
      question: "Why does a market or a company show no price?",
      answer:
        "Because no source we are allowed to use publishes one. A blank cell is honest; a guessed number is not. Where a market has no verified series, the page says so and points you at the retail price tracker or the calculators instead.",
    },
    {
      question: "Which countries does FRELUX cover?",
      answer:
        "Thirty two markets, weighted towards Africa, the Gulf, Europe and North America, with the deepest coverage in Nigeria. Coverage differs by data type: more markets have retail prices than have listed construction companies.",
    },
    {
      question: "Can I put these figures in a tender or a quotation?",
      answer:
        "Use them as a reference, not as a quotation. Indices describe direction and relative movement, retail observations carry one retailer's margin, and neither includes freight, handling, tax or the credit terms your supplier will quote you. Confirm the price you will actually pay with the supplier before you commit it to a client.",
    },
    {
      question: "Is any of this investment advice?",
      answer:
        "No. Market intelligence here is reference information about companies, materials and published indices. It is not a recommendation, a forecast or an offer, and nothing on FRELUX is written for the purpose of telling you to buy or sell anything.",
    },
  ],

  stocks: [
    {
      question: "Are these live share prices?",
      answer:
        "No. Prices come from the market data provider configured for the platform and are usually delayed. Each quote shows its exchange and the time it was captured, so a delayed figure is never presented as if it were real time.",
    },
    {
      question: "Which exchanges are covered?",
      answer:
        "The companies registry lists the exchange and country for every company, covering the Nigerian Exchange, Johannesburg, London, Euronext, the Gulf exchanges and others where a provider supplies data. A company can be listed on more than one exchange; the primary listing is the one shown.",
    },
    {
      question: "What does market capitalisation mean in this table?",
      answer:
        "Shares outstanding multiplied by the latest price, where the provider supplies both. It is a rough size indicator for comparing builders and materials companies, and it says nothing about debt, backlog or the quality of the order book.",
    },
    {
      question: "Can I compare companies or keep a shortlist?",
      answer:
        "Yes. Filter by sector, compare the rows you care about and keep a watchlist, which is stored against your account rather than shared publicly. Comparisons use the same provider fields the individual pages show.",
    },
    {
      question: "A figure looks wrong. What should I do?",
      answer:
        "Check the capture time and the source label first, since delayed and restated figures both happen. If it is still wrong, send it through the contact form with the company, the field and the date, and it gets traced back to the provider rather than quietly patched.",
    },
  ],

  companies: [
    {
      question: "How does a company get into this registry?",
      answer:
        "It has to be publicly listed and work in construction, building materials, aggregates, steel, engineering or the services around them. FRELUX maintains the reference facts, sector label and country, and the price fields come from the configured provider.",
    },
    {
      question: "What happens when a provider supplies no financials?",
      answer:
        "The profile keeps the reference facts it can verify, such as the exchange, ticker, country and sector, and leaves the financial fields empty with a note. An empty field is a statement that we do not hold the number, not that the company has none.",
    },
    {
      question: "How good is the sector classification?",
      answer:
        "It is the provider's classification, or ours where the provider has none, and it is a convenience for filtering rather than an opinion. Conglomerates usually sit under one label even when construction is a minority of their revenue, so read the profile before treating a sector peer as a true peer.",
    },
    {
      question: "Can I find a company by its ticker?",
      answer:
        "Yes. Search accepts a ticker, a company name or a country, and each company has its own page with the listing facts, price history where available and the market context for its country.",
    },
    {
      question: "Can I ask for a company to be added?",
      answer:
        "Yes, through the contact form. It has to be listed and it has to have a source we can cite, which is why some well known private contractors are not in the registry. Nothing gets added on a supplier's word alone.",
    },
  ],

  materials: [
    {
      question: "What is a producer price index, in plain terms?",
      answer:
        "It tracks how the price of a material changes at the producer or manufacturer level over time, usually indexed to a base year. It is the cleanest way to see whether cement, steel or timber is getting more expensive, but it is an index of change, not a shelf price.",
    },
    {
      question: "Why does the retail price I see differ from the official index?",
      answer:
        "Because they measure different things. An index averages producers and lags publication, while a retail observation includes the distributor's margin, transport, bagging, handling and sometimes credit. A gap between the two is expected, and a persistent gap tells you something about the local supply chain.",
    },
    {
      question: "Which categories are covered?",
      answer:
        "Cement, reinforcement steel, structural sections, timber and board, paint and coatings, blocks, aggregates and roof sheeting, with the exact set depending on what each market's statistics office publishes. Categories without a licensed source stay empty.",
    },
    {
      question: "How do I turn an index movement into money?",
      answer:
        "Use the index for direction and the calculators for money. Apply the percentage movement to a quantity you have already priced, then confirm the current price with your supplier, since an index will not tell you what a truckload costs this morning in your city.",
    },
    {
      question: "Why do some markets show no material data at all?",
      answer:
        "Either the statistics office does not publish the series in a form we can licence, or it stopped publishing it. We would rather show an empty market with an explanation than a plausible looking chart built on air.",
    },
  ],

  trends: [
    {
      question: "What counts as a trend here?",
      answer:
        "A measurable movement in a published index over a stated period, not a narrative. The page shows direction, size and the two observations that produced it, so you can check the period before you accept the story.",
    },
    {
      question: "How is the direction calculated?",
      answer:
        "The change between the first and the last observation inside the period, expressed as a percentage. Where the series is monthly the period is monthly, and where it is quarterly it is quarterly. Nothing is annualised unless the label says so.",
    },
    {
      question: "What does confidence mean on a ranking?",
      answer:
        "How close the source sits to the movement itself. An official index release is high confidence, a trade association figure is medium, and a single retailer observation is low. It is a note about the evidence, not a probability.",
    },
    {
      question: "Why do neighbouring markets move in opposite directions?",
      answer:
        "Currency, freight, local capacity and subsidies all push independently. A devaluation lifts the local price of imported steel while a new local plant pushes cement the other way, in the same month and the same region.",
    },
    {
      question: "Can I export the trend data?",
      answer:
        "Not yet as a bulk file. Each series page shows its observations with dates and source, so a small extract can be copied by hand, and a proper export is on the list rather than half built.",
    },
  ],

  investment: [
    {
      question: "Is this investment advice?",
      answer:
        "No. This page describes how the listed construction universe is composed and what the companies report. It does not recommend, rank for investment or predict returns, and it is written for people pricing and planning construction work, not for portfolio decisions.",
    },
    {
      question: "What is sector composition based on?",
      answer:
        "The provider's sector label for each listed company in the registry, counted and weighted by market capitalisation where that figure exists. Where a company has no capitalisation, it counts in the company tally and not in the weighting.",
    },
    {
      question: "Why does a sector look thin in my market?",
      answer:
        "Because few construction or materials companies are listed there. Most building work in most markets is done by private contractors that publish no accounts, so a thin sector is usually a fact about the market rather than a gap in our data.",
    },
    {
      question: "What does reported scale mean?",
      answer:
        "Revenue, employees or market capitalisation as the company or provider reports it. FRELUX does not audit it, restate it or adjust it for currency, so two companies in different countries are only loosely comparable on this figure.",
    },
    {
      question: "How do I go deeper on one company?",
      answer:
        "Open its profile from the registry. You get the listing facts, the latest quote with its capture time, the price history where a provider supplies it and the country's market context, all on one page with its sources.",
    },
  ],

  news: [
    {
      question: "Where does the news come from?",
      answer:
        "Named publications, exchanges and company announcements. Every item carries its publication and date, and the summary stays close to what the source said rather than adding interpretation of its own.",
    },
    {
      question: "Does FRELUX write these headlines?",
      answer:
        "No. Headlines are the source's, summaries are attributed and short. If a figure in a story matters to a cost plan, follow it back to the original and check it before you price anything on it.",
    },
    {
      question: "How current is the feed?",
      answer:
        "As current as the sources we pull. The date on each item is the publication date, and a quiet week means there was nothing worth reporting rather than that nothing was collected.",
    },
    {
      question: "Do you cover policy and infrastructure programmes?",
      answer:
        "Yes, where they move material prices or construction demand: tariffs, import rules, budgets, road and housing programmes, and the announcements that change what a project costs. General business news that cannot reach a construction budget is left out.",
    },
    {
      question: "Can I send in a story or a correction?",
      answer:
        "Yes, through the contact form with the link and the date. Corrections are applied to the item itself, and a story only goes in if it names a source that can be checked.",
    },
  ],
};
