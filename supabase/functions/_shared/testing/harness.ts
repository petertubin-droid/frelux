// =========================================================
// Edge-function test harness.
//
// Loads a REAL edge function module under vitest by shimming the
// Deno globals it needs at import time:
//
//   * Deno.env.get  → test-supplied env map
//   * Deno.serve    → captures the handler each function
//                     registers via serveWithCors()
//
// The Supabase client is mocked (see setup.ts): createClient
// returns a chainable fake with table fixtures per test. Tests
// then invoke the captured handler with real Request objects and
// assert on real Response objects — only the network is faked.
// =========================================================

/** Deno shim state for the current dynamic import. */
const state = {
  env: {} as Record<string, string>,
  handler: null as null | ((req: Request) => Promise<Response> | Response),
};

/** Registered table fixtures for the CURRENT test. */
const tableFixtures = new Map<string, any[]>();

/** Registered supabase-js hooks (auth.getUser etc.). */
const authHooks = {
  /** auth.getUser(token) → { data: { user } } */
  getUser: null as null | ((token?: string) => { data: { user: any } }),
};

export { state, tableFixtures, authHooks };

/** Install the Deno global shim. Must run BEFORE the dynamic import. */
export function installDeno(env: Record<string, string>) {
  state.env = env;
  state.handler = null;
  (globalThis as any).Deno = {
    env: { get: (k: string) => state.env[k] },
    serve: (h: any) => {
      state.handler = h;
      return undefined;
    },
  };
}

/**
 * The test file statically imports its function module
 * (`import "../index.ts"`); the module registers its handler via
 * serveWithCors at import time and the Deno.serve shim captures it.
 * Deno globals are installed by setup.ts BEFORE any import.
 */
export function getHandler(): (req: Request) => Promise<Response> | Response {
  if (!state.handler) {
    throw new Error(
      "no handler captured — did the test file import ../index.ts?",
    );
  }
  return state.handler;
}

/** Reset captured state between tests (fixtures too). */
export function resetCapture() {
  state.handler = null;
  tableFixtures.clear();
  authHooks.getUser = null;
}

/** Register fixture rows for a table. Chainable queries read these. */
export function givenRows(table: string, rows: any[]) {
  tableFixtures.set(table, [...rows]);
}

/** Set the auth.getUser response for the anon client. */
export function givenUser(user: any | null) {
  authHooks.getUser = () => ({ data: { user } });
}

// ---------------------------------------------------------
// Chainable fake of a supabase-js client (postgrest subset).
// Supports the operators the edge functions actually use:
// select/eq/neq/in/like/order/limit/single/maybeSingle,
// insert/update/delete with .eq() filters, plus rpc().
// ---------------------------------------------------------

type Row = Record<string, any>;

