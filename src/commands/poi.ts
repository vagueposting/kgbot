import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { convertToArray } from "../utils/convertToArray";
import { POI, POIRow } from "../types/POItypes";
import { generateRandomString } from "../utils/generateRandomString";
import { getDb } from "../db/setup";
import { readAllPois, readPoiByCode } from "../utils/tableReaders";
import { paginateData } from "../utils/pagination";

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
    .addSubcommandGroup((group) =>
      group
        .setName("manage")
        .setDescription("Manage POIs as a whole.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("View all points of interest in the game."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("delete")
            .setDescription(
              "Delete a subcommand from the database. ⚠ THIS IS PERMANENT.",
            )
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "The unique 5-character code of the PoI you want to delete.",
                ),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group.setName("responses").setDescription("Manage POI response actions."),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === "responses") {
      return;
    }

    if (group === "manage") {
      switch (subcommand) {
        case "list":
          try {
            const rawPOIData = readAllPois();

            if (rawPOIData.length === 0) {
              await interaction.reply({
                content:
                  "**Error:** No points of interest found in the database.",
                flags: MessageFlags.Ephemeral,
              });
              break;
            }
            await paginateData(
              interaction,
              rawPOIData,
              5,
              (chunk: POI[]): EmbedBuilder => {
                const embed = new EmbedBuilder()
                  .setTitle(`Points of Interest`)
                  .setColor("Yellow");

                const description = chunk
                  .map(
                    (p) =>
                      `### ${p.name} - *${p.code}*\n**Aliases:** ${(p.aliases ?? []).join(", ") || "None"}\n**Responses:**\n${Object.keys(p.responses).join(" , ")}`,
                  )
                  .join("\n");
                embed.setDescription(description);

                return embed;
              },
            );
          } catch (error) {
            console.error("Error listing POIs:", error);
            await interaction.reply({
              content: "An error occurred while fetching POIs.",
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        case "delete":
          const target = interaction.options.getString("poi_code");
          const db = getDb();
          const deleterStmt = db.prepare(
            `DELETE FROM poi WHERE code = ? RETURNING *`,
          );
          const deletedPOI = deleterStmt.get(target);

          if (deletedPOI) {
            console.log(`PoI with the code ${target} has been deleted.`);
          } else {
            console.error(`PoI with the code ${target} does not exist.`);
          }
          break;
        default:
          break;
      }
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

        const randomID = generateRandomString(5);

        const poi = new POI(poiName, randomID, poiAliases, poiActions);

        const db = getDb();
        const insertStmt = db.prepare(
          `INSERT INTO poi (code, data) VALUES (?, ?)`,
        );
        insertStmt.run(poi.code, poi.toJSON());

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
          flags: MessageFlags.Ephemeral,
        });

        db.close();
        break;
      }
    }
  },
};
