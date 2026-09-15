import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
  InteractionCallback,
  NewsChannel,
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
  getValidPOICategories,
  readAllPois,
  readPoiByCode,
} from "../utils/tableReaders";
import { paginateData } from "../utils/pagination";
import { fetchPOIData } from "../utils/autocomplete/fetchPOIData";
import { semantics } from "../utils/response_generator/respondscriptDefs";
import { parseResponseScript } from "../utils/parseResponse";
import { parseMethodScript } from "../utils/parseMethod";
import { isStateEqual, parseStateScript } from "../utils/parseState";
import { defaultReplyStyle } from "../utils/defaultReplyStyle";

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
            .setName("name")
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
          option.setName("state").setDescription("State setup code."),
        )
        .addStringOption((option) =>
          option
            .setName("aliases")
            .setDescription(
              "List all aliases for the point of interest, separated by commas.",
            ),
        )
        .addStringOption((option) =>
          option
            .setName("actions")
            .setDescription(
              "List all actions (verbs) that can be done to the point of interest, separated by commas.",
            ),
        )
        .addStringOption((option) =>
          option
            .setName("group")
            .setDescription("Group that the POI is part of. Optional."),
        )
        .addBooleanOption((option) =>
          option
            .setName("exemptable")
            .setDescription(
              "Will this POI have its own activity switch? False by default.",
            ),
        )
        .addBooleanOption((option) =>
          option
            .setName("public")
            .setDescription(
              "Set to true to show this message to everyone in the channel. (False by default.)",
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
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
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
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("view")
            .setDescription("GM command. View an individual response's code.")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI whose response you want to view.",
                )
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("action")
                .setDescription("Action in the POI that you want to view.")
                .setAutocomplete(true)
                .setRequired(true),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
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
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (Default: False)",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
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
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (Default: False)",
                ),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("aliases")
        .setDescription("Command group for POI aliases.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("view")
            .setDescription("GM command. View response aliases.")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI whose aliases you want to view.",
                )
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("override")
            .setDescription(
              "Overrides the actions and aliases list with a new set.",
            )
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI whose aliases you want to edit.",
                )
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addStringOption((option) =>
              option
                .setName("new_aliases")
                .setDescription("The new list of aliases."),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("state")
        .setDescription("Command group for states.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("view")
            .setDescription("GM command. Prints the current state of the State")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI whose state you want to view.",
                )
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("set")
            .setDescription("GM command. Sets the base state of the POI.")
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription("Code for the POI whose state you want to set.")
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addStringOption((option) =>
              option
                .setName("state_list")
                .setDescription("The assignment for all item states.")
                .setRequired(true),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("reset")
            .setDescription(
              "GM command. Resets the current state to the base form.",
            )
            .addStringOption((option) =>
              option
                .setName("poi_code")
                .setDescription(
                  "Code for the POI whose state you want to reset.",
                )
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addBooleanOption((option) =>
              option
                .setName("public")
                .setDescription(
                  "Set to true to show this message to everyone in the channel. (False by default.)",
                ),
            ),
        ),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const guild = interaction.guild;
    if (!guild) return;
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);
    const focusedOption = interaction.options.getFocused(true);

    // poi_code gets used repeatedly so let's just
    // factor this out.

    if (focusedOption.name === "poi_code") {
      const choices = fetchPOIData(focusedOption.value.toString(), interaction);
      await interaction.respond(choices);
      return;
    }

    if (subcommand === "create") {
      if (focusedOption.name === "channel") {
        if (!interaction.guild) return interaction.respond([]);

        const validCategories = await getValidPOICategories();
        if (validCategories.length === 0) return interaction.respond([]);

        const query = focusedOption.value.toString().toLowerCase();

        const channels = await interaction.guild.channels.fetch();

        const choices = channels
          .filter((channel) => {
            if (!channel || channel.isThread()) return false;

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
            name: `#${channel!.name}`.slice(0, 100),
            value: channel!.id,
          }));

        await interaction.respond(choices);
        return;
      }
    }

    if (group === "responses") {
      if (focusedOption.name === "action") {
        const activePOI = interaction.options.getString("poi_code");

        if (!activePOI) {
          return await interaction.respond([]);
        }

        const result = await readPoiByCode(activePOI, guild);

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
      if (subcommand === "remove" && focusedOption.name === "method_name") {
        const targetPOI = interaction.options.getString("poi_code", true);

        const poi = await readPoiByCode(targetPOI, guild);

        if (!poi) return await interaction.respond([]);

        const choices = Object.keys(poi.methods).map((m) => ({
          name: m,
          value: m,
        }));

        await interaction.respond(choices);
      }
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: `I don't know what's going on, but you're using these commands outside a server.
        This normally should not happen, so congrats on the rare error.`,
      });
      return;
    }
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

          await defaultReplyStyle(interaction, {
            content: message,
          });
          break;
        default:
          break;
      }
      return;
    }

    if (group === "responses") {
      const poiCode = interaction.options.getString("poi_code");
      if (!poiCode) return;
      const action = interaction.options.getString("action");
      const poi = await readPoiByCode(poiCode, guild);
      if (!poi || !action || !poi.responses[action]) return;

      switch (subcommand) {
        case "modify": {
          const action = interaction.options.getString("action");
          const responseCode = interaction.options.getString("response_data");
          if (typeof responseCode !== "string" || !poiCode || !action) return;
          let message: string;

          const targetPOI = await readPoiByCode(poiCode, guild);

          if (targetPOI !== undefined) {
            await targetPOI.modifyResponse(action, responseCode);
            message = `POI **${poiCode}** successfully modified!`;
          } else {
            message = `POI **${poiCode}** does not exist. Maybe there's a typo?`;
          }

          await defaultReplyStyle(interaction, {
            content: message,
          });

          break;
        }
        case "view": {
          if (!poi) return;

          const targetResponse = poi.responses[action];

          if (!targetResponse) {
            await interaction.reply({
              content: `**Error:** Action \`${action}\` does not exist on POI \`${poiCode}\`.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const { base, checks, methodCalls, script } = targetResponse;

          const formattedChecks =
            checks.length > 0
              ? checks
                  .map((check, i) => {
                    const dcStr = check.roll_dc
                      ? `DC ${check.roll_dc}`
                      : "No DC";
                    const approaches = check.approach?.length
                      ? check.approach.join(", ")
                      : "Any";
                    const skills = check.skill_tag?.length
                      ? check.skill_tag.join(", ")
                      : "None";

                    const successBlock = check.success
                      ? `\n- **Success:** ${check.success}`
                      : "";
                    const failureBlock = check.failure
                      ? `\n- **Failure:** ${check.failure}`
                      : "";

                    return `**Check #${i + 1}** [${dcStr} | **Approaches:** ${approaches} | **Skills:** ${skills}]${successBlock}${failureBlock}`;
                  })
                  .join("\n\n")
              : "No stat checks required.";

          const formattedMethods =
            methodCalls.length > 0
              ? methodCalls.map((m) => `\`${m}()\``).join(", ")
              : "None";

          const codeBlock = script
            ? `\`\`\`\n${script}\n\`\`\``
            : "`No source script available.`";

          const description = [
            `**Base Response**\n${base}`,
            `\n**Checks**\n${formattedChecks}`,
            `\n**Methods Called**\n${formattedMethods}`,
            `\n**Source Script**\n${codeBlock}`,
          ].join("\n");

          const embed = new EmbedBuilder()
            .setTitle(`Response Data: \`${poiCode}\` → \`${action}\``)
            .setColor("Yellow")
            .setDescription(description);

          await defaultReplyStyle(interaction, {
            embeds: [embed],
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

          const poi = await readPoiByCode(targetPOI, guild);

          if (poi) {
            if (!poi.methods[methodName]) {
              await interaction.reply({
                content: `Method under ${methodName} does not exist.`,
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            poi.registerMethod(methodName, methodScript);
            message = `Succcessfully registered method \`${methodName}\` under POI **${targetPOI}**`;
          } else {
            message = `Could not register \`${methodName}\` under POI **${targetPOI}** Reason: ${targetPOI} does not exist.`;
          }

          await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
          });

          await defaultReplyStyle(interaction, {
            content: message,
          });

          break;
        }
        case "remove": {
          const targetPOI = interaction.options.getString("poi_code", true);
          const methodName = interaction.options.getString("method_name", true);
          let message: string;

          const poi = await readPoiByCode(targetPOI, guild);

          if (poi) {
            if (!poi.methods[methodName]) {
              await interaction.reply({
                content: `Method under ${methodName} does not exist.`,
                flags: MessageFlags.Ephemeral,
              });
              return;
            }

            poi.removeMethod(methodName);
            message = `Successfully removed \`${methodName}\` from POI **${targetPOI}**.`;
          } else {
            message = `Could not remove  \`${methodName}\` under POI **${targetPOI}** Reason: ${targetPOI} does not exist.`;
          }

          await defaultReplyStyle(interaction, {
            content: message,
          });
          break;
        }
        case "view":
          // TODO: Add methods viewer.
          break;
      }
    }

    if (group === "aliases") {
      switch (subcommand) {
        case "view": {
          const targetPOI = interaction.options.getString("poi_code");
          if (!targetPOI) {
            await interaction.reply({
              content: `You can't edit the aliases because the POI with code ${targetPOI} does not exist.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          const poi = await readPoiByCode(targetPOI, guild);
          if (!poi) {
            await interaction.reply({
              content: `**Error:** Could not find a POI with code **${targetPOI}**.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const aliasList = poi.aliases.map((a: string) => `- ${a}`).join("\n");

          const aliasEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle(`Aliases for POI \`${targetPOI}\``)
            .setDescription(
              `This POI, **${poi.name}**, is found in <#${poi.channel}>.
              **Aliases**
              ${aliasList}`,
            );

          await defaultReplyStyle(interaction, {
            embeds: [aliasEmbed],
          });
          break;
        }
        case "override": {
          const targetPOI = interaction.options.getString("poi_code", true);
          const newAliases = interaction.options.getString("new_aliases");

          if (newAliases === null) {
            await interaction.reply({
              content:
                "**Error:** You must provide a list of aliases (or an empty string to clear them).",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const poi = await readPoiByCode(targetPOI, guild);

          if (!poi) {
            await interaction.reply({
              content: `**Error:** Could not find a POI with code **${targetPOI}**.`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          poi.updateObjectAliases(newAliases);

          let warningNote = "";
          if (newAliases.trim() === "") {
            warningNote =
              "\n***Note:** All aliases have been removed. For accessibility, having at least one alias is recommended.*";
          }

          await defaultReplyStyle(interaction, {
            content: `Alias override on **${poi.name}** (\`${targetPOI}\`) complete.${warningNote}`,
          });
          break;
        }
      }
    }

    if (group === "state") {
      const targetPOI = interaction.options.getString("poi_code", true);
      const poi = await readPoiByCode(targetPOI, guild);
      if (!poi) {
        await interaction.reply({
          content: `ERROR: A POI with the code **${targetPOI}** could not be found.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      switch (subcommand) {
        case "view": {
          const stateString =
            Object.entries(poi.state.parsed)
              .map(([k, v]) => `• **${k}**: \`${v}\``)
              .join("\n") || "No state variables initialized.";

          const stateEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle(`State for POI ${targetPOI}`)
            .setDescription(stateString);

          await defaultReplyStyle(interaction, {
            embeds: [stateEmbed],
          });
          break;
        }
        case "set": {
          const newState = interaction.options.getString("state_list", true);

          const newParsedState = parseStateScript(newState);
          const embed = new EmbedBuilder().setTitle(
            `Setting embed for \`${targetPOI}\`...`,
          );

          if (isStateEqual(poi.state.parsed, newParsedState)) {
            embed
              .setDescription(
                "The state you inputted is the exact same as the current state. Look over your script again.",
              )
              .setColor("Red");
          } else {
            poi.setState(newState);

            embed
              .setDescription(
                `
              Successfully overrode the state of \`${targetPOI}\`.
              
              New code below:
              \`\`\`
              ${newState}
              \`\`\``,
              )
              .setColor("Green");
          }

          await defaultReplyStyle(interaction, {
            embeds: [embed],
          });
          break;
        }
        case "reset": {
          poi.resetStateToOriginal();

          await defaultReplyStyle(interaction, {
            content: `Successfully reset state of \`${targetPOI}\``,
          });
          break;
        }
      }
    }

    switch (subcommand) {
      case "create": {
        const rawState = interaction.options.getString("state") ?? "";
        const rawActions = interaction.options.getString("actions") ?? "";
        const { canonicalActions, aliasMap } = parseActionGroups(rawActions);

        const poiDetails: TruePOIConstructor = {
          name: interaction.options.getString("name", true),
          code: generateRandomString(5),
          channel: interaction.options.getString("channel", true),
          guild: interaction.guild,
          state: {
            parsed: parseStateScript(rawState),
            original: rawState,
          },
          aliases: convertToArray(
            interaction.options.getString("aliases") ?? "",
          ),
          actionsOrResponses: canonicalActions, // Only initializes primary keys
          group: interaction.options.getString("group") ?? "",
          shouldBeExempt: interaction.options.getBoolean("exemptable") ?? false,
        };

        const poi = await POI.create(poiDetails);
        poi.actionAliases = aliasMap;

        const db = getDb();
        const insertStmt = db.prepare(
          `INSERT INTO poi (code, channel, category, itemGroup, data) VALUES (?, ?, ?, ?, ?)`,
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

        await defaultReplyStyle(interaction, {
          content: replyContent,
        });
        break;
      }
    }
  },
};
