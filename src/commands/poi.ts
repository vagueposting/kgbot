import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
  InteractionCallback,
} from "discord.js";
import { convertToArray } from "../utils/convertToArray";
import {
  parseActionGroups,
  POI,
  POIResponse,
  POIRow,
  TruePOIConstructor,
} from "../types/POItypes";
import { generateRandomString } from "../utils/generateRandomString";
import { getDb } from "../db/setup";
import {
  extractPOIData,
  getValidPOICategories,
  readAllPois,
  readPoiByCode,
} from "../utils/tableReaders";
import { paginateData } from "../utils/pagination";
import { fetchPOIData } from "../utils/autocomplete/fetchPOIData";
import { semantics } from "../utils/response_generator/respondscriptDefs";
import { parseResponseScript } from "../utils/parseResponse";

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
            .setDescription(
              "GM command. View all points of interest in the game.",
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("delete")
            .setDescription(
              "GM command. Deletes a subcommand from the database. ⚠ THIS IS PERMANENT.",
            )
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "The unique 5-character code of the PoI you want to delete.",
                )
                .setAutocomplete(true)
                .setRequired(true),
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
            .setDescription("GM command. Edit a response on a PoI")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription("5-character PoI code")
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("action")
                .setDescription(
                  "The action corresponding to the response you want to modify.",
                )
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("response_data")
                .setDescription(
                  "RespondScript definition for the response. Check RespondScript documentation for further details.",
                )
                .setRequired(true),
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

        const validCategories = await getValidPOICategories();
        if (validCategories.length === 0) return interaction.respond([]);

        const query = focusedOption.value.toString().toLowerCase();

        const choices = interaction.guild.channels.cache
          .filter((channel) => {
            if (channel.isThread()) return false;

            if (channel.type !== ChannelType.GuildText || !channel.parentId)
              return false;

            const isDirectChildOfValidCategory = validCategories.includes(
              channel.parentId,
            );

            const matchesQuery = channel.name.toLowerCase().includes(query);

            return isDirectChildOfValidCategory && matchesQuery;
          })
          .first(25)
          .map((channel) => ({
            name: `#${channel.name}`.slice(0, 100),
            value: channel.id,
          }));

        await interaction.respond(choices);
      }
    }

    if (group === "manage") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "poi_code") {
        const choices = fetchPOIData(
          focusedOption.value.toString(),
          interaction,
        );
        await interaction.respond(choices);
      }
    }

    if (group === "responses") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "poi_code") {
        const choices = fetchPOIData(
          focusedOption.value.toString(),
          interaction,
        );
        await interaction.respond(choices);
      } else if (focusedOption.name === "action") {
        const activePOI = interaction.options.getString("poi_code");

        if (!activePOI) {
          return await interaction.respond([]);
        }

        const result = await extractPOIData(activePOI);

        if (!result || !result.responses) {
          return await interaction.respond([]);
        }

        const query = focusedOption.value.toString().toLowerCase();

        const choices = Object.keys(result.responses)
          .filter((key) => key.toLowerCase().includes(query))
          .slice(0, 25)
          .map((key: string) => ({
            name: key,
            value: key,
          }));

        await interaction.respond(choices);
      }
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

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
                  .map((p) => {
                    const parentCategory =
                      interaction.guild?.channels.cache.get(p.channel)?.parent!
                        .name;

                    return `### ${p.name} - \`${p.code}\`
                    <#${p.channel}> [${parentCategory}]
                    ⠀**Aliases:** 
                    ⠀⠀${(p.aliases ?? []).join(", ") || "None"}
                    ⠀**Responds to:**
                    ⠀⠀${Object.keys(p.responses).join(", ")}`;
                  })
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

    if (group === "responses") {
      switch (subcommand) {
        case "modify":
          const poiCode = interaction.options.getString("poi_code");
          const action = interaction.options.getString("action");
          const responseCode = interaction.options.getString("response_data");
          if (typeof responseCode !== "string" || !poiCode || !action) return;

          const newResponse = parseResponseScript(responseCode);
          const targetPOI = await readPoiByCode(poiCode);

          if (targetPOI !== undefined) {
            await targetPOI.modifyResponse(action, newResponse);
          }

          break;
      }
      return;
    }

    switch (subcommand) {
      case "create": {
        const rawActions = interaction.options.getString("poi_actions") ?? "";
        const { canonicalActions, aliasMap } = parseActionGroups(rawActions);
        const poiDetails: TruePOIConstructor = {
          name: interaction.options.getString("poi_name", true),
          code: generateRandomString(5),
          channel: interaction.options.getString("channel", true),
          guild: interaction.guild,
          aliases: convertToArray(
            interaction.options.getString("poi_aliases") ?? "",
          ),
          actionsOrResponses: canonicalActions, // Only initializes primary keys
        };

        const poi = await POI.create(poiDetails);
        poi.actionAliases = aliasMap;

        const db = getDb();
        const insertStmt = db.prepare(
          `INSERT INTO poi (code, category, data) VALUES (?, ?, ?)`,
        );
        insertStmt.run(
          poi.code,
          interaction.guild?.channels.cache.get(poi.channel)!.parentId,
          poi.toJSON(),
        );

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
        break;
      }
    }
  },
};
