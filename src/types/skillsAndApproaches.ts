// types/gameSpecs.ts

// 1. Runtime Array (Source of Truth)
export const ALL_APPROACHES = [
  "careful",
  "clever",
  "flashy",
  "forceful",
  "quick",
  "sneaky",
] as const;

export const ALL_SKILL_TAGS = [
  "homemaking",
  "sustainment",
  "skulduggery",
  "erudition",
  "athletics",
  "interfacing",
  "composure",
  "expression",
  "aesthetia",
  "dominion",
] as const;

// 2. Derived TypeScript Union Types (No duplicate typing!)
export type Approaches = (typeof ALL_APPROACHES)[number];
export type SkillTags = (typeof ALL_SKILL_TAGS)[number];
