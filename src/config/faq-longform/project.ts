import type { LongFormArticle } from "@/config/faq-longform";

export const PROJECT_LONGFORM: Record<string, LongFormArticle> = {
  "labour-estimator": {
    description: `Labour is the largest line in most construction estimates and the one most often carried as a percentage. This tool converts measured quantities into worker days, using the productivity rates you set, so the labour line has the same traceability as the material lines beside it.

The conversion is quantity divided by output per worker day, adjusted by the efficiency factor you enter. That efficiency factor is where the honesty lives: a gang working at scaffold height, in a heat wave or on a restricted site does not produce the textbook output, and pretending otherwise produces a programme that is optimistic and a labour cost that is short.`,
    functions: [
      "Converts each measured quantity into worker days at the productivity rate you enter for that operation.",
      "Applies the site efficiency factor you set, as a visible multiplier rather than a hidden loading.",
      "Rounds durations to whole days, since a gang cannot be booked for a fraction of one.",
      "Summarises labour by trade, which is how crews are assembled and paid.",
      "Totals worker days against the calendar duration you specify, so the crew size implied is visible.",
      "Reports an operation with no productivity rate as missing rather than defaulting one.",
    ],
    worked:
      "Six hundred square metres of blockwork at twelve square metres per worker day is fifty days of one person's work. With an efficiency factor of zero point eight five, which accounts for a site where the scaffold has to be moved, that becomes about fifty nine days. Against a programme allowance of twenty working days, the crew implied is three masons, which is the number that decides the labour cost and the sequence. If the rate were entered at eighteen square metres, the same wall would look like thirty three days, and the crew would be two, and the programme would slip.",
    advantages: [
      "Labour comes from measured quantities rather than a percentage of the material cost.",
      "The efficiency factor is visible, so its effect on duration can be argued about.",
      "Durations are whole days, which matches how crews are booked.",
      "Trade summaries show the crew each operation implies.",
      "A missing rate is reported rather than defaulted.",
    ],
    limits: [
      "It does not produce a programme, a sequence or a critical path.",
      "It does not account for weather, access restrictions or industrial relations.",
      "It does not price labour, only the time it takes.",
      "It does not include supervision, plant operators or non productive time.",
      "It does not replace measured experience of a particular gang.",
    ],
    answers: [
      `By dividing each measured quantity by the output rate for that operation, then adjusting for the efficiency factor you set. Six hundred square metres of blockwork at twelve square metres per worker day is fifty days of work, and at an efficiency of zero point eight five it is fifty nine. The tool does that for each operation, sums by trade, and shows the crew size implied by the duration you want.`,
      `As a multiplier on the calculated days, applied explicitly so it can be seen and changed. Site conditions, access, weather and the learning curve all reduce output, and the factor is where that reduction lives. A factor of one assumes a textbook site, which few are. The value sits in the open rather than inside a rate, so a project manager can disagree with it specifically instead of arguing about the whole labour line.`,
      `Because a crew is booked for days, not for fractions of one. Rounding at the operation level rather than at the total is deliberate: three operations of two and a half days are three crews for three days each in practice, not seven and a half days that can be squeezed. Rounding also makes the labour line slightly conservative, which is the right direction for an estimate that has to be delivered against.`,
      `It is reported as missing and left out of the total, so the labour estimate shows where its own coverage stops. A default rate would produce a duration with nothing behind it, and labour durations feed directly into a programme that other trades are booked against. Where you do not know a rate, the honest move is to measure it on a similar job or to ask a foreman, and then to enter it.`,
      `No. It converts quantities into worker days and shows the crew implied. A programme needs logic: which operations precede which, how many crews can work at once, what the critical path is and where the float sits. That is a separate exercise with its own tool, and the labour hours from this page are one of its inputs rather than its output.`,
    ],
  },
  "margin-calculator": {
    description: `Margin and markup are different numbers computed from different bases, and confusing them is the most common way a profitable job is priced at a loss. Markup is a percentage of cost. Margin is a percentage of the selling price. A twenty percent markup is a sixteen point seven percent margin, and the gap widens as the numbers rise.

The calculator does both, on the base you choose, and shows the selling price, the profit and the resulting margin together. Where a target margin is set it works backwards to the price, which is the direction most pricing decisions actually travel. Tax stays outside the arithmetic unless a configured rule applies, and it is reported as its own line when it does.`,
    functions: [
      "Calculates selling price from cost and either a markup or a margin, on the basis you select.",
      "Shows the resulting margin and markup side by side, so the difference between them is visible.",
      "Works backwards from a target margin to the price that achieves it.",
      "Keeps overhead recovery separate from profit, since they are different lines.",
      "Reports tax as its own line where a rule applies, and as undetermined where none does.",
      "Reports a missing cost as a gap rather than treating it as zero, which would understate the price and the margin together.",
    ],
    worked:
      "A job costing a hundred thousand, priced at a twenty percent markup, sells at a hundred and twenty thousand and carries a margin of sixteen point seven percent. To achieve a twenty percent margin instead, the price is a hundred and twenty five thousand, because the profit has to be a fifth of the price rather than a fifth of the cost. Five thousand of difference on one job, and on a year of jobs it is the difference between a business that grows and one that works for its clients without ever quite getting ahead.",
    advantages: [
      "Margin and markup are shown together, with the base stated.",
      "Backwards pricing from a target margin is supported, which matches how quotes are set.",
      "Overheads stay separate from profit, so recovery can be checked.",
      "Tax is a line, not an assumption folded into the price.",
      "A missing cost is visible rather than being treated as nothing.",
    ],
    limits: [
      "It does not decide the margin a business should target.",
      "It does not allocate overheads across jobs, which needs a recovery basis.",
      "It does not determine tax, and it will not assume a rate.",
      "It does not include cash flow, retention or financing cost.",
      "It does not account for risk, contingency, retention or the cost of financing a job while it runs.",
    ],
    answers: [
      `Markup is a percentage added to cost. Margin is a percentage of the selling price. On a cost of a hundred, a twenty percent markup gives a price of a hundred and twenty and a margin of sixteen point seven percent, because the profit is twenty on a price of a hundred and twenty. The calculator shows both from one input, so the number being quoted is unambiguous.`,
      `Because the two bases produce different prices from the same intention. A contractor who says they want twenty percent and applies it as markup is pricing at sixteen point seven percent of the price, which may be below the margin the business needs once overheads are recovered. Getting the basis wrong on a large job moves the price by thousands, and it is invisible unless both figures are shown.`,
      `No. Tax is reported as its own line where a rule applies to your market, and as undetermined where none does. Folding an assumed percentage into a selling price produces a figure that looks final, is wrong for the jurisdiction and is very hard to unpick once quoted. Where you need to show tax, add the rate that applies to you and it is carried as your figure.`,
      `Yes. Enter a target margin and the calculator returns the price that achieves it, which is the direction most pricing decisions actually take. It is the same arithmetic rearranged, and it is more useful than forward pricing when a business knows the margin it needs to survive and is deciding whether a job is worth taking at all.`,
      `Overheads are kept separate from profit. Recovery is a different calculation, usually a rate per unit of turnover or per project, and mixing it into a margin hides whether the business is covering its fixed costs. The calculator shows cost, overhead recovery, profit and price as distinct lines, so a job that looks profitable at the margin line can still be seen to be thin once overheads are counted.`,
    ],
  },
};
