// =========================================================
// ARCHIE NATIVE ENGINE — TOOL ORCHESTRATION
//
// Real tool registry: typed contracts, precondition checks,
// honest failure reporting, measured durations. Includes a
// REAL built-in deterministic math evaluator (shunting-yard
// parser) so arithmetic questions are computed, not guessed.
// Tools never fake success — failures carry reasons.
// =========================================================

import type { ToolInvocation, ToolSpecInternal } from "./types.ts";

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

interface RegisteredTool {
  spec: ToolSpecInternal;
  handler: ToolHandler;
}

export class ToolOrchestrator {
  private tools = new Map<string, RegisteredTool>();

  register(spec: ToolSpecInternal, handler: ToolHandler): void {
    this.tools.set(spec.name, { spec, handler });
  }

  specs(): ToolSpecInternal[] {
    return [...this.tools.values()].map((t) => t.spec);
  }

  count(): number {
    return this.tools.size;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Dispatch with contract validation + honest errors. */
  async invoke(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolInvocation> {
    const started = Date.now();
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        tool: name,
        ok: false,
        output: null,
        error: `tool "${name}" is not registered — available: ${[...this.tools.keys()].join(", ") || "none"}`,
        durationMs: Date.now() - started,
      };
    }
    for (const [param, kind] of Object.entries(tool.spec.parameters)) {
      if (!(param in args)) {
        return {
          tool: name,
          ok: false,
          output: null,
          error: `missing required parameter "${param}" (${kind})`,
          durationMs: Date.now() - started,
        };
      }
    }
    try {
      const output = await tool.handler(args);
      return {
        tool: name,
        ok: true,
        output,
        durationMs: Date.now() - started,
      };
    } catch (err) {
      return {
        tool: name,
        ok: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      };
    }
  }
}

// ---------------------------------------------------------
// Deterministic arithmetic evaluator (shunting-yard) — the
// real math engine used for math_question intents.
// ---------------------------------------------------------
const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "^": 3,
};

export function evaluateExpression(expression: string): number {
  const tokens = expression
    .replace(/[×x]/gi, "*")
    .replace(/÷/g, "/")
    .match(/\d+(?:\.\d+)?|[-+*/%^()]/g);
  if (!tokens || tokens.length === 0) {
    throw new Error("no arithmetic tokens found in expression");
  }
  const output: string[] = [];
  const ops: string[] = [];
  let prev = "";
  for (const token of tokens) {
    if (/^[-+*/%^]$/.test(token) && (prev === "" || prev === "(")) {
      // Unary minus/plus: fold into the next number.
      output.push(token === "-" ? "0" : "0");
      ops.push(token === "-" ? "-" : "+");
    } else if (token === "(") {
      ops.push(token);
    } else if (token === ")") {
      while (ops.length > 0 && ops[ops.length - 1] !== "(") {
        output.push(ops.pop()!);
      }
      if (ops.pop() !== "(") throw new Error("unbalanced parentheses");
    } else if (/^[-+*/%^]$/.test(token)) {
      // "^" is right-associative (2^3^2 = 2^(3^2) = 512):
      // pop only strictly-greater precedence for it, >= for
      // the left-associative operators.
      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== "(" &&
        (PRECEDENCE[ops[ops.length - 1]] > PRECEDENCE[token] ||
          (PRECEDENCE[ops[ops.length - 1]] === PRECEDENCE[token] &&
            token !== "^"))
      ) {
        output.push(ops.pop()!);
      }
      ops.push(token);
    } else {
      output.push(token);
    }
    prev = token;
  }
  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op === "(") throw new Error("unbalanced parentheses");
    output.push(op);
  }
  const stack: number[] = [];
  for (const token of output) {
    if (/^[-+*/%^]$/.test(token)) {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) {
        throw new Error("malformed expression");
      }
      switch (token) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) throw new Error("division by zero");
          stack.push(a / b);
          break;
        case "%":
          stack.push(a % b);
          break;
        case "^":
          stack.push(a ** b);
          break;
      }
    } else {
      stack.push(Number(token));
    }
  }
  if (stack.length !== 1 || Number.isNaN(stack[0])) {
    throw new Error("expression did not reduce to a single number");
  }
  return stack[0];
}

