import { readTupperLogMessage } from "./readTupperLogMessage";
import { listPOIsInChannel } from "../utils/tableReaders";
import { parsePlayerIntent } from "./parsePlayerIntent";
import { POI, POIRow, ResponseRolls } from "../types/POItypes";
import { Message } from "discord.js";

interface ReadyResponse {
  text: string;
  checks: ResponseRolls[];
  channelID: string;
  locationID: string;
  messageID: string;
  playerID: string;
  actionKey: string;
  poiCode: string;
}

export async function fullPOIParser(
  message: Message,
): Promise<ReadyResponse | null> {
  const move = await readTupperLogMessage(message.embeds[0], message.guild!);
  if (!move.isValid) {
    console.log(
      "[POI Parser] Drop: readTupperLogMessage returned invalid move.",
    );
    return null;
  }

  const poiList = await listPOIsInChannel(move.channelID);
  if (!poiList.length) {
    console.log(
      `[POI Parser] Drop: No POIs found for target channel ID ${move.channelID}`,
    );
    return null;
  }

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

  if (!intent) {
    console.log(
      `[POI Parser] Drop: Could not parse intent from message: "${move.messageText}"`,
    );
    return null;
  }

  const targetPOI = potentialTargets.find((p) => p.code === intent.poiCode);
  if (!targetPOI) return null;

  const actionKey = intent.action
    ? targetPOI.resolveAction(intent.action)
    : "_";

  const response = targetPOI.evaluateResponse(actionKey, move.player);

  return {
    ...response,
    channelID: move.channelID,
    locationID: move.locationID,
    messageID: move.messageID,
    actionKey: actionKey,
    playerID: move.player,
    poiCode: targetPOI.code,
  };
}
