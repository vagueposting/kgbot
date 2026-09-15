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

export function isStateEqual(a: POIState, b: POIState): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => a[key] === b[key]);
}
