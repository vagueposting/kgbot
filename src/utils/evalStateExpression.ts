import { POIState } from "../types/POItypes";

export function evalStateExpression(expr: string, state: POIState): string {
  const trimmed = expr.trim();

  if (/^[a-zA-Z_]\w*$/.test(trimmed)) {
    return state[trimmed] !== undefined ? String(state[trimmed]) : "";
  }

  const match = trimmed.match(
    /^([a-zA-Z_]\w*|\d+)\s*([+\-*/])\s*([a-zA-Z_]\w*|\d+)$/,
  );

  if (!match) {
    return "";
  }

  const resolveOperand = (token: string): number | undefined => {
    if (/^\d+$/.test(token)) return Number(token);
    const val = state[token];
    return typeof val === "number" ? val : Number(val);
  };

  const left = resolveOperand(match[1]);
  const right = resolveOperand(match[3]);
  const op = match[2];

  if (
    left === undefined ||
    right === undefined ||
    Number.isNaN(left) ||
    Number.isNaN(right)
  ) {
    return "";
  }

  switch (op) {
    case "+":
      return String(left + right);
    case "-":
      return String(left - right);
    case "*":
      return String(left * right);
    case "/":
      return right === 0 ? "0" : String(left / right);
    default:
      return "";
  }
}
