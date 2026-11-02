import { AlertCircle } from 'lucide-react';

interface EstimateDisclaimerProps {
  text?: string;
}

export default function EstimateDisclaimer({ text }: EstimateDisclaimerProps) {
  const disclaimer = text || 'These estimates are calculated based on the assumptions shown above and may vary according to site conditions, products used, and current market prices. Always confirm with your supplier or contractor before purchasing.';

  return (
    <div className="disclaimer-premium mt-3 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
      <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        {disclaimer}
      </p>
    </div>
  );
}
