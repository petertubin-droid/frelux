/**
 * One building type: the room schedule, the floor and wall area it produces,
 * and the calculators that accept it. Written as a static, prerendered page so
 * a search engine and an AI agent can read the same thing a contractor reads.
 */

import { Link, useParams } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo, useBreadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  BUILDING_CATEGORY_LABELS,
  buildingTypeFloorAreaM2,
  buildingTypeProgrammeSummary,
  buildingTypeWallAreaM2,
  findBuildingTypeProgramme,
} from "@/lib/measurement/building-type-catalogue";
import AdSlot from "@/components/ui/AdSlot";
import { jsonLdScript } from "@/lib/structured-data";

const CALCULATORS = [
  { to: "/paint-calculator", label: "Paint" },
  { to: "/screeding-calculator", label: "Screeding" },
  { to: "/tile-calculator", label: "Tiles" },
  { to: "/pop-ceiling-calculator", label: "POP ceiling" },
  { to: "/finish-estimator", label: "Finishes" },
];

function round(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export default function BuildingTypeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const type = slug ? findBuildingTypeProgramme(slug) : undefined;

  useBreadcrumbJsonLd(
    type
      ? [
          { name: "Building types", path: "/building-types" },
          { name: type.label, path: `/building-types/${type.key}` },
        ]
      : [],
  );

  const floorArea = type ? buildingTypeFloorAreaM2(type) : 0;
  const wallArea = type ? buildingTypeWallAreaM2(type) : 0;

  const summary = type ? buildingTypeProgrammeSummary(type.key) : null;

  useSeo(
    type && summary
      ? {
          title: summary.title,
          description: summary.description,
          canonicalPath: `/building-types/${type.key}`,
        }
      : {
          title: "Building type not found | FRELUX",
          description:
            "The building type you asked for is not in the FRELUX library.",
          canonicalPath: "/building-types",
        },
  );

  if (!type) {
    return (
      <PageHeader
        eyebrow="Building library"
        title="Building type not found"
        subtitle="That building type is not in the library."
        backTo="/building-types"
        backLabel="All building types"
      />
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${type.label} construction estimation`,
    serviceType: `${type.label} material and cost estimation`,
    description: `${type.label} room schedule and areas, used by the FRELUX calculators to estimate paint, screeding, tiles, POP ceiling and finishing materials.`,
    provider: {
      "@type": "Organization",
      name: "FRELUX",
      url: SITE_URL,
    },
    areaServed: "Worldwide",
    url: `${SITE_URL}/building-types/${type.key}/`,
  };

  const faqs = [
    {
      q: `How big is a ${type.label.toLowerCase()}?`,
      a: `This schedule works out to about ${Math.round(floorArea)} m² of floor across ${type.rooms.reduce(
        (total, room) => total + Math.max(1, room.quantity ?? 1),
        0,
      )} spaces, with a ${round(type.wallHeightM)} m wall height. That is the reference layout: your market profile scales each space family, and you can edit every room in the calculator before estimating.`,
    },
    {
      q: `How much wall area does a ${type.label.toLowerCase()} have?`,
      a: `About ${Math.round(wallArea)} m² of gross wall area, before doors and windows are deducted. The paint and screeding calculators deduct the openings you enter room by room and apply the coverage rate for the product you select.`,
    },
    {
      q: "Do I have to use these sizes exactly?",
      a: "No. The schedule is a starting point. Load the type, then change any room's length, width, height or count, and add or remove rooms. The estimate follows your measurements.",
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqSchema) }}
      />
      <PageHeader
        eyebrow={BUILDING_CATEGORY_LABELS[type.category]}
        title={type.label}
        subtitle={`${type.description}. Room schedule with length, width and height, and the floor and wall area the building produces.`}
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Building types", path: "/building-types" },
          { label: type.label, path: `/building-types/${type.key}` },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Floor area", value: `${Math.round(floorArea)} m²` },
            { label: "Gross wall area", value: `${Math.round(wallArea)} m²` },
            { label: "Wall height", value: `${round(type.wallHeightM)} m` },
            {
              label: "Room types",
              value: `${type.rooms.length}`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4"
            >
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">
            Room schedule
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Reference dimensions in metres. Identical rooms are grouped, and
            every figure can be edited once the type is loaded into a
            calculator.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Room</th>
                  <th className="px-3 py-2 font-medium">Length (m)</th>
                  <th className="px-3 py-2 font-medium">Width (m)</th>
                  <th className="px-3 py-2 font-medium">Height (m)</th>
                  <th className="px-3 py-2 font-medium">Count</th>
                  <th className="px-3 py-2 font-medium">Floor (m²)</th>
                  <th className="px-3 py-2 font-medium">Wall (m²)</th>
                </tr>
              </thead>
              <tbody>
                {type.rooms.map((room, index) => {
                  const count = Math.max(1, room.quantity ?? 1);
                  return (
                    <tr
                      key={`${room.label}-${index}`}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2 text-foreground">
                        {room.label}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {round(room.l)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {round(room.w)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {round(type.wallHeightM)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {count}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {round(room.l * room.w * count)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {round(
                          2 * (room.l + room.w) * type.wallHeightM * count,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">
            Estimate a {type.label.toLowerCase()}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Pick a calculator, then select {type.label} as the building type.
            The schedule above loads as editable rooms, and the deterministic
            engine does the rest: quantities, coverage, waste and current market
            prices.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {CALCULATORS.map((calc) => (
              <Link
                key={calc.to}
                to={calc.to}
                className="rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-muted"
              >
                {calc.label} calculator
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">
            {type.label} questions
          </h2>
          <dl className="mt-4 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="font-medium text-foreground">{faq.q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="mt-10 text-sm">
          <Link
            to="/building-types"
            className="text-foreground underline underline-offset-2"
          >
            All building types
          </Link>
        </nav>
        <AdSlot slotKey="learn_category_mid" className="mt-8" />
      </div>
    </>
  );
}
