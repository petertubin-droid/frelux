# Wall-finishing SEO standard

Applies to every new market wall-finishing article and to metadata retrofits.

## Why metadata is the safe lever

`set_wall_finishing_review_attribution()` resets `editorial_review_status` to draft and flips
`status` back to draft when any of these change: `title`, `slug`, `excerpt`, `content`,
`category_slug`, `wall_market_code`, `wall_topic_id`, `wall_article_theme`,
`wall_language_code`.

`meta_title` and `meta_description` are NOT watched. They can be improved on live,
approved articles without touching review state, which makes them the first SEO lever
on the existing corpus.

## Field rules

| Field | Rule |
| --- | --- |
| slug | lead with the search phrase, hyphens, no market prefix repeated twice, no dates |
| title | search phrase first, then the specific angle; 45-65 characters |
| meta_title | <= 60 characters, front-loaded phrase, market qualifier only if it fits |
| meta_description | 140-158 characters: phrase + concrete benefit + differentiator |
| excerpt | the SERP-ready summary, 1-2 sentences, no repetition of the title |

## Body rules for new articles

1. The primary phrase appears in the first 100 words, in plain prose, not stuffed.
2. At least four H2s are phrased as real questions owners type ("How thick should the
   second coat be?", "Why does the joint crack along the seam?").
3. Each H2 is followed by a direct answer in the first sentence, then the detail.
4. Include one short "what it costs and who does it" section, since price and trade
   intent are the highest-converting queries on this library.
5. Link 2-3 sibling articles in the same topic cluster with descriptive anchor text.
6. Keep the market's own vocabulary in brackets on first use (e.g. joint compound,
   skim coat, kurosu), because local terminology is what local searchers type.
7. No em dashes, no AI imagery, one real photograph with verified attribution.

## Signals we cannot fake

Depth (1,800+ words), a real photograph, named standards and a stated inspection method
are what make the page rank and stay ranked. Metadata gets the click; the body keeps it.
