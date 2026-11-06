import { useCallback, useRef, useState, type RefObject } from "react";
import {
  findMissingFields,
  focusMissingField,
  type MissingField,
} from "@/lib/forms/missing-fields";
import { scrollToResults } from "@/lib/ux/scroll-to-results";

/**
 * The three answers a calculate button owes the reader.
 *
 * Press it with a field empty and it names the field instead of failing
 * silently. Press it with a complete form and the page moves to the first line
 * of the result, so the answer is not left off screen. Everything here is shared
 * so two calculators cannot behave differently.
 *
 * Usage:
 *   const { fieldsRef, resultsRef, missing, handleCalculate } = useCalculatorFeedback();
 *   <div ref={fieldsRef}>...inputs...</div>
 *   <button onClick={() => handleCalculate(calculate)}>Calculate</button>
 *   <MissingFieldsNotice fields={missing} />
 *   <section ref={resultsRef}>...results...</section>
 *
 * Inputs opt in with `aria-required="true"` or `required`. A calculator whose
 * inputs carry neither keeps its existing behaviour, so this can be added to a
 * page before its fields are marked up.
 */
export interface UseCalculatorFeedbackOptions {
  /** Called after validation passes, before the scroll. */
  onValid?: () => void;
  /** Height reserved above the result, in pixels. */
  offset?: number;
}

export interface CalculatorFeedback<T extends HTMLElement = HTMLElement> {
  /** Attach to the element that contains the fields to audit. */
  fieldsRef: RefObject<HTMLDivElement>;
  /** Attach to the start of the result, the element the page scrolls to. */
  resultsRef: RefObject<T>;
  /** Fields found empty on the last press, in page order. Empty once complete. */
  missing: MissingField[];
  /** Validate, then run the calculation or report what is missing. */
  handleCalculate: (calculate?: () => void) => boolean;
  /** Report fields a page validated from its own state rather than the markup. */
  reportMissing: (fields: MissingField[]) => void;
  /** Clear the notice, for a page that wants to reset. */
  clearMissing: () => void;
}

export function useCalculatorFeedback<T extends HTMLElement = HTMLElement>(
  options: UseCalculatorFeedbackOptions = {},
): CalculatorFeedback<T> {
  const fieldsRef = useRef<HTMLDivElement>(null);
  // The result anchor is whatever element the page starts its answers with,
  // a div on one page and a section on another.
  const resultsRef = useRef<T>(null) as RefObject<T>;
  const [missing, setMissing] = useState<MissingField[]>([]);
  const { onValid, offset } = options;

  const clearMissing = useCallback(() => setMissing([]), []);

  // A calculator that keeps numbers in state renders them as 0 rather than an
  // empty box, so the markup cannot tell a blank field from a real zero. Those
  // pages validate their own state and hand the list over here, which keeps one
  // notice and one jump-to-field behaviour across both kinds of page.
  const reportMissing = useCallback((fields: MissingField[]) => {
    setMissing(fields);
    if (fields.length > 0) focusMissingField(fields[0]);
  }, []);

  const handleCalculate = useCallback(
    (calculate?: () => void): boolean => {
      const found = findMissingFields(fieldsRef.current);
      if (found.length > 0) {
        setMissing(found);
        // Point the reader at the first one rather than only listing it.
        focusMissingField(found[0]);
        return false;
      }

      setMissing([]);
      calculate?.();
      onValid?.();

      // The result renders from state, so the jump happens after the commit
      // that puts it on the page. Two frames: one for the commit, one for the
      // layout the scroll reads.
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() =>
            scrollToResults(resultsRef.current, { offset }),
          );
        });
      } else {
        scrollToResults(resultsRef.current, { offset });
      }
      return true;
    },
    [offset, onValid],
  );

  return {
    fieldsRef,
    resultsRef,
    missing,
    handleCalculate,
    reportMissing,
    clearMissing,
  };
}
