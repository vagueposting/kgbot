import { Channel, Guild, TextBasedChannel } from "discord.js";

export async function resolveChannel<T extends Channel = TextBasedChannel>(
  guild: Guild,
  channelId: string,
): Promise<T | null> {
  const cached = guild.channels.cache.get(channelId);
  if (cached) return cached as T;

  try {
    const fetched = await guild.channels.fetch(channelId);
    return (fetched as T) ?? null;
  } catch {
    return null;
  }
}
