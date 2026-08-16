import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { convertToArray } from "./utility/convertToArray";
import { POI } from "../types/POItypes";
import Database from "better-sqlite3";
import { generateRandomString } from "./utility/generateRandomString";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poi")
    .setDescription("GM command group for Points of Interest")
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
    .addSubcommand(
      (group) =>
        group.setName("manage").setDescription("Manage POIs as a whole."), // TODO: add subcommand to read a POI.
    )
    .addSubcommandGroup((group) =>
      group.setName("responses").setDescription("Manage POI response actions."),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === "responses") {
      // logic for response handling
      return;
    }

    if (group === "manage") {
      // logic for group management
      return;
    }

    switch (subcommand) {
      case "create": {
        const poiName = interaction.options.getString("poi_name", true);

        const poiAliases = convertToArray(
          interaction.options.getString("poi_aliases") ?? "",
        );
        const poiActions = convertToArray(
          interaction.options.getString("poi_actions") ?? "",
        );

        const poi = new POI(poiName, poiAliases, poiActions);

        const db = new Database("../db/game.db");
        const insertStmt = db.prepare(
          "INSERT INTO poi (code, data) VALUES (?, ?)",
        );
        const randomID = generateRandomString(5);
        insertStmt.run(randomID, poi.toJSON());
        db.close();

        let replyContent = `Successfully created **${poi.name}** with ID code **${randomID}**.`;

        if (poiAliases.length === 0) {
          replyContent +=
            "\n***Note:** For player accessibility, it is heavily recommended to add aliases.*";
        }

        if (poiActions.length === 0) {
          replyContent +=
            '\n***Note:** Without any actions, characters can only passively "view" the items. Add actions for improved interactability.*';
        }

        await interaction.reply({
          content: replyContent,
          ephemeral: true,
        });

        db.close();
        break;
      }
    }
    return;
  },
};
