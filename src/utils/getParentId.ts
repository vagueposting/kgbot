import { Guild } from "discord.js";

export async function getParentId(
  channelID: string,
  guild: Guild,
): Promise<string> {
  try {
    const channel = await guild.channels.fetch(channelID);

    const categoryID = channel?.parentId;

    if (categoryID) {
      return categoryID;
    } else {
      return "INVALID";
    }
  } catch {
    return "INVALID";
  }
}
