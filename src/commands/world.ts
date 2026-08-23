import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
  SubscriptionManager,
  ChannelType,
} from "discord.js";
import { getDb } from "../db/setup";
import { getValidPOICategories } from "../utils/tableReaders";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("world")
    .setDescription(
      "GM command. Modify aspects of the world (server) that don't involve POIs.",
    )
    .addSubcommandGroup((group) =>
      group
        .setName("channels")
        .setDescription("Command group for handling RP channels.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add_category")
            .setDescription(
              "GM command. Enroll a category to the list of valid RP categories.",
            )
            .addStringOption((option) =>
              option
                .setName("category")
                .setDescription("Name of the category you want to enroll.")
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove_category")
            .setDescription(
              "GM command. Unenroll a category from the list of valid RP categories.",
            )
            .addStringOption((option) =>
              option
                .setName("category")
                .setDescription("Name of the category you want to remove.")
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("List all valid categories."),
        ),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(false);
    const db = getDb();

    if (group === "channels") {
      const focusedOption = interaction.options.getFocused(true);

      switch (subcommand) {
        case "add_category":
          if (focusedOption.name === "category") {
            const choices = interaction.guild?.channels.cache
              .filter((channel) => channel.type === ChannelType.GuildCategory)
              .map((channel) => ({
                name: `#${channel.name}`,
                value: channel.id,
              }));

            if (choices === undefined) return interaction.respond([]);

            if (choices.length === 0) return interaction.respond([]);

            await interaction.respond(choices);
          }
          break;

        case "remove_category":
          if (focusedOption.name === "category") {
            if (!interaction.guild) return interaction.respond([]);

            const validCategories = await getValidPOICategories(
              interaction.guild,
            );

            const choices = validCategories.map((cat) => ({
              name: cat,
              value: cat,
            }));

            await interaction.respond(choices);
          }
          break;

        default:
          break;
      }
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    // TODO: write runtime code for all the commands defined above.
  },
};
