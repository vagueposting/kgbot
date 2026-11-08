import {
  ALL_APPROACHES,
  ALL_SKILL_TAGS,
  Approaches,
  SkillTags,
} from "../types/skillsAndApproaches";
import fuzz from "fuzzball";

export interface ParsedRoll {
  skill?: SkillTags;
  approach?: Approaches;
  diceResult: number;
  rawMatchedTags: string[];
}

export function parseDiceRoll(messageText: string): ParsedRoll | null {
  const diceRegex = /`\s*🎲\s*(-?\d+)\s*`/;
  const diceMatch = messageText.match(diceRegex);

  if (!diceMatch) return null;

  const diceResult = parseInt(diceMatch[1], 10);

  const tagRegex = /[\[\{\(]([^\]\}\)]+)[\]\}\)]/g;
  const tags: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(messageText)) !== null) {
    tags.push(match[1].trim());
  }

  let bestSkill: SkillTags | undefined;
  let bestApproach: Approaches | undefined;

  for (const tag of tags) {
    if (!bestSkill) {
      const [match, score] =
        fuzz.extract(tag, ALL_SKILL_TAGS, { limit: 1 })[0] ?? [];
      if (match && score >= 75) bestSkill = match as SkillTags;
    }
    if (!bestApproach) {
      const [match, score] =
        fuzz.extract(tag, ALL_APPROACHES, { limit: 1 })[0] ?? [];
      if (match && score >= 75) bestApproach = match as Approaches;
    }
    if (bestSkill && bestApproach) break;
  }

  return {
    skill: bestSkill,
    approach: bestApproach,
    diceResult,
    rawMatchedTags: tags,
  };
}
