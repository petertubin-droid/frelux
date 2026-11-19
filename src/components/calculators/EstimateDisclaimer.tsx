import { AlertCircle } from "lucide-react";

interface EstimateDisclaimerProps {
  /** Whole sentence, used when the page writes its own disclaimer. */
  text?: string;
  /** What is being estimated, shown as the bold lead-in. */
  subject?: string;
  /** The sentence after the lead-in; falls back to the house wording. */
  notes?: string;
}

export default function EstimateDisclaimer({
  text,
  subject,
  notes,
}: EstimateDisclaimerProps) {
  const disclaimer =
    text ||
    "These estimates are calculated based on the assumptions shown above and may vary according to site conditions, products used, and current market prices. Always confirm with your supplier or contractor before purchasing.";

  return (
    <div className="disclaimer-premium mt-3 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
      <AlertCircle
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
      />
      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        {subject ? (
          <>
            <span className="font-semibold">{subject}: </span>
            {notes || disclaimer}
          </>
        ) : (
          disclaimer
        )}
      </p>
    </div>
  );
}
