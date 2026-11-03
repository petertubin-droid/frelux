/**
 * Emits the prerender payload for the building type library: the hub and one
 * page per building type. Runs before vite build, so the payload is committed
 * to scripts/generated/building-types.mjs and imported by prerender.mjs.
 *
 * Run: npm run buildings:prerender
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import {
  BUILDING_TYPE_CATALOGUE,
  BUILDING_CATEGORY_LABELS,
  buildingTypeFloorAreaM2,
  buildingTypeProgrammeSummary,
  buildingTypeWallAreaM2,
} from "../src/lib/measurement/building-type-catalogue";
import { SITE_URL } from "./lib/site-url.mjs";

const round = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "0";

const roomRows = (type: (typeof BUILDING_TYPE_CATALOGUE)[number]): string =>
  type.rooms
    .map((room) => {
      const count = Math.max(1, room.quantity ?? 1);
      const floor = room.l * room.w * count;
      const wall = 2 * (room.l + room.w) * type.wallHeightM * count;
      return (
        "<tr>" +
        `<td>${room.label}</td>` +
        `<td>${round(room.l)}</td>` +
        `<td>${round(room.w)}</td>` +
        `<td>${round(type.wallHeightM)}</td>` +
        `<td>${count}</td>` +
        `<td>${round(floor)}</td>` +
        `<td>${round(wall)}</td>` +
        "</tr>"
      );
    })
    .join("");

const calculatorLinks = [
  ["Paint calculator", "/paint-calculator"],
  ["Screeding calculator", "/screeding-calculator"],
  ["Tile calculator", "/tile-calculator"],
  ["POP ceiling calculator", "/pop-ceiling-calculator"],
  ["Finish estimator", "/finish-estimator"],
]
  .map(([label, path]) => `<li><a href="${path}">${label}</a></li>`)
  .join("");

function typeContent(type: (typeof BUILDING_TYPE_CATALOGUE)[number]): string {
  const floorArea = buildingTypeFloorAreaM2(type);
  const wallArea = buildingTypeWallAreaM2(type);
  const spaces = type.rooms.reduce(
    (total, room) => total + Math.max(1, room.quantity ?? 1),
    0,
  );
  const faqs = [
    {
      q: `How big is a ${type.label.toLowerCase()}?`,
      a: `About ${Math.round(floorArea)} m² of floor across ${spaces} spaces with a ${round(type.wallHeightM)} m wall height. That is the reference layout; your market profile scales each space family and every room stays editable in the calculator.`,
    },
    {
      q: `How much wall area does a ${type.label.toLowerCase()} have?`,
      a: `About ${Math.round(wallArea)} m² of gross wall area before doors and windows are deducted. The paint and screeding calculators deduct the openings you enter room by room.`,
    },
    {
      q: "Do I have to use these sizes exactly?",
      a: "No. Load the type, then change any room's length, width, height or count, and add or remove rooms. The estimate follows your measurements.",
    },
  ];

  return (
    `<h1>${type.label} room sizes, floor area and wall area</h1>` +
    `<p>${type.description}. ${BUILDING_CATEGORY_LABELS[type.category]} building type with a full room schedule: length, width and height for every space, about ${Math.round(floorArea)} m² of floor and ${Math.round(wallArea)} m² of wall.</p>` +
    `<h2>Room schedule</h2>` +
    `<table><thead><tr><th>Room</th><th>Length (m)</th><th>Width (m)</th><th>Height (m)</th><th>Count</th><th>Floor (m²)</th><th>Wall (m²)</th></tr></thead><tbody>${roomRows(type)}</tbody></table>` +
    `<h2>Estimate a ${type.label.toLowerCase()}</h2>` +
    `<p>Choose a calculator and select ${type.label} as the building type. The schedule loads as editable rooms and the deterministic engine produces quantities, coverage, waste and current market prices.</p>` +
    `<ul>${calculatorLinks}</ul>` +
    `<h2>${type.label} questions</h2>` +
    faqs.map((faq) => `<h3>${faq.q}</h3><p>${faq.a}</p>`).join("") +
    `<p><a href="/building-types">All building types</a></p>`
  );
}

export const buildingTypeRoutes = [
  {
    path: "/building-types",
    title: "Building Types: Room Schedules, Floor and Wall Areas | FRELUX",
    description:
      "Every building type the FRELUX construction calculators understand, from studio flats and bungalows to supermarkets, hospitals and warehouses. Each type lists its room schedule with length, width, height and the floor and wall area it produces.",
    priority: "0.9",
    changefreq: "monthly",
    content:
      `<h1>Building types</h1>` +
      `<p>${BUILDING_TYPE_CATALOGUE.length} building types with full room schedules for residential, commercial, hospitality, institutional and industrial buildings. Each type carries length, width and height for every room, so the calculators measure walls and floors the way the building is laid out. Sizes scale to the market you select.</p>` +
      BUILDING_TYPE_CATALOGUE.map(
        (type) =>
          `<h2>${BUILDING_CATEGORY_LABELS[type.category]}</h2>` +
          `<h3><a href="/building-types/${type.key}">${type.label}</a></h3>` +
          `<p>${type.description}. ${type.rooms.length} room types, about ${Math.round(
            buildingTypeFloorAreaM2(type),
          )} m² of floor.</p>`,
      ).join(""),
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "FRELUX building types",
        numberOfItems: BUILDING_TYPE_CATALOGUE.length,
        itemListElement: BUILDING_TYPE_CATALOGUE.map((type, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: type.label,
          url: `${SITE_URL}/building-types/${type.key}/`,
        })),
      },
    ],
  },
  ...BUILDING_TYPE_CATALOGUE.map((type) => {
    const floorArea = buildingTypeFloorAreaM2(type);
    const wallArea = buildingTypeWallAreaM2(type);
    const summary = buildingTypeProgrammeSummary(type.key);
    return {
      path: `/building-types/${type.key}`,
      title: summary?.title ?? `${type.label} | FRELUX`,
      description:
        summary?.description ??
        `${type.label}: ${type.description}. Room schedule with length, width and height for each space.`,
      priority: "0.8",
      changefreq: "monthly",
      content: typeContent(type),
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${type.label} construction estimation`,
          serviceType: `${type.label} material and cost estimation`,
          description: `${type.label} room schedule and areas, used by the FRELUX calculators to estimate paint, screeding, tiles, POP ceiling and finishing materials.`,
          provider: { "@type": "Organization", name: "FRELUX", url: SITE_URL },
          areaServed: "Worldwide",
          url: `${SITE_URL}/building-types/${type.key}/`,
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `How big is a ${type.label.toLowerCase()}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `About ${Math.round(floorArea)} m² of floor with a ${round(
                  type.wallHeightM,
                )} m wall height in the reference layout.`,
              },
            },
            {
              "@type": "Question",
              name: `How much wall area does a ${type.label.toLowerCase()} have?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `About ${Math.round(
                  wallArea,
                )} m² of gross wall area before doors and windows are deducted.`,
              },
            },
          ],
        },
      ],
    };
  }),
];

const outPath = join("scripts", "generated", "building-types.mjs");
mkdirSync(dirname(outPath), { recursive: true });
const payload =
  `// GENERATED FILE - do not edit. Regenerate with: npm run buildings:prerender\n` +
  `export const buildingTypeRoutes = ${JSON.stringify(buildingTypeRoutes, null, 2)};\n`;
writeFileSync(outPath, payload);
console.log(
  `building-types prerender: ${buildingTypeRoutes.length} routes -> ${outPath}`,
);
