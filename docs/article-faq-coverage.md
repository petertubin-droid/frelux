# Learn article FAQ coverage

Every Learn article can carry six structured FAQs. The article page reads
`learn_article_faqs` for its own article and renders both the visible section and
the matching `FAQPage` structured data from those rows, so a row is the single
source for both halves.

## State after the 2026-11-01 backfill

| Articles | FAQs each | Source |
|---|---:|---|
| 120 | 6 | article's own question headings (95 backfilled), plus the 25 engine guides |
| 66 | 3 | older seed batch, no further question headings in the body |
| 206 | 0 | statement headings only |

- `20261101212000_article_faqs_from_headings.sql` added 570 rows across 95
  articles. Each answer is the article's own first sentences under that heading,
  so the FAQ restates the page and introduces no new claim.
- Verified after applying: 570/570 answers appear verbatim in their article body,
  no duplicate questions on any article, and every topped-up article reached six.
- Idempotent: a row is inserted only where the same question is not already on
  the article.

## The remaining 272

These articles use statement headings ("Phase 1: Foundation"), so there is
nothing to extract. Mechanically turning a statement heading into a question
("What happens in Phase 1: Foundation?") would publish templated FAQ copy across
the whole library, and every answer would repeat the page. That is a content
decision rather than a data fix: either author six real questions per article, or
leave these articles without FAQ markup, which search engines treat as normal.