function makeQuery(
  table: string,
  op: "select" | "insert" | "update" | "delete",
  payload?: any,
) {
  const filters: Array<(r: Row) => boolean> = [];
  let range: [number, number] | null = null;

  const applyFilter = (column: string, value: any, negate = false) => {
    filters.push((r) => {
      const match = Array.isArray(value)
        ? value.includes(r[column])
        : r[column] === value;
      return negate ? !match : match;
    });
  };

  const q: any = {
    select: () => q,
    insert: (rows: any) => {
      const list = Array.isArray(rows) ? rows : [rows];
      const stored = tableFixtures.get(table) ?? [];
      const withIds = list.map((r) => ({
        id:
          r.id ??
          `gen-${table}-${stored.length + Math.random().toString(36).slice(2, 8)}`,
        ...r,
      }));
      stored.push(...withIds);
      tableFixtures.set(table, stored);
      // insert().select() chains re-read the table
      return makeQuery(table, "select");
    },
    update: (patch: any) => {
      // capture patch; applied on .eq()s at resolve time
      (q as any)._patch = patch;
      return q;
    },
    upsert: (rows: any) => {
      const list = Array.isArray(rows) ? rows : [rows];
      const stored = tableFixtures.get(table) ?? [];
      for (const r of list) stored.push(r);
      tableFixtures.set(table, stored);
      return makeQuery(table, "select");
    },
    delete: () => q,
    eq: (col: string, v: any) => {
      applyFilter(col, v);
      if ((q as any)._patch) {
        // update().eq().select() — mutate matching fixture rows now
        const stored = tableFixtures.get(table) ?? [];
        const patch = (q as any)._patch;
        for (const r of stored) {
          const match = Array.isArray(v) ? v.includes(r[col]) : r[col] === v;
          if (match) Object.assign(r, patch);
        }
      }
      return q;
    },
    neq: (col: string, v: any) => {
      applyFilter(col, v, true);
      return q;
    },
    in: (col: string, v: any[]) => {
      filters.push((r) => v.includes(r[col]));
      return q;
    },
    gte: (col: string, v: any) => {
      filters.push((r) => r[col] >= v);
      return q;
    },
    gt: (col: string, v: any) => {
      filters.push((r) => r[col] > v);
      return q;
    },
    lte: (col: string, v: any) => {
      filters.push((r) => r[col] <= v);
      return q;
    },
    lt: (col: string, v: any) => {
      filters.push((r) => r[col] < v);
      return q;
    },
    like: (col: string, v: string) => {
      const pattern = new RegExp("^" + v.replace(/%/g, ".*") + "$");
      filters.push((r) => pattern.test(String(r[col] ?? "")));
      return q;
    },
    ilike: (col: string, v: string) => q.like(col, v),
    order: () => q,
    limit: (n: number) => {
      filters.push((_r, i) => (i ?? 0) < n);
      return q;
    },
    range: (from: number, to: number) => {
      range = [from, to];
      return q;
    },
    single: async () => {
      const rows = resolveRows();
      return {
        data: rows[0] ?? null,
        error: rows.length > 1 ? { message: "multiple" } : null,
      };
    },
    maybeSingle: async () => {
      const rows = resolveRows();
      return { data: rows[0] ?? null, error: null };
    },
    then: (resolve: any, reject: any) => {
      // await query → { data, error }
      try {
        const rows = resolveRows();
        return Promise.resolve({ data: rows, error: null }).then(
          resolve,
          reject,
        );
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    },
  };

  function resolveRows(): Row[] {
    let rows = tableFixtures.get(table) ?? [];
    for (const f of filters) {
      rows = rows.filter((r, i) => {
        try {
          return f(r, i);
        } catch {
          return true;
        }
      });
    }
    if (range) rows = rows.slice(range[0], range[1] + 1);
    return rows;
  }

  return q;
}

/** The fake supabase client handed to createClient(). */
export function makeMockClient() {
  const client: any = {
    from: (table: string) => makeQuery(table, "select"),
    auth: {
      getUser: async (token?: string) =>
        authHooks.getUser ? authHooks.getUser(token) : { data: { user: null } },
      admin: {
        getUserById: async () => ({ data: { user: null } }),
        listUsers: async () => ({ data: { users: [] } }),
      },
    },
    rpc: async () => ({ data: null, error: null }),
    functions: { invoke: async () => ({ data: null, error: null }) },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}) as any,
    }),
    removeChannel: () => {},
  };
  return client;
}

