import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { scrollToPageTop } from "@/lib/ux/scroll-to-top";

const SHOW_AFTER_PX = 480;

/** Site-wide, unobtrusive control for returning from long pages to the top. */
export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY >= SHOW_AFTER_PX);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => scrollToPageTop()}
      className="fixed bottom-[calc(var(--frelux-bottom-ad-h,0px)+6rem)] left-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:bottom-6 md:left-auto md:right-6"
    >
      <ChevronUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
