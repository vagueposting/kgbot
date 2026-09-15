import {
  ChatInputCommandInteraction,
  MessageFlags,
  InteractionReplyOptions,
} from "discord.js";

export async function defaultReplyStyle(
  interaction: ChatInputCommandInteraction,
  options: InteractionReplyOptions,
) {
  const isPublic = interaction.options.getBoolean("public") ?? false;

  const flags = isPublic
    ? options.flags
    : (options.flags ?? MessageFlags.Ephemeral);

  return await interaction.reply({
    ...options,
    flags,
  });
}
