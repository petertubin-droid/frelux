import { useState } from "react";
import {
  Printer,
  FileSpreadsheet,
  CalendarDays,
  ClipboardList,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import AdSlot from "@/components/ui/AdSlot";
import { useSeo } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";

/**
 * Free printable project sheets (stand-out item 5).
 *
 * Each sheet is print-optimised: clicking Print sets
 * data-printing on <body>, and print CSS hides everything except
 * the chosen sheet. Save as PDF via the browser print dialog.
 */

interface SheetDef {
  id: string;
  icon: typeof FileSpreadsheet;
  title: string;
  blurb: string;
}

const SHEETS: SheetDef[] = [
  {
    id: "quote-comparison",
    icon: FileSpreadsheet,
    title: "Quote Comparison Sheet",
    blurb:
      "Put three contractor quotes side by side on the same line items so the real differences jump out.",
  },
  {
    id: "paint-schedule",
    icon: CalendarDays,
    title: "Paint Project Schedule",
    blurb:
      "Plan each surface, finish, and coat on a timeline so rooms dry and cure in the right order.",
  },
  {
    id: "material-checklist",
    icon: ClipboardList,
    title: "Material Shopping Checklist",
    blurb:
      "Quantities from any FRELUX calculator, one checklist to take to the supplier, with space to fill prices.",
  },
];

function printSheet(id: string) {
  document.body.dataset.printing = id;
  window.print();
  const cleanup = () => {
    delete document.body.dataset.printing;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
}

const LINES_12 = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Printables() {
  useSeo({
    title: "Free Printable Templates: Quotes, Schedules & Checklists",
    description:
      "Free, print-ready project sheets from FRELUX: a quote comparison sheet, a paint project schedule, and a material shopping checklist. Print or save as PDF.",
    canonicalPath: "/printables",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "FRELUX Free Printable Templates",
      url: `${SITE_URL}/printables`,
    },
  });

  const [preview, setPreview] = useState<string | null>(null);
  const active = SHEETS.find((s) => s.id === preview);

  return (
    <>
      <PageHeader
        eyebrow="Free Tools"
        title="Printable Project Templates"
        subtitle="Three free, print-ready sheets for your next paint or build project. Fill them in on paper, or save them as PDF."
        breadcrumbs={[{ label: "Free Templates" }]}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SHEETS.map((sheet) => {
            const Icon = sheet.icon;
            return (
              <div
                key={sheet.id}
                className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm dark:border-white/5 dark:bg-card"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-brand-purple" />
                </div>
                <h2 className="font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {sheet.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-muted-foreground dark:text-muted-foreground">
                  {sheet.blurb}
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => printSheet(sheet.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button
                    onClick={() => setPreview(sheet.id)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-purple/40 dark:border-white/10 dark:text-primary-foreground"
                    aria-label={`Preview ${sheet.title}`}
                  >
                    Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
          In the print dialog choose your printer, or select "Save as PDF" to
          keep a digital copy. Each sheet prints on a single A4 page.
        </p>

        <div className="mt-10">
          <AdSlot slotKey="home_bottom" />
        </div>
      </div>

      {/* PREVIEW DIALOG (screen only) */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${active.title}`}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-background p-4 shadow-2xl dark:text-primary-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <h3 className="font-display text-sm font-bold">{active.title}</h3>
              <button
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted dark:border-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {sheetBody(active.id)}
            </div>
            <div className="px-1 pt-4">
              <button
                onClick={() => printSheet(active.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Printer className="h-4 w-4" /> Print this sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY SHEETS: each prints alone when chosen */}
      <div className="hidden print:block">
        {SHEETS.map((s) => (
          <div key={s.id} data-sheet={s.id}>
            {sheetBody(s.id)}
          </div>
        ))}
      </div>
    </>
  );
}

function sheetBody(id: string) {
  if (id === "quote-comparison") return <QuoteComparison />;
  if (id === "paint-schedule") return <PaintSchedule />;
  return <MaterialChecklist />;
}

function SheetHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="border-b-2 border-gray-800 pb-3">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <span className="text-xs font-semibold text-gray-500">
          A free template from FRELUX · freluxtools.com
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-28 shrink-0 text-xs font-semibold">{label}</span>
      <span className="flex-1 border-b border-dotted border-gray-400" />
    </div>
  );
}

function QuoteComparison() {
  return (
    <div className="bg-white p-8 text-black">
      <SheetHeader
        title="Quote Comparison Sheet"
        hint="Use identical line items for every quote so the totals are genuinely comparable."
      />
      <div className="mt-4 grid grid-cols-3 gap-6">
        <Field label="Project:" />
        <Field label="Date:" />
        <Field label="By:" />
      </div>
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-8 border border-gray-300 p-2 text-left">S/N</th>
            <th className="border border-gray-300 p-2 text-left">
              Item / scope of work
            </th>
            <th className="border border-gray-300 p-2">Quote A (contractor)</th>
            <th className="border border-gray-300 p-2">Quote B (contractor)</th>
            <th className="border border-gray-300 p-2">Quote C (contractor)</th>
          </tr>
        </thead>
        <tbody>
          {LINES_12.map((n) => (
            <tr key={n}>
              <td className="border border-gray-300 p-2">{n}</td>
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="border border-gray-300 p-2 font-bold">
              Materials total
            </td>
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
          </tr>
          <tr>
            <td colSpan={2} className="border border-gray-300 p-2 font-bold">
              Labour total
            </td>
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
          </tr>
          <tr>
            <td colSpan={2} className="border border-gray-300 p-2 font-bold">
              GRAND TOTAL
            </td>
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
            <td className="border border-gray-300 p-2" />
          </tr>
        </tbody>
      </table>
      <div className="mt-4 grid grid-cols-3 gap-6 text-xs">
        <div className="border border-gray-300 p-2">
          <span className="font-semibold">Quote A terms:</span> validity,
          payment stages, warranty
        </div>
        <div className="border border-gray-300 p-2">
          <span className="font-semibold">Quote B terms:</span> validity,
          payment stages, warranty
        </div>
        <div className="border border-gray-300 p-2">
          <span className="font-semibold">Quote C terms:</span> validity,
          payment stages, warranty
        </div>
      </div>
    </div>
  );
}

function PaintSchedule() {
  return (
    <div className="bg-white p-8 text-black">
      <SheetHeader
        title="Paint Project Schedule"
        hint="Work top down: ceilings first, then walls, then trim. Respect drying and curing times between coats."
      />
      <div className="mt-4 grid grid-cols-3 gap-6">
        <Field label="Project:" />
        <Field label="Start date:" />
        <Field label="Finish by:" />
      </div>
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-8 border border-gray-300 p-2">S/N</th>
            <th className="border border-gray-300 p-2 text-left">
              Room / surface
            </th>
            <th className="border border-gray-300 p-2 text-left">
              Colour &amp; finish
            </th>
            <th className="border border-gray-300 p-2">Coats</th>
            <th className="border border-gray-300 p-2">Planned date</th>
            <th className="border border-gray-300 p-2">Done ✓</th>
          </tr>
        </thead>
        <tbody>
          {LINES_12.map((n) => (
            <tr key={n}>
              <td className="border border-gray-300 p-2">{n}</td>
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-xs">
        <p className="font-semibold">Reminder notes:</p>
        <ul className="mt-1 list-inside list-disc text-gray-600">
          <li>Repair and sand before any primer touches the wall.</li>
          <li>Primer needs its full drying time, not just touch-dry.</li>
          <li>Keep a wet edge while rolling to avoid lap marks.</li>
          <li>Leave full cure time before washing or placing furniture.</li>
        </ul>
      </div>
    </div>
  );
}

function MaterialChecklist() {
  return (
    <div className="bg-white p-8 text-black">
      <SheetHeader
        title="Material Shopping Checklist"
        hint="Copy quantities from your FRELUX calculator result, then fill the price columns at the supplier."
      />
      <div className="mt-4 grid grid-cols-3 gap-6">
        <Field label="Project:" />
        <Field label="Supplier:" />
        <Field label="Date:" />
      </div>
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-8 border border-gray-300 p-2">✓</th>
            <th className="border border-gray-300 p-2 text-left">Material</th>
            <th className="border border-gray-300 p-2 text-left">
              Specification / colour
            </th>
            <th className="border border-gray-300 p-2">Quantity</th>
            <th className="border border-gray-300 p-2">Unit price</th>
            <th className="border border-gray-300 p-2">Line total</th>
          </tr>
        </thead>
        <tbody>
          {LINES_12.map((n) => (
            <tr key={n}>
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
              <td className="border border-gray-300 p-2" />
            </tr>
          ))}
          <tr>
            <td colSpan={5} className="border border-gray-300 p-2 font-bold">
              TOTAL SPEND
            </td>
            <td className="border border-gray-300 p-2" />
          </tr>
        </tbody>
      </table>
      <div className="mt-4 text-xs text-gray-600">
        Tip: add a five to ten percent wastage allowance to every quantity
        before you shop. It beats driving back for one more bucket.
      </div>
    </div>
  );
}
