import { Info } from "lucide-react";
import { classNames } from "@/lib/utils";

/**
 * The note that sits above the first input of a calculator.
 *
 * Almost every over estimate this site can produce comes from one habit: leaving
 * a measurement type on whatever was selected and typing a bare number. A reader
 * who means millimetres but leaves metres selected is out by a thousand, and the
 * page answers with total confidence. The note says that once, in the place the
 * mistake is made, rather than in a FAQ nobody opens.
 */
export interface MeasurementTipProps {
  /** What the reader is about to choose, e.g. "unit" or "measurement type". */
  what?: string;
  className?: string;
}

export default function MeasurementTip({
  what = "measurement type",
  className,
}: MeasurementTipProps) {
  return (
    <div
      data-testid="measurement-tip"
      className={classNames(
        "flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900",
        "dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        <span className="font-semibold">
          Set the {what} before you calculate.
        </span>{" "}
        Quantities are worked out from the unit you choose, so a figure entered
        on the wrong setting over estimates the materials. Check the {what} on
        every field, then calculate.
      </p>
    </div>
  );
}
