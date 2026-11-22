import { POIResponse } from "../../types/POItypes";
import { Approaches, SkillTags } from "../../types/skillsAndApproaches";
import { normalizeTitleCase } from "../syntaxManagement";
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
  flavors?: Array<{
    approach: Approaches | null;
    skill: SkillTags | null;
  }>;
  successText: string;
  failureText?: string;
};

semantics.addOperation("toPOIResponse", {
  _iter(...children) {
    return children.map((c) => c.toPOIResponse());
  },

  Program(defaultDisplay, statements) {
    const baseText = defaultDisplay.toPOIResponse();

    const evaluatedStatements = statements.children.map((s) =>
      s.toPOIResponse(),
    );

    const response = new POIResponse(baseText, evaluatedStatements);

    for (const stmt of evaluatedStatements) {
      if (stmt.type === "roll" && stmt.checks) {
        for (const check of stmt.checks) {
          response.addCheck(check);
        }
      }
      if (stmt.type === "methodCall" && stmt.keys) {
        for (const key of stmt.keys) {
          response.methodCalls.push(key);
        }
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

  ElseClause(_marker, statementsNode) {
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

  NumberLiteral(digitsNode) {
    return Number(digitsNode.sourceString);
  },

  Identifier(node) {
    return node.sourceString;
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

  plainText(charsNode) {
    return charsNode.sourceString;
  },

  EmbedState(_open, opNode, _close) {
    return `\${state.${opNode.toPOIResponse()}}`;
  },

  IdentifierOperation(idNode, operandNode, rhsNode) {
    const id = idNode.toPOIResponse();

    if (operandNode.children.length === 0 || rhsNode.children.length === 0) {
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
    const defaultApproaches =
      approachesNode.children.length > 0
        ? approachesNode.children[0].asIteration().toPOIResponse()
        : [];
    const defaultSkills =
      skillsNode.children.length > 0
        ? skillsNode.children[0].asIteration().toPOIResponse()
        : [];

    const outcomes: RollOutcomeData[] = outcomesNode.children.map((child) =>
      child.toPOIResponse(),
    );

    const checks = outcomes.map((o) => {
      const flavorApproaches = o.flavors
        ?.map((f) => f.approach)
        .filter(Boolean) as Approaches[];
      const flavorSkills = o.flavors
        ?.map((f) => f.skill)
        .filter(Boolean) as SkillTags[];

      return {
        modifier: modNode.toPOIResponse(),
        approach:
          flavorApproaches.length > 0 ? flavorApproaches : defaultApproaches,
        skill_tag: flavorSkills.length > 0 ? flavorSkills : defaultSkills,
        success: o.successText,
        failure: o.failureText,
        flavors: o.flavors,
      };
    });

    return {
      type: "roll",
      modifier: modNode.toPOIResponse(),
      approaches: defaultApproaches,
      skills: defaultSkills,
      checks,
    };
  },

  RollOutcome(flavorNodes, succeedNode, failNode) {
    const flavors = flavorNodes.children.map((c) => c.toPOIResponse());
    const successText = succeedNode.toPOIResponse();
    const failureText =
      failNode.children.length > 0
        ? failNode.children[0].toPOIResponse()
        : undefined;

    return {
      flavors: flavors.length > 0 ? flavors : undefined,
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

  FlavorVariant(
    _open,
    approachNode,
    _pipe,
    skillNode,
    _close,
  ): { approach: Approaches | null; skill: SkillTags | null } {
    const approach =
      approachNode.children.length > 0
        ? normalizeTitleCase<Approaches>(
            approachNode.sourceString.trim() as Approaches,
          )
        : null;

    const skill =
      skillNode.children.length > 0
        ? normalizeTitleCase<SkillTags>(
            skillNode.sourceString.trim() as SkillTags,
          )
        : null;

    return { approach, skill };
  },
});
