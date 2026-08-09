import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Pongs back and shows response time!"),
  async execute(interaction: ChatInputCommandInteraction) {
    const timeSentMs = interaction.createdTimestamp;
    const pongTime = Date.now();
    await interaction.reply(`Pong! That took ${pongTime - timeSentMs}ms.`);
  },
};
