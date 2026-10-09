import { Embed, Guild } from "discord.js";
import { matchTupperboxLogID } from "../utils/idMatchers";
import { validatePOICategory } from "../utils/tableReaders";
import { resolveChannel } from "../utils/resolveChannel";

export interface InvalidGameMove {
  isValid: false;
  reason?: string;
}

export interface ValidGameMove {
  isValid: true;
  messageText: string;
  messageID: string;
  channelID: string;
  locationID: string;
  player: string;
}

export type GameMove = InvalidGameMove | ValidGameMove;

export async function readTupperLogMessage(
  embed: Embed,
  guild: Guild,
): Promise<GameMove> {
  const invalidMove: GameMove = { isValid: false };

  const fields = embed.data?.fields ?? embed.fields ?? [];

  const messageIDs = {
    user: matchTupperboxLogID(fields[0]),
    channel: matchTupperboxLogID(fields[1]),
    message: embed.footer?.text.replace("Message ID ", ""),
  };

  if (!messageIDs.channel || !messageIDs.user || !messageIDs.message) {
    console.log(
      "[readTupperLog] Drop: Failed to extract IDs from Tupperbox embed",
      messageIDs,
    );
    return invalidMove;
  }

  const messageText = embed.description ? embed.description : "";

  const originalChannel = await resolveChannel(guild, messageIDs.channel);
  if (
    !originalChannel ||
    originalChannel.isDMBased() ||
    originalChannel.isVoiceBased()
  ) {
    console.log(
      `[readTupperLog] Drop: Channel ${messageIDs.channel} could not be resolved or is invalid type.`,
    );
    return invalidMove;
  }

  let categoryID: string | null | undefined;
  let locationID: string | null | undefined;

  if (originalChannel.isThread()) {
    const parentTextChannel =
      originalChannel.parent ??
      (originalChannel.parentId
        ? await resolveChannel(guild, originalChannel.parentId)
        : null);

    categoryID = parentTextChannel?.parentId;
    locationID = originalChannel.parentId;
  } else {
    categoryID = originalChannel.parentId;
    locationID = originalChannel.id;
  }

  if (locationID === null) return invalidMove;

  if (!categoryID) {
    console.log(
      `[readTupperLog] Drop: Missing Category ID for channel ${originalChannel.id} (Parent Category is null)`,
    );
    return invalidMove;
  }

  const areThereItems = await validatePOICategory(categoryID);
  if (!areThereItems) {
    console.log(
      `[readTupperLog] Drop: Category ID ${categoryID} returned false from validatePOICategory`,
    );
    return invalidMove;
  }

  return {
    isValid: true,
    messageText,
    messageID: messageIDs.message,
    channelID: originalChannel.id,
    locationID: locationID,
    player: messageIDs.user,
  };
}
