import { Message } from "discord.js";
import { readPoiByCode } from "../utils/tableReaders";
import { readTupperLogMessage } from "./readTupperLogMessage";
import { clearRollSession, getActiveSession } from "./activeCheckManager";
import { parseDiceRoll } from "./parseDiceRoll";
import { RollStatus } from "../types/RollStatus";
import { Approaches, SkillTags } from "../types/skillsAndApproaches";
import { POIResponse } from "../types/POItypes";
import { ResponseRolls } from "../types/POItypes";
import { ParsedRoll } from "./parseDiceRoll";
import { ActiveCheckSession } from "../types/ActiveCheckSession";

/**
 * Intercepts incoming messages to check if they complete an active POI roll check.
 * @returns {Promise<boolean>} True if the message was processed as an active roll check; false otherwise.
 */
export async function handleActiveCheckRoll(
  message: Message,
): Promise<boolean> {
  const move = await readTupperLogMessage(message.embeds[0], message.guild!);
  if (!move.isValid) return false;

  const session = getActiveSession(move.channelID, move.player);
  if (!session) return false;

  const parsedRoll = parseDiceRoll(move.messageText);
  if (!parsedRoll) return false;

  // TODO: apply this in the roll reply.
  const itemLocation = session.locationID;

  clearRollSession(move.channelID, move.player);

  const mod = session.checkData.modifier ?? 0;
  const roll = parsedRoll.diceResult + mod;
  let rollStatus = {
    isSuccess: roll > 0 ? true : false,
    degreeOfSuccess: roll,
  } as RollStatus;

  const playerMods = getSkillAndApproachFromRoll(session, parsedRoll);

  try {
    const poi = await readPoiByCode(session.poiCode, message.guild!);
    if (!poi) return true;

    const actionKey = poi.resolveAction(session.actionKey);
    const responseObj = poi.responses[actionKey];

    if (!responseObj) {
      console.error(
        `[ActiveCheck] Missing response object for key: ${actionKey}`,
      );
      return true;
    }

    const checkIndex = findCheckIndex(
      responseObj,
      playerMods.approachUsed,
      playerMods.tagOfSkillUsed,
    );

    const outcomeNarrative = responseObj.renderCheckOutcome(
      checkIndex,
      rollStatus,
      poi.state.parsed,
    );

    for (const methodName of responseObj.methodCalls) {
      if (poi.methods[methodName]) {
        poi.execMethod(methodName);
      }
    }

    poi.writeToData();
  } catch (err) {
    console.error("Error handling roll check:", err);
  }

  return true;
}

function getSkillAndApproachFromRoll(
  session: ActiveCheckSession,
  parsedRoll: ParsedRoll,
) {
  const { checkData } = session;

  // TODO: rewrite skill getter to fit the upcoming Player object
  const rolledSkill = parsedRoll.skill as SkillTags | undefined;
  const rolledApproach = parsedRoll.approach as Approaches | undefined;

  const requiredSkill = Boolean(checkData.skill_tag?.length);
  const isValidSkill =
    !requiredSkill ||
    (rolledSkill && checkData.skill_tag!.includes(rolledSkill));

  const requiredApproach = Boolean(checkData.skill_tag?.length);
  const isValidApproach =
    !requiredApproach ||
    (rolledApproach && checkData.approach!.includes(rolledApproach));

  const tagOfSkillUsed: SkillTags | undefined = isValidSkill
    ? rolledSkill
    : undefined;
  const approachUsed: Approaches | undefined = isValidApproach
    ? rolledApproach
    : undefined;

  return {
    tagOfSkillUsed,
    approachUsed,
  };
}

function findCheckIndex(
  responseObject: POIResponse,
  approachUsed: Approaches | undefined,
  tagsOfSkillUsed: SkillTags | undefined,
): number {
  const matchesApproach = (check: ResponseRolls) =>
    approachUsed && check.approach?.includes(approachUsed);

  const matchesSkill = (check: ResponseRolls) =>
    tagsOfSkillUsed && check.skill_tag?.includes(tagsOfSkillUsed);

  let checkIndex = responseObject.checks.findIndex(
    (check) => matchesApproach(check) && matchesSkill(check),
  );

  if (checkIndex === -1) {
    checkIndex = responseObject.checks.findIndex(
      (check) => matchesApproach(check) || matchesSkill(check),
    );
  }

  if (checkIndex === -1) {
    checkIndex = responseObject.checks.findIndex(
      (check) => !check.approach?.length && !check.skill_tag?.length,
    );
  }

  return checkIndex;
}
