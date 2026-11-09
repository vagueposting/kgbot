import { findCheckIndex, matchesFlavor } from "./handleActiveCheckRoll";
import { POIResponse } from "../types/POItypes";

const makeResponse = (checks: any[]) => {
  const r = new POIResponse("I'm a test POI!", []);
  checks.forEach((c) => r.addCheck(c));
  return r;
};

describe("findCheckIndex", () => {
  it("matches an exact pinned pair", () => {
    const resp = makeResponse([
      {
        modifier: 0,
        flavors: [{ approach: "careful", skill: "athletics" }],
        success: "ok",
      },
    ]);
    expect(findCheckIndex(resp, "careful", "athletics")).toBe(0);
    expect(findCheckIndex(resp, "quick", "athletics")).toBe(-1);
  });

  it("matches a wildcard skill flavor", () => {
    const resp = makeResponse([
      {
        modifier: 0,
        flavors: [{ approach: "careful", skills: null }],
        success: "ok",
      },
    ]);
    expect(findCheckIndex(resp, "careful", "composure")).toBe(0);
    expect(findCheckIndex(resp, "careful", undefined)).toBe(0);
  });

  it("prefers exact pairs over wildcards", () => {
    const resp = makeResponse([
      {
        modifier: 0,
        flavors: [
          {
            approach: "careful",
            skill: null,
          },
        ],
        success: "wild",
      },
      {
        modifier: 0,
        flavors: [
          {
            approach: "careful",
            skill: "athletics",
          },
        ],
        success: "exact",
      },
    ]);
    expect(findCheckIndex(resp, "careful", "athletics")).toBe(1);
  });

  it("prefers exact pairs over wildcards", () => {
    const resp = makeResponse([
      {
        modifier: 0,
        flavors: [{ approach: "careful", skill: null }],
        success: "wild",
      },
      {
        modifier: 0,
        flavors: [{ approach: "careful", skill: "athletics" }],
        success: "exact",
      },
    ]);
    expect(findCheckIndex(resp, "careful", "athletics")).toBe(1);
  });

  it("falls back to unconditional when nothing matches", () => {
    const resp = makeResponse([
      { modifier: 0, flavors: [], success: "fallback" },
    ]);
    expect(findCheckIndex(resp, "sneaky", "skulduggery")).toBe(0);
  });

  it("regression: does NOT cross-product flavors", () => {
    const resp = makeResponse([
      {
        modifier: 0,
        flavors: [
          { approach: "forceful", skill: "athletics" },
          { approach: "quick", skill: null },
        ],
        success: "ok",
      },
    ]);
    expect(findCheckIndex(resp, "forceful", "composure")).toBe(-1);
  });
});
