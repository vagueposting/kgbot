import { parseDiceRoll } from "./parseDiceRoll";

describe("parseDiceRoll", () => {
  it("extracts dice result", () => {
    const r = parseDiceRoll("[Athletics] `🎲12`");
    expect(r?.diceResult).toBe(12);
  });

  it("returns null without backticks", () => {
    expect(parseDiceRoll("🎲20")).toBeNull();
    expect(parseDiceRoll("I roll 🎲 20 [Athletics]")).toBeNull();
  });

  it("parses inside backticks", () => {
    expect(parseDiceRoll("`🎲20`")?.diceResult).toBe(20);
    expect(parseDiceRoll("test `🎲 20`")?.diceResult).toBe(20);
  });

  it("extracts a skill tag", () => {
    const r = parseDiceRoll("`🎲5` [Athletics]");
    expect(r?.skill).toBe("athletics");
  });

  it("extracts an approach tag", () => {
    const r = parseDiceRoll("`🎲3` [Careful]");
    expect(r?.approach).toBe("careful");
  });

  it("handles fuzz-matched typos", () => {
    const r = parseDiceRoll("`🎲3` [Athletiks]");
    expect(r?.skill).toBe("athletics");
  });

  it("returns null if there is no roll", () => {
    const r = parseDiceRoll("I looked around");
    expect(r).toBeNull();
  });

  it("extracts a skill whether or not it is before the roll, or somewhere else.", () => {
    const a = parseDiceRoll("[Skulduggery] I pick the lock. `🎲3`");
    const b = parseDiceRoll("I pick the lock. `🎲3` [Skulduggery]");
    const c = parseDiceRoll("I pick the lock. [Skulduggery] `🎲3`");
    expect(a?.skill).toBe("skulduggery");
    expect(b?.skill).toBe("skulduggery");
    expect(c?.skill).toBe("skulduggery");
  });

  it("extracts the first skill if more than two are found.", () => {
    const a = parseDiceRoll("[Skulduggery] [Athletics] `🎲2`");
    expect(a?.skill).toBe("skulduggery");
  });

  it("extracts the first approach if more than two are found.", () => {
    const a = parseDiceRoll("[Careful] [Sneaky] `🎲2`");
    expect(a?.approach).toBe("careful");
  });
});
