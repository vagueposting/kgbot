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

export type RollOutcomeData = {
  flavor?: string;
  successText: string;
  failureText?: string;
};

semantics.addOperation("toPOIResponse", {
  _iter(...children) {
    return children.map((c) => c.toPOIResponse());
  },

  Program(stateDecls, defaultDisplay, statements) {
    const calledState = stateDecls.children.map((decl) => decl.toPOIResponse());
    const baseText = defaultDisplay.toPOIResponse();

    const evaluatedStatements = statements.children.map((s) =>
      s.toPOIResponse(),
    );

    const response = new POIResponse(baseText, evaluatedStatements);

    function collectMethodCalls(stmts: any[]) {
      for (const stmt of stmts) {
        if (stmt.type === "methodCall") {
          response.methodCalls.push(...stmt.keys);
        } else if (stmt.type === "conditional") {
          if (stmt.ifBranch?.statements)
            collectMethodCalls(stmt.ifBranch.statements);
          if (stmt.elseIfBranches) {
            for (const elseIf of stmt.elseIfBranches) {
              if (elseIf.statements) collectMethodCalls(elseIf.statements);
            }
          }
          if (stmt.elseBranch?.statements)
            collectMethodCalls(stmt.elseBranch.statements);
        }
      }
    }

    collectMethodCalls(evaluatedStatements);

    for (const stmt of evaluatedStatements) {
      if (stmt.type === "roll") {
        response.addCheck({
          modifier: stmt.modifier,
          approach: stmt.approaches,
          skill_tag: stmt.skills,
          success: stmt.successText,
          failure: stmt.failureText,
        });
      }
    }

    return response;
  },

  ConditionalBlock(ifClause, elseIfClause, elseClause, _end) {
    return {
      type: "conditional",
      ifBranch: ifClause.toPOIResponse(),
      elseIfBranches: elseIfClause.children.map((c) => c.toPOIResponse()),
      elseBranch:
        elseClause.children.length > 0
          ? elseClause.children[0].toPOIResponse()
          : undefined,
    };
  },

  IfClause(_open, conditionNode, _close, statementNode) {
    return {
      condition: conditionNode.toPOIResponse(),
      statements: statementNode.children.map((s) => s.toPOIResponse()),
    };
  },

  ElseIfClause(_open, conditionNode, _close, statementsNode) {
    return {
      condition: conditionNode.toPOIResponse(),
      statements: statementsNode.children.map((s) => s.toPOIResponse()),
    };
  },

  ElseClause(_open, _close, statementsNode) {
    return {
      statements: statementsNode.children.map((s) => s.toPOIResponse()),
    };
  },

  Condition(idNode, compNode, valNode) {
    return {
      identifier: idNode.toPOIResponse(),
      comparator: compNode.toPOIResponse(),
      value: valNode.toPOIResponse(),
    };
  },

  Comparator(node) {
    return node.sourceString;
  },

  Value(valNode) {
    return valNode.toPOIResponse();
  },

  BooleanLiteral(node) {
    return node.sourceString === "true";
  },

  StringLiteral(_open, chars, _close) {
    return chars.sourceString;
  },

  NumberLiteral(_digits) {
    return Number(this.sourceString);
  },

  Identifier(node) {
    return node.sourceString;
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

  ModifierLiteral(signNode, digitsNode) {
    const sign = signNode.sourceString === "-" ? -1 : 1;
    return sign * Number(digitsNode.sourceString);
  },

  RollDeclaration(
    _open,
    modNode,
    _pipe1,
    approachesNode,
    _pipe2,
    skillsNode,
    _close,
    outcomesNode,
    _end,
  ) {
    const approaches = approachesNode.asIteration().toPOIResponse();
    const skills = skillsNode.asIteration().toPOIResponse();

    const outcomes: RollOutcomeData[] = outcomesNode.children.map((child) =>
      child.toPOIResponse(),
    );

    // Extract primary outcome branch texts
    const primaryOutcome = outcomes[0];
    const successText = primaryOutcome?.successText ?? "";
    const failureText = primaryOutcome?.failureText;

    return {
      type: "roll",
      modifier: modNode.toPOIResponse(), // Evaluated integer (e.g. 2, -1, 0)
      approaches: approaches.flat(),
      skills: skills.flat(),
      successText,
      failureText,
      outcomes,
    };
  },

  RollOutcome(flavorNode, succeedNode, failNode) {
    const flavor =
      flavorNode.children.length > 0
        ? flavorNode.children[0].toPOIResponse()
        : undefined;

    const successText = succeedNode.toPOIResponse();

    const failureText =
      failNode.children.length > 0
        ? failNode.children[0].toPOIResponse()
        : undefined;

    return {
      flavor,
      successText,
      failureText,
    };
  },

  RollSucceed(_open, statements) {
    return statements.children.map((s) => s.toPOIResponse()).join("");
  },

  RollFail(_open, statements) {
    return statements.children.map((s) => s.toPOIResponse()).join("");
  },

  FlavorVariant(_open, approachNode, _pipe, skillNode, _close) {
    return this.sourceString;
  },
});
