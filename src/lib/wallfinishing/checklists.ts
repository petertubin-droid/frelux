// =========================================================
// FRELUX Wall Finishing - quality-control checklists.
//
// Every layer carries a finishing checklist with the workflow
// status: Not Started → In Progress → Inspection → Approved →
// Rework → Completed.
// =========================================================

import type {
  QCStatus,
  QCItem,
  QualityChecklist,
  WallLayerTemplate,
} from "@/types/wallfinishing";

/** Per-category checklist items (starting templates). */
const CHECKLIST_BY_CATEGORY: Record<string, QCItem["label"][]> = {
  base: [
    "Surface clean and dampened",
    "Correct thickness achieved",
    "Level and plumb checked",
    "Cracks checked after setting",
    "Adequate curing/drying time observed",
    "Ready for the next layer",
  ],
  skim: [
    "Surface smooth and free of ridges",
    "Pinholes filled",
    "Sanded to paint standard",
    "No visible trowel marks",
    "Fully dry before primer",
  ],
  sand: [
    "Dust removed after sanding",
    "No sanding scratches",
    "Edges and corners smooth",
  ],
  primer: [
    "Surface dry before priming",
    "Correct primer selected for the surface",
    "Full coverage, no missed areas",
    "Dried per manufacturer before topcoat",
  ],
  finish: [
    "Correct number of coats applied",
    "Uniform coverage and colour",
    "No runs or sags",
    "No roller or brush marks",
    "Edges and cut-ins clean",
    "Final inspection passed",
  ],
  prep: [
    "Joints fully taped",
    "No gaps or voids behind tape",
    "Fastener heads covered",
  ],
};

/** Task-level default status - everything starts "not-started". */
export function buildChecklist(layer: WallLayerTemplate): QualityChecklist {
  const labels = CHECKLIST_BY_CATEGORY[layer.category] ?? [
    "Work executed per specification",
    "Ready for the next layer",
  ];
  return {
    layerTemplateId: layer.id,
    layerName: layer.name,
    items: labels.map((label, i) => ({
      id: `${layer.id}-qc-${i}`,
      label,
      status: "not-started" as QCStatus,
    })),
  };
}

export const QC_STATUS_LABELS: Record<QCStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  inspection: "Inspection",
  approved: "Approved",
  rework: "Rework Required",
  completed: "Completed",
};
