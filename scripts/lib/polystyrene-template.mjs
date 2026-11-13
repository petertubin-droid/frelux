// Polystyrene ceiling take-off for the served template pages.
//
// The board ceiling templates cannot be served from material roles the way a
// paint or tile template is: a board's coverage fixes every dependent quantity,
// so the page has to show boards, seams, tape, adhesive and fixings, not a
// cement and sand list. The arithmetic below mirrors
// src/lib/polystyrene-ceiling.ts exactly; src/lib/polystyrene-template-parity
// .test.ts runs both across every design, board size and installation method
// and fails if they ever disagree.
//
// No prices here. A board's price is the visitor's, entered against their own
// supplier, so the page publishes quantities and the market's stored prices for
// the materials the book does hold (joint filler, paint, abrasive).

export const PS_ROLE_FAMILY = "polystyrene";

const BOARDS = {
  "1200x2400": { areaM2: 2.88, label: "1.2 m x 2.4 m (4 ft x 8 ft)" },
  "1200x3000": { areaM2: 3.6, label: "1.2 m x 3.0 m (4 ft x 10 ft)" },
};

const WASTE_BY_DESIGN = { flat: 10, stepped: 15, coffered: 20, curved: 25 };

const DESIGN_LABELS = {
  flat: "Flat ceiling",
  stepped: "Tray / stepped design",
  coffered: "Coffered or panelled",
  curved: "Curved or circular",
};

const INSTALLATION_LABELS = {
  bonded: "Direct bonding to concrete slab",
  timber: "Timber noggin under roof trusses",
  metal: "Metal channel grid",
  wire: "Wire-suspended drop",
};

const FEET_PER_METRE = 3.28084;

const FRAME_CENTRES_M = 0.6;
const FRAME_LM_PER_M2 = 2 / FRAME_CENTRES_M;
const ADHESIVE_M2_PER_CAN = 10;
const ADHESIVE_M2_PER_CAN_FRAMED = 25;
const SCREWS_PER_M2 = FRAME_LM_PER_M2 / 0.2;
const NAILS_PER_M2 = FRAME_LM_PER_M2 * (1 / FRAME_CENTRES_M);
const HANGERS_PER_M2 = 1 / (1.2 * 1.2);
const WIRE_KG_PER_HANGER = 0.03;
const TAPE_LAP = 1.1;
const TAPE_ROLL_M = 45;
const PUTTY_KG_PER_M2 = 0.5;
const PUTTY_BAG_KG = 25;
const SANDPAPER_M2_PER_SHEET = 8;
const PAINT_L_PER_M2 = 0.2;
const PAINT_CAN_L = 20;
const FRAME_STOCK_M = 3.6;
const CORNICE_LENGTH_M = 2.4;

const EPSILON = 1e-9;
const ceilPacks = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value - EPSILON);
};
const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;

const toMetres = (value, unit) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return unit === "feet" ? (n / FEET_PER_METRE) * 1 : n;
};

/**
 * @param {Record<string, unknown>} inputs template inputs, canonical metric
 * @returns {object} every quantity the page prints
 */
