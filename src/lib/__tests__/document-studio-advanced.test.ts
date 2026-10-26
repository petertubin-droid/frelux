import { describe, expect, it } from "vitest";
import { validateStudioConfig } from "@/lib/document-studio";
import { exportQuoteToDocumentStudio as quoteBridge } from "@/lib/estimation/quote-export";

const baseConfig = {
  pageSize: "a4",
  orientation: "portrait",
  currency: "NGN",
  locale: "en-NG",
  accentColor: "#7C3AED",
  watermark: true,
  blocks: [
    { id: "h1", type: "heading", text: "Executive Bill of Quantities" },
    {
      id: "mat1",
      type: "materials",
      title: "Structural Components",
      rows: [
        { label: "High-yield TMT Steel 16mm", quantity: 5, unit: "tonnes", unitPrice: 1250000 },
        { label: "Dangote 42.5R Cement", quantity: 200, unit: "bags", unitPrice: 10500 },
      ],
    },
    {
      id: "pay1",
      type: "payment_schedule",
      title: "Project Milestone Disbursement",
      milestones: [
        { stage: "Mobilization & Site Prep", percentage: 30, amount: 2500000 },
        { stage: "Substructure / Foundation Completion", percentage: 40, amount: 3300000 },
        { stage: "Superstructure Handover", percentage: 30, amount: 2500000 },
      ],
    },
    {
      id: "sig1",
      type: "signature",
      title: "Authorized Signatures",
      clientName: "Anthony Jude",
      clientRole: "Managing Director",
      contractorName: "Lead QS Engineer",
      contractorRole: "Chartered Surveyor",
      date: "2026-10-26",
    },
  ],
};

describe("Document Studio Advanced Entitlements and Structures", () => {
  it("validates enterprise document with materials, payment schedule, and signatures", () => {
    const validated = validateStudioConfig(baseConfig);
    expect(validated.blocks).toHaveLength(4);
    const matBlock = validated.blocks[1] as any;
    expect(matBlock.type).toBe("materials");
    expect(matBlock.rows[0].label).toBe("High-yield TMT Steel 16mm");
    expect(matBlock.rows[0].quantity).toBe(5);
    const payBlock = validated.blocks[2] as any;
    expect(payBlock.type).toBe("payment_schedule");
    expect(payBlock.milestones[0].stage).toBe("Mobilization & Site Prep");
    expect(payBlock.milestones[0].percentage).toBe(30);
  });

  it("safely enforces boundaries on milestone percentages and material pricing", () => {
    expect(() =>
      validateStudioConfig({
        ...baseConfig,
        blocks: [{ id: "p", type: "payment_schedule", milestones: [{ stage: "Over 100", percentage: 105 }] }],
      })
    ).toThrow();

    expect(() =>
      validateStudioConfig({
        ...baseConfig,
        blocks: [{ id: "m", type: "materials", rows: [{ label: "Negative Price", quantity: 1, unit: "pcs", unitPrice: -500 }] }],
      })
    ).toThrow();
  });

  it("stages calculator quote exports safely into session storage without data leakage", () => {
    quoteBridge(
      {
        title: "Foundation Footing Estimate",
        subtitle: "Reinforced Strip Footing",
        metaRows: [["Excavation Depth", "1.2m"]],
        lines: [
          { label: "Concrete 1:2:4", quantity: "15", unit: "m³", unit_price: "45000", line_total: "675000" },
        ],
        totals: [{ label: "Total", value: "₦675,000", strong: true }],
      },
      "NGN"
    );

    const staged = JSON.parse(window.sessionStorage.getItem("frelux.document-studio.import.v1") || "{}");
    expect(staged.title).toBe("Foundation Footing Estimate");
    expect(staged.materials[0]).toMatchObject({
      label: "Concrete 1:2:4",
      quantity: 15,
      unitPrice: 45000,
    });
    window.sessionStorage.clear();
  });
});
