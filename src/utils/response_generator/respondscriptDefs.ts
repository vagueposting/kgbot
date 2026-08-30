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
        response.roll_dc = stmt.dc;
        response.approach = stmt.approaches;
        response.skill_tag = stmt.skills;
        response.success = stmt.successText;
        response.failure = stmt.failureText;
      } else if (stmt.type === "method") {
        response.addMethod(stmt.name, stmt.method);
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

  Default(displayNode) {
    return displayNode.toPOIResponse();
  },

  Display(childNode) {
    return childNode.toPOIResponse();
  },

  PlainText(_chars) {
    return this.sourceString;
  },

  EmbedState(_open, opNode, _close) {
    return `{{${opNode.toPOIResponse()}}}`;
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

  MethodDeclaration(_open, bodyNode, _close) {
    return bodyNode.toPOIResponse();
  },

  ObjectMethod(idNode, actionsNode) {
    const methodName = idNode.toPOIResponse();
    // actionsNode.children maps directly to individual Action AST nodes
    const actions = actionsNode.children.map((actionNode) =>
      actionNode.toPOIResponse(),
    );

    const compileMethod: POIMethod = (currentState: POIState): POIState => {
      const nextState = { ...currentState };

      for (const act of actions) {
        const { type, target, degree } = act;

        switch (type) {
          case "set":
            nextState[target] = degree;
            break;
          case "inc":
            nextState[target] =
              (Number(nextState[target]) || 0) + (Number(degree) || 1);
            break;
          case "dec":
            if (
              typeof nextState[target] !== "number" &&
              nextState[target] !== undefined
            ) {
              throw new Error(`State ${target} is not a number!`);
            }
            nextState[target] =
              (Number(nextState[target]) || 0) - (Number(degree) || 1);
            break;
          case "flip":
            nextState[target] = !nextState[target];
            break;
          case "true":
            nextState[target] = true;
            break;
          case "untrue":
            nextState[target] = false;
            break;
        }
      }
      return nextState;
    };

    return {
      type: "method",
      name: methodName,
      method: compileMethod,
    };
  },

  Action(typeNode, targetIdNode, degreeNode) {
    return {
      type: typeNode.sourceString,
      target: targetIdNode.toPOIResponse(),
      degree: degreeNode.children[0]?.toPOIResponse(),
    };
  },

  Identifier(_nameNode) {
    return this.sourceString;
  },

  NumberLiteral(_digits) {
    return parseInt(this.sourceString, 10);
  },

  ActionDegree(val) {
    return val.toPOIResponse();
  },

  StringLiteral(_open, chars, _close) {
    return chars.sourceString;
  },

  Approach(_val) {
    return this.sourceString;
  },

  Skill(_val) {
    return this.sourceString;
  },
});
