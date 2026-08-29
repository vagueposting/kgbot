import {
  POIResponse,
  POIMethod,
  POIState,
  ValidStates,
} from "../../types/POItypes";
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

const semantics: RespondScriptSemantics = grammar.createSemantics();

semantics.addOperation("toPOIResponse", {
  Program(stateDecls, defaultDisplay, statements) {
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

  ObjectMethod(idNode, actionTypes, targetIds, degrees) {
    const methodName = idNode.toPOIResponse();
    const actions = actionTypes.children.map((typeNode, index) => ({
      type: typeNode.sourceString,
      target: targetIds.children[index].toPOIResponse(),
      degree: degrees.children[index]?.children[0]?.toPOIResponse(),
    }));

    const compileMethod: POIMethod = (
      currentState: POIState,
      ..._args: ValidStates[]
    ): POIState => {
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

  Identifier(_nameNode) {
    return this.sourceString;
  },

  NumberLiteral(_digits) {
    return parseInt(this.sourceString, 10);
  },

  ActionDegree(val) {
    return val.toPOIResponse();
  },

  QuotedString(_open, chars, _close) {
    return chars.sourceString;
  },

  Approach(_val) {
    return this.sourceString;
  },

  Skill(_val) {
    return this.sourceString;
  },
});
