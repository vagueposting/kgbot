import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { convertToArray } from "./utility/convertToArray";
import { POIResponse } from "../types/responses";

module.exports = {
  data: new SlashCommandBuilder().setName("poi").addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription(
        "GM command. Sets a Point of Interest that can be accessed through aliases.",
      )
      .addStringOption((option) =>
        option
          .setName("PoI Name")
          .setDescription("Name of the point of interest")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("PoI aliases")
          .setDescription(
            "List all aliases for the point of interest, separated by commas.",
          ),
      )
      .addStringOption((option) =>
        option
          .setName("PoI actions")
          .setDescription(
            "List all actions (verbs) that can be done to the point of interest, separated by commas.",
          ),
      ),
  ),
  async execute(interaction: ChatInputCommandInteraction) {
    const selectedSubcommand = interaction.options.getSubcommand();

    switch (selectedSubcommand) {
      case "add":
        const poiName = interaction.options.getString("PoI Name");
        const poiAliases = convertToArray(
          interaction.options.getString("PoI aliases") ?? "",
        );
        const poiActions = convertToArray(
          interaction.options.getString("PoI actions") ?? "",
        );

        if (!poiAliases) {
          await interaction.reply({
            content:
              "For player accessibility, it is heavily recommended that Points of Interest have aliases.",
            ephemeral: true,
          });
        }

        if (!poiActions) {
          await interaction.reply({
            content:
              'Without any actions, player characters can only passively "view" the items. Add actions for improved interactability and flavor.',
          });
        }
        break;

      default:
        break;
    }
  },
};
