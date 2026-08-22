import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { convertToArray } from "../utils/convertToArray";
import { POI, TruePOIConstructor } from "../types/POItypes";
import { generateRandomString } from "../utils/generateRandomString";
import { getDb } from "../db/setup";
import { readAllPois } from "../utils/tableReaders";
import { paginateData } from "../utils/pagination";
import { getPOICodes } from "../utils/autocomplete/poiCode";

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
            .setName("channel")
            .setDescription("Channel to place the point of interest in")
            .setRequired(true)
            .setAutocomplete(true),
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
              "Deletes a subcommand from the database. ⚠ THIS IS PERMANENT.",
            )
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "The unique 5-character code of the PoI you want to delete.",
                )
                .setAutocomplete(true),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("responses")
        .setDescription("Manage POI response actions.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("modify")
            .setDescription("Edit a response on a PoI")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription("5-character PoI code")
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addStringOption(
              (option) =>
                option
                  .setName("response")
                  .setDescription("Response to modify")
                  .setAutocomplete(true)
                  .setRequired(true), // TODO: Add option to change the response object
            ),
        ),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);
    const db = getDb();

    if (subcommand === "create") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "channel") {
        if (!interaction.guild) return interaction.respond([]);

        const validCategories = db
          .prepare<[], { id: string }>(/* sql */ `SELECT id FROM rp_categories`)
          .all()
          .map((row) => row.id);

        if (validCategories.length === 0) return interaction.respond([]);

        const choices = interaction.guild.channels.cache
          .filter((channel) => {
            if (!channel.isTextBased()) return false;

            const categoryID = channel.isThread()
              ? (channel.parent?.parentId ?? channel.parentId)
              : channel.parentId;

            return (
              typeof categoryID === "string" &&
              validCategories.includes(categoryID)
            );
          })
          .map((channel) => ({
            name: `#${channel.name}`,
            value: channel.id,
          }))
          .filter((choice) => choice.name && choice.value)
          .slice(0, 25);

        await interaction.respond(choices);
      }
    }

    if (group === "manage" && subcommand === "delete") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "delete") {
        await interaction.respond(getPOICodes(db));
      }
    }

    if (group === "responses" && subcommand === "modify") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "poi_code") {
        await interaction.respond(getPOICodes(db));
      } else if ((focusedOption.name = "response")) {
        const activePOI = interaction.options.getString("poi_code");

        if (!activePOI) {
          return { choices: [] };
        }

        const result = db
          .prepare<
            string[],
            { data: string }
          >(/* sql */ `SELECT data FROM poi WHERE code = ?`)
          .get(activePOI);

        if (!result) {
          return { choices: [] };
        }

        const choices = Object.keys(JSON.parse(result.data)).map(
          (key: string) => ({
            name: key,
            value: key,
          }),
        );

        await interaction.respond(choices);
      }
    }
  },

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
            if (!interaction.guild) return;

            const rawPOIData = await readAllPois(interaction.guild);

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
        const poiDetails: TruePOIConstructor = {
          name: interaction.options.getString("poi_name", true),
          code: generateRandomString(5),
          channel: interaction.options.getString("poi_channel", true),
          guild: interaction.guild,
          aliases: convertToArray(
            interaction.options.getString("poi_aliases") ?? "",
          ),
          actionsOrResponses: convertToArray(
            interaction.options.getString("poi_actions") ?? "",
          ),
        };

        const poi = await POI.create(poiDetails);

        const db = getDb();
        const insertStmt = db.prepare(
          `INSERT INTO poi (code, data) VALUES (?, ?)`,
        );
        insertStmt.run(poi.code, poi.toJSON(interaction));

        let replyContent = `Successfully created **${poi.name}** with ID code **${poiDetails.code}**.`;

        if (poiDetails.aliases.length === 0) {
          replyContent +=
            "\n***Note:** For player accessibility, it is heavily recommended to add aliases.*";
        }

        if (poiDetails.actionsOrResponses.length === 0) {
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
