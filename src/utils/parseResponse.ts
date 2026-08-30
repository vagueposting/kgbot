import grammar from "./response_generator/respondscript.ohm-bundle";
import { semantics } from "./response_generator/respondscriptDefs";
import { POIResponse } from "../types/POItypes";

export function parseResponseScript(input: string): POIResponse {
  const match = grammar.match(input);
  if (match.failed()) {
    throw new Error(
      `ResponseScript Syntax Error: ${match.getRightmostFailurePosition()}`,
    );
  }
  return semantics(match).toPOIResponse() as POIResponse;
}
