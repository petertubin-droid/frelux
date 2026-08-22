/**
 * EstimateDisclaimer — shows the admin-configured disclaimer text
 * that estimates may vary based on site conditions, products, and
 * current market prices.
 */

import { AlertCircle } from 'lucide-react';

interface EstimateDisclaimerProps {
  text?: string;
}

export default function EstimateDisclaimer({ text }: EstimateDisclaimerProps) {
  const disclaimer = text || 'These estimates are calculated based on the assumptions shown above and may vary according to site conditions, products used, and current market prices. Always confirm with your supplier or contractor before purchasing.';

  return (
    <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        {disclaimer}
      </p>
    </div>
  );
}
