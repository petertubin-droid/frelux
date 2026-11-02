#!/usr/bin/env python3
"""Generate SEO metadata for FRELUX wall-finishing articles.

Rules (see docs/wall-finishing-seo-standard.md):
  * meta_title <= 60 chars, front-loaded with the phrase people search.
  * meta_description 140-158 chars: phrase + concrete benefit + differentiator.
  * meta_title / meta_description are NOT watched by
    set_wall_finishing_review_attribution, so updating them never resets
    editorial_review_status (content/title/slug/excerpt are watched).
"""
import re

MARKET_WORD = {'US': 'US', 'GB': 'UK', 'CA': 'Canadian', 'DE': 'German', 'JP': 'Japanese',
               'AU': 'Australian', 'IN': 'Indian', 'FR': 'French', 'BR': 'Brazilian'}

THEME_VALUE = {
    'overview': 'what the assembly is, why it is built that way and where it fails',
    'materials': 'which products to buy, how they are graded and what each one is for',
    'installation': 'the step-by-step sequence, coat by coat and fixing by fixing',
    'quality': 'how to check the work, what the tolerances are and which defects matter',
    'maintenance': 'how to inspect, patch, refinish and when to call a specialist',
}

TAILS = [
    ' {mw} practice, standards and materials explained step by step.',
    ' {mw} methods and materials, explained for owners and trades.',
    ' Step-by-step {mw} method, standards and materials.',
    ' A {mw} field guide for owners and trades.',
]


def clip(text, limit):
    text = re.sub(r'\s+', ' ', text or '').strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(' ', 1)[0].rstrip(',;:.')
    return cut


def keyword_phrase(title):
    t = re.sub(r'\s*[|:].*$', '', title).strip()
    return t


def build(title, theme, market):
    kw = keyword_phrase(title)
    mw = MARKET_WORD.get(market, market)
    value = THEME_VALUE.get(theme, THEME_VALUE['overview'])

    meta_title = kw if len(kw) <= 60 else clip(kw, 60)
    if len(meta_title) <= 51:
        meta_title = f'{meta_title}: {mw} Guide'

    lead = f'{kw}: {value}.'
    desc = lead
    for tail in TAILS:
        cand = (lead + tail.format(mw=mw)).strip()
        if 140 <= len(cand) <= 158:
            desc = cand
            break
        desc = cand
    if len(desc) > 158:
        desc = clip(desc, 158)
    while len(desc) < 140:
        desc = clip(desc + ' Standards, materials and sequence.', 158)
        if len(desc) < 140:
            break
    return meta_title, desc


if __name__ == '__main__':
    for t, th, m in [('Drywall Repair and Patching: Fixing Holes That Disappear', 'maintenance', 'US'),
                     ('Japanese Timber Frame with Gypsum Board: The Standard Wall', 'overview', 'JP')]:
        mt, md = build(t, th, m)
        print(f'{len(mt):>3} {mt}\n{len(md):>3} {md}\n')
