import { useEffect, useRef, useState } from 'react';

/**
 * Scroll reveal hook using IntersectionObserver.
 * Returns a ref to attach to any element and a boolean `isVisible`.
 * Once the element enters the viewport, it stays visible (no re-hide).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: number; once?: boolean }
): { ref: React.RefObject<T>; isVisible: boolean } {
  const { threshold = 0.12, rootMargin = 0, once = true } = options ?? {};
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: `${rootMargin}px` }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * Batch scroll reveal — attach the ref to a container and all children
 * with `[data-reveal]` get revealed with staggered delays.
 */
export function useBatchScrollReveal<T extends HTMLElement = HTMLDivElement>(
  staggerMs = 80
): { ref: React.RefObject<T>; isVisible: boolean } {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Stagger children via CSS custom properties
  useEffect(() => {
    if (isVisible && ref.current) {
      const children = ref.current.querySelectorAll('[data-reveal]');
      children.forEach((child, i) => {
        (child as HTMLElement).style.transitionDelay = `${i * staggerMs}ms`;
      });
    }
  }, [isVisible, staggerMs]);

  return { ref, isVisible };
}
