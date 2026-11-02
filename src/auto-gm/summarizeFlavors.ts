import { ResponseRoll } from "../types/POItypes";

export function summarizeFlavors(
  roll: ResponseRoll,
  which: "approach" | "skill",
): string {
  if (roll.flavors.length === 0) return "Any"; // unconditional outcome
  const pinned = new Set<string>();
  let anyWildcard = false;
  for (const f of roll.flavors) {
    const v = f[which];
    if (v === null) anyWildcard = true;
    else pinned.add(v);
  }
  return anyWildcard ? "Any" : [...pinned].join(", ");
}
