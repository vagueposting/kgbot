import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { convertToArray } from "./utility/convertToArray";
import { generateRandomString } from "./utility/generateRandomString";
import { POI } from "../types/POItypes";
import { DatabaseSync } from "node:sqlite";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poi")
    .setDescription("GM command group for Points of Interest")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create") // CREATE
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
    .addSubcommand((group) =>
      group
        .setName("manage") // MANAGE POINTS OF INTEREST
        .setDescription("Manage POIs as a whole."),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("responses") // RESPONSE CONTROLS
        .setDescription("Manage POI response actions"),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    switch (group) {
      case "manage":
        // logic for group management
        break;
      case "responses":
        // logic for response handling
        break;
      default:
        switch (subcommand) {
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

            const poi = new POI(
              poiName ?? generateRandomString(5),
              poiAliases,
              poiActions,
            );

            const db = new DatabaseSync("../db/game.db");

            const insertStmt = db.prepare(
              "INSERT INTO poi (name, data) VALUES (?, ?)",
            );
            insertStmt.run(poi.name, poi.toJSON());
        }
        break;
        break;
    }
  },
};
