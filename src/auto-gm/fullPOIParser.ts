import { readTupperLogMessages } from "./readTupperLogMessages";
import { listPOIsInChannel } from "../utils/tableReaders";
import { parsePlayerIntent } from "./parsePlayerIntent";
import { POI, POIRow, ResponseRolls } from "../types/POItypes";
import { Message } from "discord.js";

interface ReadyResponse {
  text: string;
  checks: ResponseRolls[];
  channelID: string;
  messageID: string;
  playerID: string;
  poiCode: string;
}

export async function fullPOIParser(
  message: Message,
): Promise<ReadyResponse | null> {
  const move = await readTupperLogMessages(message.embeds[0], message.guild!);
  if (!move.isValid) return null;

  const poiList = await listPOIsInChannel(move.channelID);
  if (!poiList.length) return null;

  const potentialTargets: POI[] = await Promise.all(
    poiList.map((row: POIRow) => POI.fromRow(row, message.guild!)),
  );

  const formattedPOIsForParser = potentialTargets.map((poi) => ({
    code: poi.code,
    namesAndAliases: [poi.name, ...poi.aliases],
    validActions: [
      ...Object.keys(poi.responses),
      ...Object.keys(poi.actionAliases),
    ],
  }));

  const intent = parsePlayerIntent(move.messageText, formattedPOIsForParser);

  if (!intent) return null;

  const targetPOI = potentialTargets.find((p) => p.code === intent.poiCode);
  if (!targetPOI) return null;

  const actionKey = intent.action
    ? targetPOI.resolveAction(intent.action)
    : "_";

  const response = targetPOI.evaluateResponse(actionKey, move.player);

  return {
    ...response,
    channelID: move.channelID,
    messageID: move.messageID,
    playerID: move.player,
    poiCode: targetPOI.code,
  };
}
