import type { LongFormArticle } from "@/config/faq-longform";

export const COMMERCIAL_LONGFORM: Record<string, LongFormArticle> = {
  "carbon-footprint": {
    description: `Embodied carbon is the emissions that come with making and moving a material, before the building is used at all. It is calculated by multiplying a quantity by an emissions factor, which is why this tool starts from measured quantities rather than from a floor area and a benchmark.

The consequence is that a carbon figure is only as good as its factors, and factors come from published datasets that differ by region and by production route. Where a material has no factor, the tool reports the gap rather than applying a generic one, because a made up factor produces a number that looks like an assessment and is not. Two specifications can then be compared on the same basis, which is where most of the value sits.`,
    functions: [
      "Calculates emissions from the measured quantity of each material and its emissions factor.",
      "Groups the total by stage, separating the material supply from transport and from construction activity.",
      "Reports a line with no factor as uncounted rather than applying a default.",
      "Compares two specifications on the same quantities, so a substitution shows its difference.",
      "Expresses the total in kilogrammes or tonnes of carbon dioxide equivalent, with the unit stated.",
      "Shows which material contributes most, which is where a reduction usually comes from.",
      "Keeps the quantity and the factor as separate columns, so a factor update can be applied without re measuring.",
      "Reports the total for each element of the building, so a frame can be compared with a roof rather than only material with material.",
      "States the dataset and the version behind each factor, which is what makes a figure defensible in a planning document.",
    ],
    worked:
      "Fifteen cubic metres of concrete at a factor of about three hundred kilogrammes per cubic metre is four and a half tonnes, and twenty tonnes of reinforcement at roughly one and a half kilogrammes per kilogramme is thirty tonnes, which is usually the surprise. Change the concrete to a blend with a lower cement content and its line falls by a third while the steel stays where it is. The comparison shows that the steel dominates, which is not where most people look first.",
    advantages: [
      "The figure comes from measured quantities, so it can be traced to a bill.",
      "Stages are separated, so transport and supply can be seen apart.",
      "Two specifications are compared on identical quantities.",
      "A missing factor is reported rather than assumed.",
      "The largest contributor is visible, which is where reduction effort belongs.",
    ],
    limits: [
      "It is not a certification or a verified assessment.",
      "It does not include operational energy, which is a separate calculation.",
      "It does not include end of life emissions unless you append them.",
      "It does not validate the factors, which come from published datasets.",
      "It does not account for sequestration in bio based materials beyond the factor used, or for the timing of emissions over the building life.",
    ],
    answers: [
      `Quantity multiplied by emissions factor, per material, then summed. The quantity comes from the calculators, so a bill and a carbon figure share the same measurement. The factor comes from a published dataset and is stated per material and per unit, which means the result can be checked line by line by anyone with the same dataset.`,
      `It is reported as uncounted and left out of the total, with the gap shown. Applying a generic factor to a material with no published value would produce a number that looks authoritative and cannot be defended, and carbon figures increasingly end up in planning documents where being wrong matters.`,
      `Material supply, transport to site and the construction activity itself, kept apart so each can be seen. Operational energy over the building's life is not included, and neither is end of life demolition and disposal unless they are added. That boundary is stated rather than implied, because a carbon figure without a boundary means very little.`,
      `Yes, and that is the main use. The same quantities are priced against two specifications, so the difference between a standard mix and a blended one, or between two insulation products, is a number rather than a claim. Because the quantities are identical in both runs, the difference is attributable to the substitution.`,
      `No. It is an estimate for comparison and early design, not a certified assessment. Certification involves verification, a defined methodology, an assessor and a declared boundary, and the figures here are one input to that process rather than a substitute for it. Used that way it is genuinely useful, because most of the reduction available on a project is decided long before an assessor is appointed, at the point where the frame and the envelope are chosen.`,
    ],
  },
  "circular-reuse": {
    description: `Demolition produces material that is either recovered or lost, and the difference between those outcomes is decided before the building comes down. This tool counts what is there, applies recovery rates to each material stream, and reports the split between what can come back into use and what goes to disposal.

The split is the useful output. A single diversion percentage hides the fact that steel is nearly always recovered and gypsum is almost never, so a building's recovery rate follows from its material mix rather than from good intentions. Where a material is hazardous, the tool does not rate it for recovery, because that is a different process entirely.`,
    functions: [
      "Counts the materials in the building being taken down, by type and quantity.",
      "Applies a recovery rate per material stream, drawn from published practice rather than from an assumption.",
      "Reports recovered and disposed tonnages separately, with the diversion rate derived from them.",
      "Flags hazardous materials and excludes them from the recovery calculation.",
      "Shows which stream contributes most to what is lost, which is where a recovery plan should start.",
      "Keeps re use separate from recycling, since the two are different outcomes.",
      "Reports a material with no recovery rate as unassessed rather than assuming one.",
      "Shows the volume as well as the weight, since bulky low density materials fill skips while barely moving the tonnage.",
      "Keeps a record of the rates applied, so a diversion figure can be presented with its basis rather than on its own.",
    ],
    worked:
      "A building with four hundred tonnes of concrete, sixty of steel, thirty of timber and twenty of gypsum. At published rates, steel recovers almost entirely, concrete largely as aggregate, timber at a moderate rate depending on treatment, and gypsum rarely. The diversion rate works out high because the concrete and steel dominate by weight, which is exactly why a percentage alone can mislead a client or an assessor: the material that is lost is small by weight and large by volume and cost.",
    advantages: [
      "Recovery is calculated per material rather than as a single target.",
      "Hazardous materials are excluded rather than counted as recoverable.",
      "Re use and recycling stay distinct, because they are different outcomes.",
      "The dominant stream is visible, which directs the recovery plan.",
      "An unassessed material is reported rather than assumed.",
    ],
    limits: [
      "It does not survey the building or verify what is actually there.",
      "It does not test for contamination or hazardous content.",
      "It does not guarantee a market for recovered material, and a rate assumes somewhere for it to go within reach of the site.",
      "It does not include the cost of recovery, transport, processing or the gate fees that decide whether recovery is worth doing.",
      "It does not certify a diversion rate to a standard, and it does not verify that recovery actually happened.",
    ],
    answers: [
      `The materials present, the recovery rate for each, and the resulting split between recovered and disposed tonnage. It also derives a diversion rate from those figures and shows which stream contributes most to what is lost. Re use is kept separate from recycling, since a reclaimed beam and crushed concrete are different outcomes with different claims. The tonnage split is reported alongside, because a diversion percentage on its own can look excellent while a small, awkward stream is going to landfill in its entirety.`,
      `From published practice for each material stream, and they are rates rather than facts about a particular site. Steel is recovered at a high rate almost everywhere because its scrap value is real; concrete is recovered as aggregate where a crusher is available; gypsum recovery is limited by processing infrastructure. The rate you apply is an input, so a site with better arrangements can show it.`,
      `Because a single percentage hides where the loss is. A building that is mostly concrete and steel will show a high diversion rate and still lose every piece of its gypsum and most of its timber. Reporting recovered and disposed tonnage separately, per material, means the plan can target the stream that actually needs attention rather than celebrating the one that was never at risk.`,
      `Yes, as a derived figure with its basis shown. That matters because diversion rates are increasingly asked for in planning and in client sustainability reporting, and a figure presented without its material split and its rates cannot be checked. Presenting the split alongside the percentage is what makes the claim defensible.`,
      `No. Hazardous materials are flagged and excluded from the recovery calculation, because their handling is a separate regulated process. Asbestos, contaminated soil and certain finishes cannot be counted as recoverable, and including them in a diversion rate would misrepresent both the outcome and the risk.`,
    ],
  },
  "warranty-certificate": {
    description: `A warranty certificate records what was built, by whom, with which materials, and it does so at a moment when all of that is still known. Years later, when a defect appears, the difference between a certificate and a memory is the difference between a claim and an argument.

The certificate freezes the configuration: the specification, the quantities, the products and the date. That freeze is the point, because a specification that can still be edited is not evidence of anything. A hash of the frozen configuration is stored with it, so the record can be shown to be unchanged since issue rather than merely asserted to be, which is what separates evidence from a claim.`,
    functions: [
      "Records the specification, the products and the quantities as issued, with the date of issue.",
      "Freezes the configuration so a later edit cannot rewrite the record.",
      "Calculates a hash of the frozen configuration, so tampering is detectable.",
      "Records who issued it, for whom, and against which contract or address.",
      "Keeps warranty periods and their start dates with the certificate.",
      "Reports a certificate with a missing period or date as incomplete rather than issuing it.",
      "Links the certificate to the measured quantities it covers, so the scope is unambiguous.",
      "Records the maintenance the warranty depends on, since most warranties are conditional on it being done.",
      "Allows a certificate to be reissued with a new hash when a variation is agreed, so the history of the record is kept.",
    ],
    worked:
      "A roof replacement with a ten year workmanship warranty: the certificate records the specification, the sheeting, the fixings, the underlay, the quantities and the completion date, then hashes the frozen set. Two years later a leak appears and the question is whether the fixings specified were the fixings used. The certificate says what was specified and that the record has not changed since. It does not prove what was installed, which is what photographs and inspection records are for.",
    advantages: [
      "The record is made when the facts are known rather than reconstructed later.",
      "A frozen configuration cannot be edited into something more convenient.",
      "The hash makes a change detectable rather than deniable.",
      "Periods and dates sit with the scope they cover.",
      "An incomplete certificate is reported rather than issued.",
    ],
    limits: [
      "It is not a legal warranty and it does not create contractual rights.",
      "It does not prove that what was specified was installed.",
      "It does not inspect, test or certify the work, and it does not record what was actually installed.",
      "It does not decide liability or adjudicate a claim.",
      "It does not replace insurance backed guarantees, statutory protection or the terms of the contract it sits beside.",
    ],
    answers: [
      `The specification, the products and quantities, the parties, the completion date, the warranty period and its start, and a hash of that frozen set. It is a record of what was agreed and measured at handover, which is the moment when all of it is knowable. What it deliberately does not contain is an opinion, since opinions do not survive contact with a dispute. It is a short document by design: the facts that a claim turns on are few, and a record that runs to thirty pages is one nobody reads at the moment it matters.`,
      `Because a specification that can still be edited is not evidence. The value of a certificate is that it records a state at a date and can be shown not to have changed since. Freezing the configuration is what allows the hash to mean anything: a hash of something revisable proves only that the revision happened.`,
      `That the recorded configuration is the one that was issued, unchanged. It is a check on the record, not on the building. If a specification is altered after issue, the hash no longer matches and the alteration is visible. What it cannot tell you is whether the work on site followed the specification, which requires inspection records.`,
      `No. It is a record, and a record is what a warranty claim is argued with rather than what creates the warranty. The warranty itself comes from the contract, the guarantee or the statute. The certificate's job is to make the facts of the work available years later, in a form that can be trusted, which is often the difference between a claim that proceeds and one that stalls.`,
      `At practical completion, or at the completion of the element it covers. Issuing it later means reconstructing the specification from memory and photographs, which is exactly the situation the certificate exists to avoid. Where an element is completed early, such as a roof before the interior is finished, that element can be certified on its own date.`,
    ],
  },
  "contractor-credit": {
    description: `A credit score is an inference about whether someone will pay, and any honest version of it has to say what it is built from. This tool builds one from payment history, references and the record of work completed, and it refuses to produce a score when there is not enough history to support one.

That refusal is the design. A contractor with no record is not a bad risk, they are an unknown one, and a score of zero would say otherwise. The tool reports the missing history as missing, so a decision to extend credit or award a subcontract rests on evidence rather than on a number that was invented to fill a gap.`,
    functions: [
      "Calculates a score from payment history, completed work and reference checks you record.",
      "Weights each factor explicitly, so the contribution of each can be seen.",
      "Reports insufficient history as unscored rather than as a low score.",
      "Shows which factors would most improve a score, which is useful feedback to a subcontractor.",
      "Keeps the underlying evidence visible beside the score, so it can be examined.",
      "Records the date of each reference and payment record, since ageing evidence is weaker evidence.",
      "Separates the score from the decision, which remains a commercial judgement.",
      "Records the size of the commitments involved, since a score for a small package and a large one carry different weight.",
      "Keeps a history of scores over time, so an improving or deteriorating record is visible rather than a single reading.",
    ],
    worked:
      "A subcontractor with eight completed jobs, six paid on time and two late, and two verified references, scores in a middle band with the late payments as the main deduction. A second subcontractor with three jobs and no references is not scored at all, because there is not enough history to place them. The first can improve by settling on time and by having references verified; the second needs a longer record before any inference is fair.",
    advantages: [
      "Weights are visible, so a score can be interrogated rather than trusted.",
      "Insufficient history is reported as such, not as a failure.",
      "The evidence sits beside the score, so a decision can be made on the record.",
      "Ageing of evidence is recorded, which matters in a volatile market.",
      "The score informs a decision without making it.",
    ],
    limits: [
      "It is not a credit bureau score and it does not access credit files.",
      "It does not verify that references are genuine beyond what you record.",
      "It does not predict insolvency or default, and it cannot see commitments held elsewhere.",
      "It does not account for market conditions, sector risk or the state of the contractor's own order book.",
      "It does not replace due diligence, guarantees, staged payments or a properly drafted subcontract.",
    ],
    answers: [
      `From recorded evidence: payment history, completed work and verified references, each with a stated weight. The weights are visible, so a score can be interrogated rather than accepted, and the evidence sits beside it. Where the evidence is thin, the tool declines to score rather than producing a number that would look like knowledge it does not have.`,
      `It reports them as unscored with the reason stated. A contractor with three completed jobs and no references is an unknown, and the honest treatment of an unknown is to say so. Scoring them low would wrongly imply a negative record, and scoring them high would be inventing one.`,
      `From the records you hold and the references that have been checked. The tool does not access credit files or public registers, so the quality of a score depends on the quality of the evidence behind it. That is a limitation worth stating plainly, because a score that appears authoritative invites a decision that the evidence may not support.`,
      `Contractors assessing a subcontractor, clients assessing a main contractor, and suppliers assessing a trade account. In each case the score is one input to a decision that also involves the size of the commitment, the payment terms and the security available. It is most useful as a structured way to look at evidence that would otherwise be assembled by impression, and as a record that the evidence was considered before the commitment was made.`,
      `No. A low score means the evidence is thin or the record is patchy, and that calls for a different arrangement rather than an automatic refusal: staged payments, a guarantee, a smaller first package. The score is information, and treating it as a verdict would be using it for something it cannot support. A subcontractor with a patchy record on a small package may be a perfectly sound choice, and one with a clean record may be over committed elsewhere.`,
    ],
  },
};
