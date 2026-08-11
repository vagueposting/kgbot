import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { convertToArray } from "./utility/convertToArray";
import { POI } from "../types/POItypes";

// function to create a point of interest
function createPOI(POIname: string, aliases: string[], actions: string[]): POI {
  return new POI(POIname, aliases, actions);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poi")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription(
          "GM command. Sets a Point of Interest that can be accessed through aliases.",
        )
        .addStringOption((option) =>
          option
            .setName("poi_name")
            .setDescription("Name of the point of interest")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("poi_aliases")
            .setDescription(
              "List all aliases for the point of interest, separated by commas.",
            ),
        )
        .addStringOption((option) =>
          option
            .setName("poi_actions")
            .setDescription(
              "List all actions (verbs) that can be done to the point of interest, separated by commas.",
            ),
        ),
    )
    .addSubcommandGroup((group) => group.setName("responses")),
  async execute(interaction: ChatInputCommandInteraction) {
    const selectedSubcommand = interaction.options.getSubcommand();

    switch (selectedSubcommand) {
      case "create":
        const poiName = interaction.options.getString("poi_name");
        const poiAliases = convertToArray(
          interaction.options.getString("poi_aliases") ?? "",
        );
        const poiActions = convertToArray(
          interaction.options.getString("poi_actions") ?? "",
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

        poiActions.forEach((action) => {
          // Open an 8 min window.
          // For each action in the list, create a message with a button.
          // Clicking on the button adds 8 minutes to the timer.
        });
        break;

      default:
        break;
    }
  },
};
