import { summarizeFlavors } from "./summarizeFlavors";

describe("summarizeFlavors", () => {
  it("returns 'Any' for empty flavors", () => {
    expect(summarizeFlavors({ flavors: [] } as any, "approach")).toBe("Any");
  });

  it("dedupes pinned approaches", () => {
    const r = {
      flavors: [
        { approach: "careful", skill: null },
        { approach: "careful", skill: "athletics" },
      ],
    } as any;
    expect(summarizeFlavors(r, "approach")).toBe("careful");
  });

  it("returns 'Any' if any flavor is wildcard on that dim", () => {
    const r = {
      flavors: [
        { approach: "careful", skill: null },
        { approach: null, skill: "athletics" },
      ],
    } as any;
    expect(summarizeFlavors(r, "approach")).toBe("Any");
  });
});
