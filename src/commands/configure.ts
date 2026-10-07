import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
  EmbedBuilder,
  ChannelType,
  GuildChannel,
} from "discord.js";
import { botFeedChannels } from "../types/botFeedChannels";
import { snakeToCamel } from "../utils/syntaxManagement";
import { defaultReplyStyle } from "../utils/defaultReplyStyle";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("configure")
    .setDescription("GM command. General, server-specific settings.")
    .addSubcommandGroup((group) =>
      group
        .setName("feed_channels")
        .setDescription(
          "Assign channels to serve as feed channels for the bot.",
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("Shows the list of assigned feed channels.")
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
            .setName("tupper_log")
            .setDescription("Assign a Tupper log for the bot to track.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription(
                  "Specific channel bot should check for Tupper logs.",
                )
                .addChannelTypes(ChannelType.GuildText)
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
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === "feed_channels") {
      // List is the only one that doesn't
      // edit anything.
      if (subcommand === "list") {
        const { tupperLog } = botFeedChannels.data;
        const fieldData = [
          {
            name: "Tupper Log",
            value:
              tupperLog !== ""
                ? `<#${tupperLog}>`
                : "No Tupper Log channel set yet!",
          },
        ];
        const feedList = new EmbedBuilder()
          .setTitle("Feed Channel List")
          .setFields(fieldData);
        await defaultReplyStyle(interaction, {
          embeds: [feedList],
        });
        return;
      }

      // Otherwise, it edits the data.

      const { data } = botFeedChannels;
      const target = snakeToCamel(
        subcommand,
      ) as keyof typeof botFeedChannels.data;
      const channelSetting = {
        old: data[target] ? `<#${data[target]}>` : "`None`",
        new: `<#${interaction.options.getChannel("channel", true).id}>`,
      };
      botFeedChannels.change(
        target,
        interaction.options.getChannel("channel", true).id,
      );

      await defaultReplyStyle(interaction, {
        content: `**Update:** \`${target}\` switched from ${channelSetting.old} to ${channelSetting.new}.`,
      });
    }
  },
};
