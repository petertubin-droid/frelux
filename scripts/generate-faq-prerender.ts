/**
 * Emits the prerender payload for the FAQ hub and every FAQ article.
 *
 * The article pages are the site's answer surface: one page per FAQ group, each
 * a long form body under each one. Before this generator they were rendered by
 * React only, so a crawler that does not execute JavaScript saw an empty shell,
 * and a crawler that does not execute JavaScript is most of them. This writes
 * the same content as static HTML plus FAQPage and BreadcrumbList data, so the
 * page a crawler reads is the page a reader gets.
 *
 * Run: npm run faqs:prerender  (wired into the build before prerender.mjs)
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { ALL_FAQ_ARTICLES } from "@/config/faq-articles";
import {
  longFormFor,
  mergedArticle,
  mergedQuestions,
} from "@/config/faq-longform";
import { faqSeoFor } from "@/config/faq-seo";
import { FAQ_CATEGORIES, TOOL_FAQS } from "@/config/tool-faqs";
import { SITE_URL } from "./lib/site-url.mjs";

type PrerenderRoute = {
  path: string;
  title: string;
  description: string;
  content: string;
  structuredData: Record<string, unknown>[];
};

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const trail = (path: string) =>
  path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;

const groups = TOOL_FAQS.filter((group) => ALL_FAQ_ARTICLES[group.slug]);

/** Path -> that path's own questions, so a page never inherits another page's markup. */
const questionsByPath: Record<string, { q: string; a: string }[]> = {};

const routes: PrerenderRoute[] = groups.map((group) => {
  const article = mergedArticle(group.slug, ALL_FAQ_ARTICLES[group.slug]);
  const questions = mergedQuestions(group.slug, group.questions);
  questionsByPath[`/faq/${group.slug}`] = questions;
  questionsByPath[group.route] = questions;
  const seo = faqSeoFor(
    {
      slug: group.slug,
      name: group.name,
      route: group.route,
      category: group.category,
    },
    article,
  );
  const worked = longFormFor(group.slug)?.worked ?? article.worked ?? "";
  const categoryLabel =
    FAQ_CATEGORIES.find((category) => category.id === group.category)?.label ??
    "Construction";

  const content = [
    `<h1>${esc(group.name)}</h1>`,
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/faq/">Questions and Answers</a> &rsaquo; ${esc(group.name)}</nav>`,
    `<p>${esc(article.summary)}</p>`,
    `<p>${esc(categoryLabel)}. ${questions.length} questions answered below, each with the arithmetic behind it and the limits of what the tool decides. <a href="${trail(group.route)}">Open the ${esc(group.name)} tool</a>.</p>`,
    `<h2>What it is</h2><p>${esc(article.description)}</p>`,
    `<h2>What it calculates</h2><ul>${article.functions.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`,
    worked ? `<h2>A worked example</h2><p>${esc(worked)}</p>` : "",
    `<h2>Why contractors use it</h2><ul>${article.advantages.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`,
    `<h2>What it leaves out</h2><ul>${article.limits.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`,
    `<h2>Frequently asked questions</h2>`,
    questions
      .map((question) => `<h3>${esc(question.q)}</h3><p>${esc(question.a)}</p>`)
      .join(""),
    `<h2>Keep reading</h2><ul>`,
    `<li><a href="${trail(group.route)}">${esc(group.name)}</a>: run the calculation on your own measurements.</li>`,
    `<li><a href="/faq/">Every construction question FRELUX answers</a>: all ${groups.length} answer pages by trade.</li>`,
    `<li><a href="/calculators/">All FRELUX calculators</a>: the full tool list.</li>`,
    `</ul>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    path: `/faq/${group.slug}`,
    title: seo.title,
    description: seo.description,
    content,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${SITE_URL}${trail(`/faq/${group.slug}`)}#faq`,
        url: `${SITE_URL}${trail(`/faq/${group.slug}`)}`,
        name: seo.title,
        inLanguage: "en",
        mainEntity: questions.map((question) => ({
          "@type": "Question",
          name: question.q,
          acceptedAnswer: { "@type": "Answer", text: question.a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Questions and Answers",
            item: `${SITE_URL}/faq/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: group.name,
            item: `${SITE_URL}${trail(`/faq/${group.slug}`)}`,
          },
        ],
      },
    ],
  };
});

const totalQuestions = groups.reduce(
  (sum, group) => sum + mergedQuestions(group.slug, group.questions).length,
  0,
);

const hubContent = [
  `<h1>Construction Questions, Answered</h1>`,
  `<nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; Questions and Answers</nav>`,
  `<p>${totalQuestions} answers across ${groups.length} tools: what each calculator decides, what it deliberately leaves out, and how to check the numbers it gives you.</p>`,
  ...FAQ_CATEGORIES.map((category) => {
    const inCategory = routes.filter((route) =>
      groups.some(
        (group) =>
          group.category === category.id && route.path === `/faq/${group.slug}`,
      ),
    );
    if (!inCategory.length) return "";
    return `<h2>${esc(category.label)}</h2><ul>${inCategory
      .map(
        (route) =>
          `<li><a href="${trail(route.path)}">${esc(route.title)}</a>: ${esc(route.description)}</li>`,
      )
      .join("")}</ul>`;
  }),
  `<p><a href="/calculators/">All FRELUX calculators</a> &middot; <a href="/construction-tools">Construction tools</a> &middot; <a href="/learn">Learn hub</a></p>`,
]
  .filter(Boolean)
  .join("\n");

routes.push({
  path: "/faq",
  title: "Construction and Material Questions, Answered | FRELUX SMART CALC",
  description:
    "Every construction question FRELUX answers, by trade: how each calculator works, the arithmetic behind the quantity, and what it refuses to assume.",
  content: hubContent,
  structuredData: [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: `${SITE_URL}/faq/`,
      name: "Construction Questions, Answered",
      inLanguage: "en",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: routes.length - 1,
        itemListElement: routes
          .filter((route) => route.path !== "/faq")
          .map((route, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: route.title,
            url: `${SITE_URL}${trail(route.path)}`,
          })),
      },
    },
  ],
});

const schemaPath = join("scripts", "generated", "faq-schema.mjs");
writeFileSync(
  schemaPath,
  `// GENERATED FILE - do not edit. Regenerate with: npm run faqs:prerender
export const faqSchemaByPath = ${JSON.stringify(questionsByPath, null, 2)};
`,
);

const outPath = join("scripts", "generated", "faq-prerender.mjs");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `// GENERATED FILE - do not edit. Regenerate with: npm run faqs:prerender
export const faqPrerenderRoutes = ${JSON.stringify(routes, null, 2)};
`,
);
console.log(
  `faq prerender: ${routes.length} routes, ${totalQuestions} questions -> ${outPath}`,
);
console.log(
  `faq schema: ${Object.keys(questionsByPath).length} paths -> ${schemaPath}`,
);
