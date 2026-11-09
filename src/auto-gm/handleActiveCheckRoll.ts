import { Message, TextChannel } from "discord.js";
import { readPoiByCode } from "../utils/tableReaders";
import { readTupperLogMessage } from "./readTupperLogMessage";
import { clearRollSession, getActiveSession } from "./activeCheckManager";
import { parseDiceRoll } from "./parseDiceRoll";
import { RollStatus } from "../types/RollStatus";
import { Approaches, SkillTags } from "../types/skillsAndApproaches";
import { FlavorVariant, POIResponse } from "../types/POItypes";
import { ResponseRoll } from "../types/POItypes";
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

    const matched = findCheckIndex(
      responseObj,
      parsedRoll.approach ?? null,
      parsedRoll.skill ?? null,
    );
    const checkIndex = matched === -1 ? 0 : matched;

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

    const channel = (await message.guild!.channels.fetch(
      move.channelID,
    )) as TextChannel;

    if (channel) {
      await channel.send({
        content: `<@${move.player}> rolled **${parsedRoll.diceResult}** (Modified: **${roll}**)\n\n${outcomeNarrative}.`,
      });
    }
  } catch (err) {
    console.error("Error handling roll check:", err);
  }

  return true;
}

export function matchesFlavor(
  f: FlavorVariant,
  approach: Approaches | null,
  skill: SkillTags | null,
) {
  const approachOk = f.approach === null || f.approach === approach;
  const skillOk = f.skill === null || f.skill === skill;

  return approachOk && skillOk;
}

export function findCheckIndex(
  response: POIResponse,
  approach: Approaches | null,
  skill: SkillTags | null,
): number {
  let idx = response.checks.findIndex((r) =>
    r.flavors.some(
      (f) =>
        f.approach !== null &&
        f.skill !== null &&
        matchesFlavor(f, approach, skill),
    ),
  );
  if (idx !== -1) return idx;

  idx = response.checks.findIndex((r) =>
    r.flavors.some((f) => matchesFlavor(f, approach, skill)),
  );
  if (idx !== -1) return idx;

  return response.checks.findIndex((r) => r.flavors.length === 0);
}
