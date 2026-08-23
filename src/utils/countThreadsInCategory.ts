import { ChannelType, Guild } from "discord.js";

export async function countThreadsInCategory(guild: Guild, categoryId: string) {
  const parentChannels = guild.channels.cache.filter(
    (channel) =>
      channel.parentId === categoryId &&
      (channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildForum),
  );

  let totalActive = 0;
  let totalArchived = 0;

  for (const [_, channel] of parentChannels) {
    if (!channel) continue;
    if (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildForum
    ) {
      try {
        const activeThreads = await channel.threads.fetchActive();
        totalActive += activeThreads.threads.size;

        const archivedThreads = await channel.threads.fetchArchived();
        totalArchived += archivedThreads.threads.size;
      } catch (error) {
        console.error(
          `Failed to fetch threads for channel ${channel.id}:`,
          error,
        );
      }
    }
  }

  const totalThreads = totalActive + totalArchived;

  return {
    active: totalActive,
    total: totalThreads,
    string: `${totalActive}/${totalThreads}`,
  };
}
