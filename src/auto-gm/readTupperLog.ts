import { Embed, Guild } from "discord.js";
import { matchTupperboxLogID } from "../utils/idMatchers";
import { validatePOICategory } from "../utils/tableReaders";
import { resolveChannel } from "../utils/resolveChannel";

export interface InvalidGameMove {
  isValid: false;
  reason?: string; // Optional context.
}

export interface ValidGameMove {
  isValid: true;
  messageText: string;
  messageID: string;
  player: string;
}

export type GameMove = InvalidGameMove | ValidGameMove;

export async function readTupperLog(
  embed: Embed,
  guild: Guild,
): Promise<GameMove> {
  const messageIDs = {
    user: matchTupperboxLogID(embed.fields[0]),
    channel: matchTupperboxLogID(embed.fields[1]),
    message: embed.footer?.text.replace("Message ID ", ""),
  };
  const messageText = embed.description ? embed.description : "";
  let invalidMove: GameMove = {
    isValid: false,
  };

  if (!messageIDs.channel || !messageIDs.user || !messageIDs.message)
    return invalidMove;

  const originalChannel = await resolveChannel(guild, messageIDs.channel);
  if (
    !originalChannel ||
    originalChannel.isDMBased() ||
    originalChannel.isVoiceBased()
  )
    return invalidMove;

  const categoryID = originalChannel.isThread()
    ? originalChannel.parent?.parentId
    : originalChannel.parentId;

  if (!categoryID) return invalidMove;

  const areThereItems = await validatePOICategory(categoryID);

  if (!areThereItems) return invalidMove;

  return {
    isValid: true,
    messageText,
    messageID: messageIDs.message,
    player: messageIDs.user,
  };
}
