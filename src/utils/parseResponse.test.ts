import { parseResponseScript } from "./parseResponse";
import { POI, TruePOIConstructor } from "../types/POItypes";
import { generateRandomString } from "./generateRandomString";
import { Guild } from "discord.js";
import { getParentId } from "./getParentId";

jest.mock("../utils/getParentId", () => ({
  getParentId: jest.fn(),
}));

const mockedGetParentId = getParentId as jest.MockedFunction<
  typeof getParentId
>;

describe("parseResponseScript", () => {
  // BASIC REGISTRATION
  it("creates a response object.", () => {
    const r = parseResponseScript(`It's a table.`);
    expect(r).toBeDefined();
    expect(r.base).toBe("It's a table.");
  });

  it("registers methods that apply to the response.", () => {
    const r = parseResponseScript(
      `It's a table.
        {{& poundTable}}`,
    );
    expect(r.methodCalls[0]).toBe("poundTable");
  });

  // METHOD CALLS

  it("can also handle multiple methods in a single call", () => {
    const r = parseResponseScript(
      `It's a table.
{{& poundTable, takeFork}}`,
    );
    expect(r.methodCalls).toStrictEqual(["poundTable", "takeFork"]);
  });

  it("Can parse branches in the script.", () => {
    const r = parseResponseScript(
      `It's a table.
{{? TEAPOT == true}}There's a teapot on it.
{{!?}}Somebody else already took it.{{/?}}`,
    );
    expect(r.statements).toBeDefined();
    expect(r.statements![0].type).toBe("conditional");
    expect(r.statements![0].ifBranch).toBeDefined();
    expect(r.statements![0].elseBranch).toBeDefined();
  });

  it("parses conditional blocks with if, else-if, else, and nested method calls", () => {
    const r = parseResponseScript(
      `It's a table.
{{? TEAPOT == true}}There's a teapot on it.{{&brewTea}}
{{?? TEAPOTCOUNT >= 2}}Two teapots sit here.{{!?}}Somebody else already took it.{{/?}}`,
    );

    expect(r.base).toBe("It's a table.");

    expect(r.statements).toBeDefined();

    expect(r.statements).toHaveLength(1);

    const cond = r.statements![0];

    expect(cond.type).toBe("conditional");

    expect(cond.ifBranch.condition).toEqual({
      identifier: "TEAPOT",

      comparator: "==",

      value: true,
    });

    expect(cond.ifBranch.statements).toEqual([
      "There's a teapot on it.",
      { type: "methodCall", keys: ["brewTea"] },
    ]);

    expect(cond.elseIfBranches).toHaveLength(1);

    expect(cond.elseIfBranches[0].condition).toEqual({
      identifier: "TEAPOTCOUNT",
      comparator: ">=",
      value: 2,
    });

    expect(cond.elseIfBranches[0].statements).toEqual([
      "Two teapots sit here.",
    ]);

    expect(cond.elseBranch).toEqual({
      statements: ["Somebody else already took it."],
    });
  });

  it("Allows you to embed states", async () => {
    const parameters: TruePOIConstructor = {
      name: "table",
      code: generateRandomString(5),
      channel: "00000000000000000",
      guild: { id: "11111111111111111" } as Guild,
      aliases: ["desk"],
      state: {
        parsed: {
          CAKES: 2,
          MAXCAKES: 5,
        },
        original: "CAKES = 2, MAXCAKES = 5",
      },
      actionsOrResponses: ["_"],
      group: "",
      shouldBeExempt: false,
    };

    const poi = await POI.create(parameters);
    mockedGetParentId.mockResolvedValue("99999999999999999");

    const r = parseResponseScript(`It's a table with {{CAKES}} cakes.
You can add up to {{MAXCAKES - CAKES}} more.`);

    poi.responses.test = r;

    const { parsed } = poi.state;

    const output = r.evaluateText(poi);
    expect(output).toMatch(`It's a table with ${parsed.CAKES} cakes.`);
    expect(output).toMatch(
      `You can add up to ${(parsed.MAXCAKES as number) - (parsed.CAKES as number)} more.`,
    );
  });

  it("parses a roll declaration with default approaches, skills, and outcomes", () => {
    const r = parseResponseScript(
      `You inspect the locked drawer.
{{@+2|Careful,Clever|Skulduggery}}
{{=succeed}}You pick the lock cleanly.
{{=fail}}The pick snaps inside the keyhole.
{{/@}}`,
    );

    expect(r.base).toBe("You inspect the locked drawer.");
    expect(r.checks).toHaveLength(1);
    expect(r.checks[0]).toMatchObject({
      modifier: 2,
      approach: ["Careful", "Clever"],
      skill_tag: ["Skulduggery"],
      success: "You pick the lock cleanly.",
      failure: "The pick snaps inside the keyhole.",
    });
  });

  it("handles negative modifiers, optional failure blocks, and flavor variants", () => {
    const r = parseResponseScript(
      `You try to force the heavy lid open.
{{@-1|Forceful|Athletics}}
{{>Quick|Skulduggery}}{{>Clever|}}
{{=succeed}}The lid slides off with {{WEIGHT}} lbs of dust.
{{=succeed}}You pry it open the standard way.
{{=fail}}It doesn't budge.
{{/@}}`,
    );

    expect(r.checks).toHaveLength(2);
    expect(r.checks[0].success).toBe(
      "The lid slides off with ${state.WEIGHT} lbs of dust.",
    );

    expect(r.checks[0]).toMatchObject({
      modifier: -1,
      approach: ["Quick", "Clever"],
      skill_tag: ["Skulduggery"],
      flavors: [
        { approach: "Quick", skill: "Skulduggery" },
        { approach: "Clever", skill: null },
      ],
      failure: undefined,
    });

    expect(r.checks[1]).toMatchObject({
      modifier: -1,
      approach: ["Forceful"],
      skill_tag: ["Athletics"],
      flavors: undefined,
    });

    const successText = r.renderCheckOutcome(0, { isSuccess: true } as any, {
      WEIGHT: 15,
    });
    expect(successText).toMatch("15 lbs of dust.");

    const failText = r.renderCheckOutcome(1, { isSuccess: false } as any, {
      WEIGHT: 15,
    });
    expect(failText).toMatch("It doesn't budge.");
  });
});
