import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
  GuildChannel,
} from "discord.js";
import { getDb } from "../db/setup";
import {
  getValidPOICategories,
  validatePOICategory,
} from "../utils/tableReaders";
import { countThreadsInCategory } from "../utils/countThreadsInCategory";
import { paginateData } from "../utils/pagination";

interface CategoryInfo {
  name?: string;
  id?: string;
  channelCount?: number;
  activeThreads?: number;
  totalThreads?: number;
  poiCount?: number;
}

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

            const validCategories = await getValidPOICategories();

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
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    // TODO: write runtime code for all the commands defined above.

    if (group === "channels") {
      const db = getDb();
      switch (subcommand) {
        case "add_category": {
          const categoryToAdd = interaction.options.getString("category");
          if (!categoryToAdd) return;

          const category = interaction.guild?.channels.cache.get(categoryToAdd);

          if (
            category === undefined ||
            category.type !== ChannelType.GuildCategory
          )
            return;

          const { name, id } = category;

          const isItThere = validatePOICategory(categoryToAdd);

          if (isItThere === undefined) {
            const insert = db
              .prepare(/* sql */ `INSERT INTO rp_categories (id) VALUES (?)`)
              .run(categoryToAdd);

            await interaction.reply({
              content: `Added category **${name}** with ID \`${id}\` to valid categories list.`,
            });
          } else {
            await interaction.reply({
              content: `You already have the category **${name}** added to your valid list! No changes made.`,
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }
        case "remove": {
          const categoryToRemove = interaction.options.getString("category");

          if (!categoryToRemove) return;

          const category =
            interaction.guild?.channels.cache.get(categoryToRemove);

          if (
            category === undefined ||
            category.type !== ChannelType.GuildCategory
          )
            return;

          const { name, id } = category;

          const isItThere = await validatePOICategory(categoryToRemove);

          if (isItThere) {
            const remove = db
              .prepare(
                /* sql */ `DELETE FROM rp_categories
              WHERE id = ?`,
              )
              .run(categoryToRemove);

            await interaction.reply({
              content: `Removed category **${name}** with ID \`${id}\`.`,
            });
          } else {
            await interaction.reply({
              content: `The category **${name}** with ID \`${id}\` is not in the RP category list. No changes made.`,
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }
        case "list": {
          const catDump = await getValidPOICategories();

          try {
            const categories = await Promise.all(
              catDump.map(async (category: string): Promise<CategoryInfo> => {
                const catData = interaction.guild?.channels.cache.get(category);
                if (catData === undefined) return {};

                const { name, id } = catData;

                const regularChannelCount =
                  interaction.guild!.channels.cache.filter(
                    (c) =>
                      c.parentId === id && c.type === ChannelType.GuildText,
                  ).size;

                const threadInfo = await countThreadsInCategory(
                  interaction.guild!,
                  id,
                );

                const howManyPOIs = db
                  .prepare(
                    `SELECT code FROM poi
        WHERE category = ?`,
                  )
                  .all(id).length;

                return {
                  name: name,
                  id: id,
                  channelCount: regularChannelCount,
                  activeThreads: threadInfo.active,
                  totalThreads: threadInfo.total,
                  poiCount: howManyPOIs,
                };
              }),
            );

            if (categories.length === 0) {
              await interaction.reply({
                content: "**Error:** No RP categories found in the database.",
                flags: MessageFlags.Ephemeral,
              });
              break;
            }

            await paginateData(
              interaction,
              categories,
              5,
              (chunk: CategoryInfo[]): EmbedBuilder => {
                const embed = new EmbedBuilder()
                  .setTitle("Valid RP Categories")
                  .setColor("Green");

                const description = chunk
                  .map(
                    (cat) =>
                      `### ${cat.name} - \`${cat.id}\`
                  \n⠀**No. of channels:** ${cat.channelCount}
                  \n **Thread activity:** ${cat.activeThreads} / ${cat.totalThreads}
                  \n **POI Count:** ${cat.poiCount}`,
                  )
                  .join("\n");

                embed.setDescription(description);

                return embed;
              },
            );
          } catch (error) {
            console.error("Error listing categories:", error);
            await interaction.reply({
              content: "An error occurred while fetching category data.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    }
  },
};