export function polystyreneTakeoff(inputs = {}) {
  const storedUnit = inputs.unit === "feet" ? "feet" : "meters";
  const lengthM = Math.max(0, toMetres(inputs.length, storedUnit));
  const widthM = Math.max(0, toMetres(inputs.width, storedUnit));
  const includeDrops = Boolean(inputs.includeDrops);
  const design = WASTE_BY_DESIGN[inputs.design] ? inputs.design : "flat";
  const boardSize = BOARDS[inputs.boardSize] ? inputs.boardSize : "1200x2400";
  const board = BOARDS[boardSize];
  const installation = INSTALLATION_LABELS[inputs.installation]
    ? inputs.installation
    : "bonded";

  const flatAreaM2 = round3(lengthM * widthM);
  const perimeterM = round3(2 * (lengthM + widthM));
  const dropHeightM = includeDrops ? Math.max(0, Number(inputs.dropHeight) || 0) : 0;
  const dropRunM = includeDrops
    ? Math.max(0, Number(inputs.dropRun) || 0) || perimeterM
    : 0;
  const dropAreaM2 = round3(dropHeightM * dropRunM);
  const surfaceM2 = round3(flatAreaM2 + dropAreaM2);

  const wastePct =
    typeof inputs.wastePctOverride === "number" && inputs.wastePctOverride >= 0
      ? inputs.wastePctOverride
      : WASTE_BY_DESIGN[design];
  const boardsRequired = ceilPacks(
    (surfaceM2 + (surfaceM2 * wastePct) / 100) / board.areaM2,
  );

  const seamDensity = 1 / 1.2 + 1 / (boardSize === "1200x3000" ? 3 : 2.4);
  const seamLengthM = round3(surfaceM2 * seamDensity);
  const edgeSeamM = surfaceM2 > 0 ? perimeterM : 0;
  const reinforcedSeamM = round3(seamLengthM + edgeSeamM);

  const framed = ["timber", "metal", "wire"].includes(installation);
  const suspended = ["metal", "wire"].includes(installation);

  const adhesiveCans = ceilPacks(
    surfaceM2 / (framed ? ADHESIVE_M2_PER_CAN_FRAMED : ADHESIVE_M2_PER_CAN),
  );
  const tapeRolls = ceilPacks((reinforcedSeamM * TAPE_LAP) / TAPE_ROLL_M);
  const puttyKg = surfaceM2 * PUTTY_KG_PER_M2;
  const puttyBags = ceilPacks(puttyKg / PUTTY_BAG_KG);
  const sandpaperSheets = ceilPacks(surfaceM2 / SANDPAPER_M2_PER_SHEET);
  const paintCans = inputs.includePaint
    ? ceilPacks((surfaceM2 * PAINT_L_PER_M2) / PAINT_CAN_L)
    : 0;
  const corniceLengths = inputs.includeCornice
    ? ceilPacks(perimeterM / CORNICE_LENGTH_M)
    : 0;
  const frameLm = framed ? surfaceM2 * FRAME_LM_PER_M2 : 0;
  const frameLengths = ceilPacks(frameLm / FRAME_STOCK_M);
  const screws = framed ? ceilPacks(surfaceM2 * SCREWS_PER_M2) : 0;
  const nails = installation === "timber" ? ceilPacks(surfaceM2 * NAILS_PER_M2) : 0;
  const hangers = suspended ? ceilPacks(surfaceM2 * HANGERS_PER_M2) : 0;
  const wireKg = round2(hangers * WIRE_KG_PER_HANGER);

  return {
    lengthM,
    widthM,
    flatAreaM2,
    dropAreaM2,
    surfaceM2,
    perimeterM,
    wastePct,
    design,
    designLabel: DESIGN_LABELS[design],
    boardSize,
    boardLabel: board.label,
    boardAreaM2: board.areaM2,
    boardsRequired,
    installation,
    installationLabel: INSTALLATION_LABELS[installation],
    thickness: Number(inputs.thickness) || 25,
    seamLengthM,
    edgeSeamM,
    reinforcedSeamM,
    adhesiveCans,
    tapeRolls,
    puttyKg: round2(puttyKg),
    puttyBags,
    sandpaperSheets,
    paintCans,
    corniceLengths,
    frameLengths,
    screws,
    nails,
    hangers,
    wireKg,
    includeCornice: Boolean(inputs.includeCornice),
    includePaint: Boolean(inputs.includePaint),
  };
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const num = (value) => String(round2(Number(value) || 0));

/** The take-off table: quantities only, because prices are the visitor's. */
export function renderPolystyreneTakeoff(template) {
  const t = polystyreneTakeoff(template?.inputs ?? {});
  if (t.surfaceM2 <= 0) return "";
  const rows = [
    [
      `${t.thickness} mm polystyrene boards, ${t.boardLabel}`,
      `${t.boardsRequired}`,
      `board${t.boardsRequired === 1 ? "" : "s"}`,
      `Measured ${num(t.surfaceM2)} m² plus ${t.wastePct}% wastage at ${t.boardAreaM2} m² a board`,
    ],
    [
      "Polyurethane foam adhesive",
      `${t.adhesiveCans}`,
      "750 ml cans",
      t.frameLengths > 0 ? "Spot-bonded to the frame" : "Beaded to the slab",
    ],
    [
      "Fibre mesh tape or soaked filas",
      num(t.reinforcedSeamM),
      "m",
      `${num(t.seamLengthM)} m of board seam plus ${num(t.edgeSeamM)} m of wall edge, in ${t.tapeRolls} roll${t.tapeRolls === 1 ? "" : "s"} of 45 m`,
    ],
    [
      "POP screeding putty",
      num(t.puttyKg),
      "kg",
      `${t.puttyBags} bag${t.puttyBags === 1 ? "" : "s"} of 25 kg to skim every seam and fixing`,
    ],
  ];
  if (t.frameLengths > 0) {
    rows.push([
      t.installation === "metal"
        ? "Galvanised metal channels"
        : "Treated timber battens and noggins",
      num(t.frameLengths),
      "lengths",
      "3.6 m lengths at 600 mm centres, both directions",
    ]);
  }
  if (t.screws > 0)
    rows.push(["Drywall screws", `${t.screws}`, "pcs", "200 mm along every run"]);
  if (t.nails > 0)
    rows.push([
      "Concrete nails",
      `${t.nails}`,
      "pcs",
      "Fixing the battens to the trusses above",
    ]);
  if (t.hangers > 0)
    rows.push([
      "Galvanised wire hangers",
      `${t.hangers}`,
      "pcs",
      "One per 1.2 m grid of suspended area",
    ]);
  if (t.wireKg > 0)
    rows.push(["Galvanised binding wire", num(t.wireKg), "kg", "Tying the hangers"]);
  if (t.includeCornice)
    rows.push([
      "Polystyrene cornice / coving",
      num(t.perimeterM),
      "m",
      `${t.corniceLengths} length${t.corniceLengths === 1 ? "" : "s"} of 2.4 m around the room`,
    ]);
  rows.push([
    "Fine abrasive, 120-180 grit",
    `${t.sandpaperSheets}`,
    "sheets",
    "Sanding the filled seams before painting",
  ]);
  if (t.includePaint)
    rows.push([
      "Water-based emulsion or satin",
      num(t.surfaceM2 * PAINT_L_PER_M2),
      "litres",
      `${t.paintCans} can${t.paintCans === 1 ? "" : "s"} of 20 L for two coats. Never solvent or oil-based paint`,
    ]);

  return (
    `<h2>The board take-off this template produces</h2>` +
    `<p>Quantities come from the measured surface and the board geometry, not from a rate per square metre: one ${t.boardLabel} board carries ${num(1 / 1.2 + 1 / (t.boardSize === "1200x3000" ? 3 : 2.4))} m of seam per square metre, so the tape, adhesive and fixing quantities follow the board rather than the room.</p>` +
    `<table><caption>${t.designLabel}, ${t.installationLabel.toLowerCase()}</caption>` +
    `<thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Unit</th><th scope="col">How it is worked out</th></tr></thead><tbody>` +
    rows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td><td>${escapeHtml(row[3])}</td></tr>`,
      )
      .join("") +
    `</tbody></table>` +
    `<p>The calculator repeats this take-off from your own measurements and adds your supplier's unit prices. Board prices are entered by you, because a board's price moves with the size and thickness the site stocks, and no stored price book can keep up with it.</p>`
  );
}

/** What a board ceiling consumes, in prose, for the materials section. */
export function renderPolystyreneMaterials() {
  return (
    `<h2>Materials this scope consumes</h2>` +
    `<p>A board ceiling is a short list, and none of it is mixed on site:</p>` +
    `<ul><li>Expanded polystyrene ceiling boards, 20 mm to 30 mm</li>` +
    `<li>Polyurethane foam adhesive, or a POP cement and soaked fibre slurry on a slab</li>` +
    `<li>Fibre mesh tape or soaked filas for every seam and the wall edge</li>` +
    `<li>POP screeding putty, sanded back over the tape and the fixings</li>` +
    `<li>Treated timber battens or galvanised channels, with screws, nails or hangers, only where the ceiling is framed or suspended</li>` +
    `<li>Polystyrene cornice, and water-based emulsion for two coats</li></ul>` +
    `<p>No cement, sand or aggregate is consumed by the ceiling itself unless a tray or cove is being bedded in on site.</p>`
  );
}
