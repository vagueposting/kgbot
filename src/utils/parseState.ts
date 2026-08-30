import grammar from "./response_generator/stateDeclaration.ohm-bundle";
import { stateSemantics } from "./response_generator/stateDeclDefs";
import { POIState } from "../types/POItypes";

export function parseStateScript(input: string): POIState {
  const match = grammar.match(input);
  if (match.failed()) {
    throw new Error(
      `StateScript Syntax Error: ${match.getRightmostFailurePosition()}`,
    );
  }
  return stateSemantics(match).toStateObject() as POIState;
}
