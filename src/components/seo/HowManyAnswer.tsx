import { useLocation } from "react-router-dom";
import { howManyFor } from "../../../scripts/lib/how-many.mjs";

/**
 * The "how many … do I need" answer, rendered once for every tool route.
 *
 * The prerendered HTML carries this answer so a crawler that does not run
 * JavaScript still sees it, but React replaces the prerendered body on
 * hydration. Without this component the answer a search result promised
 * disappears the moment the app boots, so it is mounted once in the layout and
 * reads the same registry the prerenderer uses. One source, so the two cannot
 * disagree, and no calculator page needs its own copy.
 */
export default function HowManyAnswer() {
  const { pathname } = useLocation();
  const entry = howManyFor(pathname.replace(/\/+$/, "") || "/");
  if (!entry) return null;

  return (
    <section
      aria-labelledby="how-many-answer"
      className="mx-auto mt-10 max-w-5xl px-4 sm:px-6"
    >
      <h2
        id="how-many-answer"
        className="font-heading text-lg font-semibold text-foreground"
      >
        {entry.q}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {entry.a}
      </p>
    </section>
  );
}