/** Build a Request against the function endpoint. */
export function req(
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const url = new URL(
    `https://test-project.supabase.co/functions/v1/fn${path}`,
  );
  return new Request(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Owner header for authenticated calls. */
export const OWNER_AUTH = { Authorization: "Bearer owner-jwt" };
export const OWNER_ID = "11111111-1111-4111-8111-111111111111";

/** Standard fixture: the owner as admin in profiles. */
export function givenOwnerIsAdmin() {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [
    { id: OWNER_ID, email: "owner@test.local", role: "admin" },
  ]);
}

/** Read a JSON response body. */
export async function json(res: Response) {
  return res.json();
}

// ---------------------------------------------------------
// PostgREST-style interception for functions that use raw
// `fetch(`${SUPABASE_URL}/...`)` instead of supabase-js.
// Serves the same tableFixtures the supabase-js mock reads.
// ---------------------------------------------------------

/** Install global fetch interception for the test project URL. */
export function interceptSupabaseRest() {
  const orig = globalThis.fetch;
  (globalThis as any).__origFetch = orig;
  globalThis.fetch = async (input: any, init?: any): Promise<Response> => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    if (!url.includes("test-project.supabase.co")) {
      return orig(input, init);
    }
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean); // [rest, v1, table] or [auth, v1, ...]
    const accept = init?.headers?.Accept ?? init?.headers?.accept ?? "";
    const bodyText = init?.body;

    // auth endpoints — /auth/v1/user serves the givenUser fixture
    // (the GoTrue shape functions expect: {id, user:{id,email}, email})
    if (parts[0] === "auth" && u.pathname.endsWith("/auth/v1/user")) {
      const u2 = authHooks.getUser?.(init?.headers?.Authorization) ?? null;
      const user = u2?.data?.user ?? null;
      if (!user) {
        return new Response(JSON.stringify({ message: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ id: user.id, email: user.email ?? null, user }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (parts[0] === "auth") {
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (parts[0] !== "rest") {
      return new Response(JSON.stringify({ message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const table = parts.slice(2).join("/");
    let rows = tableFixtures.get(table) ?? [];

    // filters: col=op.value (PostgREST syntax)
    const opMap: Record<string, (r: any, col: string, v: string) => boolean> = {
      eq: (r, c, v) => String(r[c]) === v,
      neq: (r, c, v) => String(r[c]) !== v,
      is: (r, c, v) => (v === "null" ? r[c] == null : r[c] === v),
      gt: (r, c, v) => Number(r[c]) > Number(v),
      gte: (r, c, v) => Number(r[c]) >= Number(v),
      lt: (r, c, v) => Number(r[c]) < Number(v),
      lte: (r, c, v) => Number(r[c]) <= Number(v),
    };
    for (const [key, val] of u.searchParams.entries()) {
      if (
        key === "select" ||
        key === "limit" ||
        key === "order" ||
        key === "offset"
      )
        continue;
      const m = /^(eq|neq|is|gt|gte|lt|lte|in|like)\.(.*)$/.exec(key);
      if (!m) continue;
      const op = m[1];
      const col = val;
      const raw = m[2];
      if (op === "in") {
        const list = raw.replace(/[()\"]/g, "").split(",");
        rows = rows.filter((r) => list.includes(String(r[col])));
      } else if (op === "like") {
        const pat = new RegExp(
          "^" + raw.replace(/\*/g, ".*").replace(/%/g, ".*") + "$",
        );
        rows = rows.filter((r) => pat.test(String(r[col] ?? "")));
      } else {
        const fn = opMap[op];
        rows = rows.filter((r) => fn(r, col, raw));
      }
    }
    // order=col.asc/.desc
    const ord = u.searchParams.get("order");
    if (ord) {
      const [col, dir] = ord.split(".");
      rows = [...rows].sort((a, b) =>
        dir === "desc"
          ? String(b[col]).localeCompare(String(a[col]))
          : String(a[col]).localeCompare(String(b[col])),
      );
    }
    const off = Number(u.searchParams.get("offset") ?? 0);
    const lim = Number(u.searchParams.get("limit") ?? 0);
    if (off || lim) rows = rows.slice(off, lim ? off + lim : undefined);

    const wantsSingle = String(accept).includes("vnd.pgrst.object+json");
    const jsonHeaders = { "Content-Type": "application/json" };

    if ((init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify(wantsSingle ? (rows[0] ?? null) : rows),
        { status: 200, headers: jsonHeaders },
      );
    }
    if (
      init?.method === "POST" ||
      init?.method === "PATCH" ||
      init?.method === "PUT"
    ) {
      const parsed = bodyText ? JSON.parse(bodyText) : null;
      if (init?.method === "POST") {
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const stored = tableFixtures.get(table) ?? [];
        const withIds = list.map((r: any) => ({
          id: r?.id ?? `gen-${table}-${stored.length}`,
          ...r,
        }));
        stored.push(...withIds);
        tableFixtures.set(table, stored);
        return new Response(JSON.stringify(withIds), {
          status: 201,
          headers: jsonHeaders,
        });
      }
      // PATCH — apply to filtered fixture rows
      const stored = tableFixtures.get(table) ?? [];
      const keys = rows.map((r) => r.id);
      for (const r of stored) if (keys.includes(r.id)) Object.assign(r, parsed);
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: jsonHeaders,
      });
    }
    if (init?.method === "DELETE") {
      const stored = tableFixtures.get(table) ?? [];
      const keys = rows.map((r) => r.id);
      tableFixtures.set(
        table,
        stored.filter((r) => !keys.includes(r.id)),
      );
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: jsonHeaders,
      });
    }
    return new Response(JSON.stringify({ message: "method not handled" }), {
      status: 405,
      headers: jsonHeaders,
    });
  };
}
