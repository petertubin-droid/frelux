/**
 * Building types hub: every building the FRELUX calculators understand,
 * grouped by category. Each type links to its own indexable page so a
 * contractor, engineer or artisan can find their building in a search
 * engine, read the room schedule, and open the right calculator.
 */

import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo, SITE_URL } from "@/lib/seo";
import {
  BUILDING_TYPE_CATALOGUE,
  BUILDING_CATEGORY_LABELS,
  buildingTypeFloorAreaM2,
  type BuildingCategory,
} from "@/lib/measurement/building-type-catalogue";

const CATEGORY_ORDER: BuildingCategory[] = [
  "residential",
  "commercial",
  "hospitality",
  "institutional",
  "industrial",
];

const CATEGORY_INTRO: Record<BuildingCategory, string> = {
  residential:
    "Houses and flats from a single room studio to a six bedroom mansion, including bungalows, duplexes, terraces, townhouses and apartments.",
  commercial:
    "Shops, supermarkets, showrooms, pharmacies, offices and mixed use blocks measured the way a fit out is actually priced.",
  hospitality:
    "Guest houses, hotels, restaurants, bars and event halls, with kitchens, service areas and public toilets in the schedule.",
  institutional:
    "Schools, laboratories, libraries, clinics, hospital wards, hostels, community halls and places of worship.",
  industrial:
    "Warehouses, workshops, factory sheds, cold stores and poultry pens, including the offices and stores that sit beside them.",
};

const FAQS = [
  {
    q: "What is a FRELUX building type?",
    a: "A building type is a room schedule: every room with its own length, width, height, door count, window count and number of identical copies. Loading one into a calculator fills the room inputs, and you edit any measurement before estimating.",
  },
  {
    q: "Are the room sizes the same in every country?",
    a: "No. Each building type is defined once in reference metres and scaled per market, because a three bedroom bungalow in Lagos and one in Leeds are not built to the same dimensions. The page shows the reference schedule, and the calculator applies your selected market.",
  },
  {
    q: "Which calculators use these building types?",
    a: "The paint, screeding, tile, POP ceiling, mineral stone and stucco calculators all accept a building type. The template supplies measurement only: quantities, coverage, waste and prices still come from the deterministic engine, so the same rules apply as a hand entered room.",
  },
];

export default function BuildingTypes() {
  useSeo({
    title: "Building Types: Room Schedules, Floor and Wall Areas | FRELUX",
    description:
      "Every building type the FRELUX construction calculators understand, from studio flats and bungalows to supermarkets, hospitals and warehouses. Each type lists its room schedule with length, width, height and the floor and wall area it produces.",
    canonicalPath: "/building-types",
  });

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: BUILDING_CATEGORY_LABELS[category],
    intro: CATEGORY_INTRO[category],
    types: BUILDING_TYPE_CATALOGUE.filter((t) => t.category === category),
  })).filter((group) => group.types.length > 0);

  const itemList = {
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <PageHeader
        eyebrow="Building library"
        title="Building types"
        subtitle="Room schedules for residential, commercial and industrial buildings. Pick a type, check the rooms, then estimate paint, screeding, tiles, POP ceiling or finishes for that building."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Building types", path: "/building-types" },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="max-w-3xl text-muted-foreground">
          {BUILDING_TYPE_CATALOGUE.length} building types are defined here. Each
          one carries a full room schedule with length, width, height and
          counts, so the calculators measure walls and floors the way the
          building is actually laid out, not from one guessed area figure. Sizes
          scale to the market you select, because construction dimensions differ
          by country.
        </p>

        <nav
          aria-label="Building categories"
          className="mt-6 flex flex-wrap gap-2"
        >
          {groups.map((group) => (
            <a
              key={group.category}
              href={`#${group.category}`}
              className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-muted"
            >
              {group.label} ({group.types.length})
            </a>
          ))}
        </nav>

        {groups.map((group) => (
          <section key={group.category} id={group.category} className="mt-10">
            <h2 className="text-xl font-semibold text-foreground">
              {group.label}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {group.intro}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.types.map((type) => (
                <li key={type.key}>
                  <Link
                    to={`/building-types/${type.key}`}
                    className="block h-full rounded-xl border border-border bg-card p-4 hover:border-brand-purple"
                  >
                    <p className="font-semibold text-foreground">
                      {type.label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {type.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {type.rooms.length} room types ·{" "}
                      {Math.round(buildingTypeFloorAreaM2(type))} m² floor
                      {type.bedrooms > 0 ? ` · ${type.bedrooms} bedrooms` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">
            Questions about building types
          </h2>
          <dl className="mt-4 space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="font-medium text-foreground">{faq.q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Estimate this building
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open any calculator and choose a building type in the measurement
            step. The room schedule loads with your dimensions.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {[
              { to: "/paint-calculator", label: "Paint calculator" },
              { to: "/screeding-calculator", label: "Screeding calculator" },
              { to: "/tile-calculator", label: "Tile calculator" },
              {
                to: "/pop-ceiling-calculator",
                label: "POP ceiling calculator",
              },
              { to: "/finish-estimator", label: "Finish estimator" },
              { to: "/calculators", label: "All calculators" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-card"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
