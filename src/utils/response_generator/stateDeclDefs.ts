import grammar, { StateScriptSemantics } from "./stateDeclaration.ohm-bundle";

export const stateSemantics: StateScriptSemantics = grammar.createSemantics();

stateSemantics.addOperation("toStateObject", {
  StateList(assignmentNode) {
    const assignments = assignmentNode.asIteration().toStateObject();
    return Object.assign({}, ...assignments);
  },

  IndividualState(idNode, _eq, valNode) {
    return { [idNode.sourceString]: valNode.toStateObject() };
  },

  StringLiteral(_open, chars, _close) {
    return chars.sourceString;
  },

  NumberLiteral(val) {
    return Number(val.sourceString);
  },

  BooleanLiteral(val) {
    return val.sourceString === "true";
  },
});
