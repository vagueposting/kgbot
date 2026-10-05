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
  const diceRegex = /`?\s*🎲\s*(\d+)\s*`?/i;
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
    const skillMatch = fuzz.extract(
      tag,
      ALL_SKILL_TAGS as unknown as string[],
      {
        scorer: fuzz.ratio,
        limit: 1,
      },
    )[0];

    if (skillMatch && skillMatch[1] >= 75) {
      bestSkill = skillMatch[0] as SkillTags;
    }

    const approachMatch = fuzz.extract(
      tag,
      ALL_APPROACHES as unknown as string[],
      {
        scorer: fuzz.ratio,
        limit: 1,
      },
    )[0];

    if (approachMatch && approachMatch[1] >= 75) {
      bestApproach = approachMatch[0] as Approaches;
    }
  }

  return {
    skill: bestSkill,
    approach: bestApproach,
    diceResult,
    rawMatchedTags: tags,
  };
}
