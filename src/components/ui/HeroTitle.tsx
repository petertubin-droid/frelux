import { type ElementType } from "react";

/**
 * HeroTitle - premium animated page-title text.
 *
 * The title is set in Clash Display (font-hero, the same display face as
 * the homepage hero) and revealed word by word, each word rising in with a
 * short stagger - the same motion language already used on the homepage, so
 * every page's opening line lands with the same weight.
 *
 * The animation is `both`-filled with per-word delays; the global
 * prefers-reduced-motion guard collapses it to an instant appearance.
 *
 * `as` lets a page use it for an h2 when an h1 already exists on the page.
 */
export default function HeroTitle({
  title,
  className = "",
  as: Tag = "h1",
}: {
  title: string;
  className?: string;
  as?: ElementType;
}) {
  const words = title.split(/\s+/).filter(Boolean);
  return (
    <Tag
      className={`font-hero font-semibold tracking-tight text-balance ${className}`}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block animate-fade-in-up"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}
