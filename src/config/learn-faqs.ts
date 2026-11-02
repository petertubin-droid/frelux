/**
 * Answers for the diaspora and learn pages that stand on their own.
 *
 * These pages are the ones a reader reaches from a search about building in
 * Nigeria while living abroad, so the questions below are the ones that decide
 * whether they trust the numbers on the page. Rendered text and FAQPage
 * structured data come from this same array.
 */

export interface LearnFaq {
  question: string;
  answer: string;
}

export const BUILD_FROM_ABROAD_FAQS: LearnFaq[] = [
  {
    question: "How close is a dollar or pound conversion to what I will actually spend?",
    answer:
      "It is a reading aid, not a price. The naira figure comes from Nigerian material and labour rates, and the converted figure moves with the exchange rate on the day it is displayed. What you actually spend is set by the suppliers and trades you hire, on the day they quote, in naira.",
  },
  {
    question: "Should I send money to my builder in naira or in dollars?",
    answer:
      "Pay in the currency the supplier or tradesman invoices, which for local materials and labour is almost always naira. Converting at your end and sending a round dollar figure means somebody absorbs the difference, and it is usually the person buying cement. Keep every receipt and transfer reference against the milestone it paid for.",
  },
  {
    question: "Which measurements do Nigerian suppliers actually sell in?",
    answer:
      "It depends on the trade, which is exactly why quantities go wrong. Blocks and cement are sold by unit and bag, sand and granite by tonne or by tipper load, timber and roofing sheets by length, tiles by box and square metre, and paint by tin or bucket. Convert your plan into the unit the supplier sells before you ask for a price.",
  },
  {
    question: "How much detail should a quote from a contractor carry?",
    answer:
      "It should list quantities, the unit each quantity is measured in, the unit price, the total, the date and how long the price holds. A lump sum with no quantities cannot be checked, compared or adjusted when a wall moves, and it is the most common way a budget quietly grows while nobody can point at the line that grew.",
  },
  {
    question: "How do I follow progress if I am not on site?",
    answer:
      "Agree staged payments tied to completed work rather than to dates, ask for dated photographs at each stage, and keep the quantity take-off beside the photos so you can see what has been consumed. A staged release against visible progress is the cheapest control you have from another country.",
  },
  {
    question: "What does FRELUX not do for a diaspora builder?",
    answer:
      "We do not hold your money, we are not your contractor, and we do not vouch for any particular builder, supplier or price. We give you the measurement logic, the current reference prices, the documents and the tracker, so the decisions and the payments stay yours.",
  },
];
