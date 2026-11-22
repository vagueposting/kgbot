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
{{? TEAPOT == true}}There's a teapot on it. {{&brewTea}}
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
    expect(output).toContain(`It's a table with ${parsed.CAKES} cakes.`);
  });
});
