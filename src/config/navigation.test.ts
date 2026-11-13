import { describe, expect, it } from "vitest";
import { groupKeyForWorkspace, groupWorkspaces, navGroups } from "./navigation";
import { navWorkspaces } from "./site";

describe("menu organisation", () => {
  const workspaces = navWorkspaces.filter(
    (workspace) => workspace.path !== "/",
  );

  it("keeps every workspace somewhere in the menu", () => {
    const grouped = groupWorkspaces(workspaces).flatMap((entry) =>
      entry.workspaces.map((workspace) => workspace.label),
    );
    expect(new Set(grouped)).toEqual(
      new Set(workspaces.map((workspace) => workspace.label)),
    );
    expect(grouped).toHaveLength(workspaces.length);
  });

  it("emits groups in the declared order and drops empty ones", () => {
    const groups = groupWorkspaces(workspaces);
    const keys = groups.map((entry) => entry.group.key);
    const declared = navGroups.map((group) => group.key);
    expect(keys.slice(0, navGroups.length)).toEqual(declared);
    for (const entry of groups)
      expect(entry.workspaces.length).toBeGreaterThan(0);
  });

  it("places each workspace in exactly one group", () => {
    const seen = new Map<string, number>();
    for (const entry of groupWorkspaces(workspaces)) {
      for (const workspace of entry.workspaces) {
        seen.set(workspace.label, (seen.get(workspace.label) ?? 0) + 1);
      }
    }
    for (const [, count] of seen) expect(count).toBe(1);
  });

  it("puts an unmapped workspace in the trailing More group, not nowhere", () => {
    const groups = groupWorkspaces([
      ...workspaces,
      { label: "Something New", path: "/something-new" },
    ]);
    const more = groups[groups.length - 1];
    expect(more?.group.key).toBe("more");
    expect(
      (more?.workspaces ?? []).map(
        (workspace: { label: string }) => workspace.label,
      ),
    ).toContain("Something New");
  });

  it("maps the known workspaces", () => {
    expect(groupKeyForWorkspace("Construction Tools")).toBe("estimate");
    expect(groupKeyForWorkspace("Market Intelligence")).toBe("explore");
    expect(groupKeyForWorkspace("Learn")).toBe("manage");
    expect(groupKeyForWorkspace("Nope")).toBeNull();
  });
});
