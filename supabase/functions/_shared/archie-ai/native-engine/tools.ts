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
      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== "(" &&
        PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token]
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
