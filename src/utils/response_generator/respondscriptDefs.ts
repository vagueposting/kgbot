import { POIResponse, POIMethod, POIState } from "../../types/POItypes";
import grammar, { RespondScriptSemantics } from "./respondscript.ohm-bundle";

export type ScriptNode =
  | { type: "text"; content: string }
  | { type: "embed"; identifier: string; op?: string; rhs?: string | number }
  | {
      type: "conditional";
      ifBranch: any;
      elseIfBranches: any[];
      elseBranch?: any;
    };

export const semantics: RespondScriptSemantics = grammar.createSemantics();

semantics.addOperation("toPOIResponse", {
  Program(stateDecls, defaultDisplay, statements) {
    const calledState = stateDecls.children.map((decl) => decl.toPOIResponse());
    const baseText = defaultDisplay.toPOIResponse();
    const response = new POIResponse(baseText);

    const evaluatedStatements = statements.children.map((s) =>
      s.toPOIResponse(),
    );

    for (const stmt of evaluatedStatements) {
      if (stmt.type === "roll") {
        response.addCheck({
          roll_dc: stmt.dc,
          approach: stmt.approaches,
          skill_tag: stmt.skills,
          success: stmt.successText,
          failure: stmt.failureText,
        });
      } else if (stmt.type === "methodCall") {
        response.methodCalls.push(...stmt.name);
      }
    }

    return response;
  },

  StateDeclaration(node) {
    return node.toPOIResponse();
  },

  ObjectState(_open, identifiersNode, _close) {
    return {
      type: "objectState",
      keys: identifiersNode.asIteration().toPOIResponse(),
    };
  },

  PlayerState(_open, stuffNode, _close) {
    return {
      type: "playerState",
      target: stuffNode.sourceString,
    };
  },

  MethodCall(_open, methods, _close) {
    return {
      type: "methodCall",
      keys: methods.asIteration().toPOIResponse(),
    };
  },

  Default(displayNodes) {
    return displayNodes.children.map((d) => d.toPOIResponse()).join("");
  },

  Display(childNode) {
    return childNode.toPOIResponse();
  },

  PlainText(_chars) {
    return this.sourceString;
  },

  EmbedState(_open, opNode, _close) {
    return `\${state.${opNode.toPOIResponse()}}`;
  },

  IdentifierOperation(idNode, operandNode, rhsNode) {
    const id = idNode.toPOIResponse();

    if (operandNode.children.length === 0) {
      return id;
    }

    const op = operandNode.children[0].sourceString;
    const rhs = rhsNode.children[0].toPOIResponse();
    return `${id} ${op} ${rhs}`;
  },

  RollDeclaration(
    _open,
    dcNode,
    _pipe1,
    approachesNode,
    _pipe2,
    skillsNode,
    _close,
    succeedNode,
    failNode,
    _end,
  ) {
    const approaches = approachesNode.asIteration().toPOIResponse();
    const skills = skillsNode.asIteration().toPOIResponse();

    return {
      type: "roll",
      dc: dcNode.toPOIResponse(),
      approaches: approaches.flat(),
      skills: skills.flat(),
      successText: succeedNode.toPOIResponse(),
      failureText: failNode.toPOIResponse(),
    };
  },

  RollSucceed(_open, statements) {
    return statements.children.map((s) => s.toPOIResponse()).join("");
  },

  RollFail(_open, statements) {
    return statements.children.map((s) => s.toPOIResponse()).join("");
  },
});
