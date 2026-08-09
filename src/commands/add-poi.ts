import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("Add PoI")
    .setDescription(
      "GM command. Sets a Point of Interest that can be accessed through aliases.",
    )
    .addStringOption((option) =>
      option
        .setName("PoI Name")
        .setDescription("Name of the point of interest"),
    ),
};