/** Register the built-in tools on an orchestrator. */
// ---------------------------------------------------------
// Deterministic unit conversion — real factors, same
// dimension only, honest errors otherwise. Temperature has
// real affine formulas, not factors.
// ---------------------------------------------------------
const LENGTH_UNITS: Record<string, number> = {
  mm: 0.001, millimeter: 0.001, millimetre: 0.001,
  cm: 0.01, centimeter: 0.01, centimetre: 0.01,
  m: 1, meter: 1, metre: 1,
  km: 1000, kilometer: 1000, kilometre: 1000,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254,
  yd: 0.9144, yard: 0.9144, yards: 0.9144,
};
const MASS_UNITS: Record<string, number> = {
  mg: 1e-6, g: 0.001, gram: 0.001, gramme: 0.001,
  kg: 1, kilogram: 1, kilogramme: 1,
  t: 1000, tonne: 1000, tonnes: 1000, ton: 1000, tons: 1000,
  lb: 0.453592, pound: 0.453592, pounds: 0.453592,
};
const VOLUME_UNITS: Record<string, number> = {
  ml: 0.001, cl: 0.01, dl: 0.1, l: 1, liter: 1, litre: 1,
  liters: 1, litres: 1, m3: 1000, "cubic-meter": 1000,
};

/** Normalized unit: dimension + factor to base. */
function unitEntry(
  unit: string,
): { dimension: string; factor: number } | null {
  const u = unit.toLowerCase().replace(/\.$/, "").replace(/°/, "");
  if (u in LENGTH_UNITS) return { dimension: "length", factor: LENGTH_UNITS[u] };
  if (u in MASS_UNITS) return { dimension: "mass", factor: MASS_UNITS[u] };
  if (u in VOLUME_UNITS) return { dimension: "volume", factor: VOLUME_UNITS[u] };
  // Plural fallback: "meters" -> "meter".
  const singular = u.endsWith("s") ? u.slice(0, -1) : u;
  if (singular in LENGTH_UNITS) return { dimension: "length", factor: LENGTH_UNITS[singular] };
  if (singular in MASS_UNITS) return { dimension: "mass", factor: MASS_UNITS[singular] };
  if (singular in VOLUME_UNITS) return { dimension: "volume", factor: VOLUME_UNITS[singular] };
  return null;
}

const TEMPERATURE: Record<string, (c: number) => number> = {
  "celsius": (c) => c,
  centigrade: (c) => c,
  "c": (c) => c,
  "fahrenheit": (c) => (c * 9) / 5 + 32,
  "f": (c) => (c * 9) / 5 + 32,
  "kelvin": (c) => c + 273.15,
  "k": (c) => c + 273.15,
};
const FROM_C: Record<string, (v: number) => number> = {
  celsius: (v) => v,
  centigrade: (v) => v,
  c: (v) => v,
  fahrenheit: (v) => ((v - 32) * 5) / 9,
  f: (v) => ((v - 32) * 5) / 9,
  kelvin: (v) => v - 273.15,
  k: (v) => v - 273.15,
};

/** Convert a value between units. Throws honest errors for
 *  unknown units or cross-dimension conversions. */
export function convertUnits(
  value: number,
  from: string,
  to: string,
): number {
  if (Number.isNaN(value)) throw new Error("value must be a number");
  const fRaw = from.toLowerCase().replace(/\.$/, "");
  const tRaw = to.toLowerCase().replace(/\.$/, "");
  if (fRaw in FROM_C && tRaw in TEMPERATURE) {
    if (fRaw === tRaw) return value;
    return Math.round(TEMPERATURE[tRaw](FROM_C[fRaw](value)) * 1e6) / 1e6;
  }
  const f = unitEntry(from);
  const t = unitEntry(to);
  if (!f) throw new Error(`unknown unit "${from}" — I convert length, mass, volume and temperature only`);
  if (!t) throw new Error(`unknown unit "${to}" — I convert length, mass, volume and temperature only`);
  if (f.dimension !== t.dimension) {
    throw new Error(`cannot convert ${f.dimension} (${from}) to ${t.dimension} (${to}) — different dimensions, honestly refused`);
  }
  return Math.round((value * f.factor) / t.factor * 1e6) / 1e6;
}

export function registerBuiltInTools(orchestrator: ToolOrchestrator): void {
  orchestrator.register(
    {
      name: "arithmetic",
      description: "Deterministically evaluate an arithmetic expression",
      parameters: { expression: "string" },
    },
    (args) => evaluateExpression(String(args.expression)),
  );
  orchestrator.register(
    {
      name: "convert_units",
      description: "Deterministically convert a value between units of the same dimension",
      parameters: { value: "number", from: "string", to: "string" },
    },
    (args) =>
      convertUnits(Number(args.value), String(args.from), String(args.to)),
  );
  orchestrator.register(
    {
      name: "percent_of",
      description: "Compute a percentage of a number",
      parameters: { percent: "number", value: "number" },
    },
    (args) => {
      const pct = Number(args.percent);
      const value = Number(args.value);
      if (Number.isNaN(pct) || Number.isNaN(value)) {
        throw new Error("percent and value must be numbers");
      }
      return (pct / 100) * value;
    },
  );
}
