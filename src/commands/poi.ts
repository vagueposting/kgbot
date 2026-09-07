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
import { parseMethodScript } from "../utils/parseMethod";

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
        )
        .addStringOption((option) =>
          option
            .setName("poi_group")
            .setDescription("Group that the POI is part of. Optional."),
        )
        .addBooleanOption((option) =>
          option
            .setName("poi_exemptable")
            .setDescription(
              "Will this POI have its own activity switch? False by default.",
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
    )
    .addSubcommandGroup((group) =>
      group
        .setName("methods")
        .setDescription("Command group for managing methods.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("GM command. Add a method to the POI.")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription("Code for the POI you want to add a method to.")
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addStringOption((option) =>
              option
                .setName("method_name")
                .setDescription(
                  "Name of the method that you are adding to the POI.",
                )
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("method_script")
                .setDescription(
                  "MethodScript that shows what it does.See documentation.",
                )
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove") // TODO: add exec and autocomplete
            .setDescription("GM command. Removes a method from a POI.")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI with the method you want to remove.",
                )
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("method_name")
                .setDescription("Name of the method you want to remove.")
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

    if (group === "methods") {
      const focusedOption = interaction.options.getFocused(true);
      if (focusedOption.name === "poi_code") {
        const choices = fetchPOIData(
          focusedOption.value.toString(),
          interaction,
        );
        await interaction.respond(choices);
      }

      if (subcommand === "remove" && focusedOption.name === "method_name") {
        const targetPOI = interaction.options.getString("poi_code", true);

        const poi = await extractPOIData(targetPOI);

        if (!poi) return;

        const choices = Object.keys(poi.methods).map((m) => ({
          name: m,
          value: m,
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
                      interaction.guild?.channels.cache.get(p.channel)?.parent
                        ?.name ?? "Unknown";

                    const formattedActions = Object.keys(p.responses).map(
                      (canonicalKey) => {
                        const synonyms = Object.entries(p.actionAliases ?? {})
                          .filter(
                            ([alias, target]) =>
                              target === canonicalKey && alias !== canonicalKey,
                          )
                          .map(([alias]) => alias);

                        return synonyms.length > 0
                          ? `**${canonicalKey}** (*${synonyms.join(", ")}*)`
                          : `**${canonicalKey}**`;
                      },
                    );

                    return `### ${p.name} - \`${p.code}\`
            <#${p.channel}> [${parentCategory}]
            ⠀**Aliases:** 
            ⠀⠀${(p.aliases ?? []).join(", ") || "None"}
            ⠀**Responds to:**
            ⠀⠀${formattedActions.join(", ") || "None"}`;
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
          let message: string;

          if (deletedPOI) {
            console.log(`PoI with the code ${target} has been deleted.`);
            message = `Successfully deleted POI with code ${target}.`;
          } else {
            console.error(`PoI with the code ${target} does not exist.`);
            message = `A POI with the code ${target} does not exist.`;
          }

          await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
          });
          break;
        default:
          break;
      }
      return;
    }

    if (group === "responses") {
      switch (subcommand) {
        case "modify": {
          const poiCode = interaction.options.getString("poi_code");
          const action = interaction.options.getString("action");
          const responseCode = interaction.options.getString("response_data");
          if (typeof responseCode !== "string" || !poiCode || !action) return;
          let message: string;

          const newResponse = parseResponseScript(responseCode);
          const targetPOI = await readPoiByCode(poiCode);

          if (targetPOI !== undefined) {
            await targetPOI.modifyResponse(action, newResponse);
            message = `POI **${poiCode}** successfully modified!`;
          } else {
            message = `POI **${poiCode}** does not exist. Maybe there's a typo?`;
          }

          await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
          });

          break;
        }
      }
      return;
    }

    if (group === "methods") {
      switch (subcommand) {
        case "add": {
          const targetPOI = interaction.options.getString("poi_code", true);
          const methodName = interaction.options.getString("method_name", true);
          const methodScript = interaction.options.getString(
            "method_script",
            true,
          );
          let message: string;

          const poi = await extractPOIData(targetPOI);

          if (poi) {
            if (!poi.methods[methodName])
              throw new Error(`Method under ${methodName} does not exist.`);

            poi.registerMethod(methodName, methodScript);
            message = `Succcessfully registered method \`${methodName}\` under POI **${targetPOI}**`;
          } else {
            message = `Could not register \`${methodName}\` under POI **${targetPOI}** Reason: ${targetPOI} does not exist.`;
          }

          await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
          });

          break;
        }
        case "remove": {
          const targetPOI = interaction.options.getString("poi_code", true);
          const methodName = interaction.options.getString("method_name", true);
          let message: string;

          const poi = await extractPOIData(targetPOI);

          if (poi) {
            if (!poi.methods[methodName])
              throw new Error(`Method under ${methodName} does not exist.`);

            poi.removeMethod(methodName);
            message = `Removed \`${methodName}\` under POI **${targetPOI}** Reason: ${targetPOI} does not exist.`;
          } else {
            message = `Could not remove  \`${methodName}\` under POI **${targetPOI}** Reason: ${targetPOI} does not exist.`;
          }

          await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }
      }
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
          group: interaction.options.getString("poi_group") ?? "",
          shouldBeExempt:
            interaction.options.getBoolean("poi_exemptable") ?? false,
        };

        const poi = await POI.create(poiDetails);
        poi.actionAliases = aliasMap;

        const db = getDb();
        const insertStmt = db.prepare(
          `INSERT INTO poi (code, channel, category, "group", data) VALUES (?, ?, ?, ?, ?)`,
        );
        insertStmt.run(
          poi.code,
          poi.channel,
          interaction.guild?.channels.cache.get(poi.channel)!.parentId,
          poi.group,
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
