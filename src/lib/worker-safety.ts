/**
 * The worker safety rules, in one place so the dashboard notice, the order
 * page and the WhatsApp message cannot drift apart from the enforcement.
 *
 * Every rule here is backed by something that actually refuses the unsafe
 * action: the phone gate in get_pro_public_phone, the CLIENT_ID_REQUIRED and
 * CROSS_STATE_JOB_BLOCKED guards on escrow_contracts, and the 48 hour
 * auto-release clock on escrow_milestones.
 */

export interface SafetyRule {
  id: string;
  title: string;
  how: string;
  why: string;
}

export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "phone-after-escrow",
    title: "No funded escrow, no phone number",
    how: "A professional's number stays hidden until the client has paid money into escrow for that job.",
    why: "A trafficker will not pay real money just to get a phone number, so the cheap lures stop here.",
  },
  {
    id: "no-escrow-no-movement",
    title: "No escrow, no movement",
    how: "Never enter a bus or travel to a site until your job status says ESCROW FUNDED.",
    why: "Come-to-site-first-and-I-will-pay-cash is the oldest trick there is. Funded escrow or nothing.",
  },
  {
    id: "client-id",
    title: "Clients verify before they can hire",
    how: "A client uploads one government ID before a booking can be funded. Only the last four characters are kept.",
    why: "A criminal will not hand over a real NIN, voter's card or licence to set up a job.",
  },
  {
    id: "same-area",
    title: "Work stays in your own city and state",
    how: "Jobs outside your area are blocked unless an admin approves that exact client and job first.",
    why: "Trafficking depends on moving you somewhere you have no family, no contacts and no way back.",
  },
  {
    id: "auto-release",
    title: "You get paid 48 hours after proof",
    how: "Upload your proof photos when the work is done. If the client neither approves nor raises a problem within 48 hours, escrow pays you automatically.",
    why: "A client cannot disappear and leave you unpaid for work you have already finished.",
  },
];

export const SAFETY_SUMMARY =
  "1. No ID and no escrow means no phone number. 2. Same-city jobs only, no unverified out-of-state travel. 3. 48-hour auto-release after photo proof, so workers always get paid.";

/** Plain-English notice the owner can paste into a page or send on WhatsApp. */
export const WHATSAPP_SAFETY_NOTICE = [
  "FRELUX WORKER SAFETY RULES",
  "",
  "1. Your number stays hidden until the client has paid into escrow for your job. Nobody gets your phone for free.",
  "",
  "2. No escrow, no movement. Never enter a bus or travel to a site until your job says ESCROW FUNDED. If a client says come first and I will pay cash on arrival, that is a red flag. Say no.",
  "",
  "3. Every client verifies one government ID before they can book you. Real work has a real, traceable client behind it.",
  "",
  "4. Work stays in your own city and state. If a job wants you to travel far from home, FRELUX has to verify that company first.",
  "",
  "5. Finish the job, upload your proof photos, and you are paid automatically after 48 hours if the client does not respond.",
  "",
  "If anything feels wrong, stop and report it inside FRELUX before you travel.",
].join("\n");

export type ContactAccessReason =
  | "unlocked"
  | "professional_has_not_published_a_number"
  | "sign_in_and_fund_escrow_to_reveal"
  | "fund_escrow_for_this_professional_to_reveal"
  | string;

/** What to tell someone looking at a profile whose number is still hidden. */
export function contactAccessMessage(reason: ContactAccessReason): string {
  switch (reason) {
    case "professional_has_not_published_a_number":
      return "This professional has not published a phone number yet. Send a message through FRELUX instead.";
    case "sign_in_and_fund_escrow_to_reveal":
      return "Sign in and fund escrow for this professional to reveal their number. Contact details stay hidden until money is held for the work.";
    case "fund_escrow_for_this_professional_to_reveal":
      return "Fund escrow for this professional to reveal their number. Workers stay unlisted until a client has committed real money to the job.";
    default:
      return "";
  }
}

/** The share link for the notice, so it can go out on WhatsApp unchanged. */
export function safetyWhatsAppLink(
  text: string = WHATSAPP_SAFETY_NOTICE,
): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Copy used by the banner that sits above a worker's own jobs. */
export const NO_ESCROW_NO_MOVEMENT =
  "Never enter a bus or visit a site until this job shows ESCROW FUNDED.";
