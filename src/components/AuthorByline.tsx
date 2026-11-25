import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  EDITORIAL_DESK,
  EDITORIAL_PATH,
  NAMED_REVIEWERS,
  type NamedReviewer,
} from "@/lib/editorial";

/**
 * Visible authorship for a content page.
 *
 * E-E-A-T is only credited when the reader can see who stands behind a page and
 * can open the policy that governs it. A named, credentialed reviewer is shown
 * when one exists; otherwise the desk byline is shown, which is weaker but true.
 */
export default function AuthorByline({
  reviewer,
  reviewedOn,
  className = "",
}: {
  /** Defaults to the first named reviewer, if the roster has one. */
  reviewer?: NamedReviewer;
  /** ISO date of the last review, when the page records one. */
  reviewedOn?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const person = reviewer ?? NAMED_REVIEWERS[0];

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span>
        {t("Written and reviewed by")}{" "}
        <span className="font-medium text-foreground">
          {person ? person.name : EDITORIAL_DESK.name}
        </span>
        {person ? `, ${person.credential}` : ""}
      </span>
      {reviewedOn ? (
        <span>
          · {t("Last reviewed")} {reviewedOn}
        </span>
      ) : null}
      <Link className="underline hover:text-foreground" to={EDITORIAL_PATH}>
        {t("Editorial standards")}
      </Link>
    </p>
  );
}
