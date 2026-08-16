import { Embed, EmbedBuilder } from "discord.js";

const {
  ActionRowBuilder,
  User,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  CommandInteraction,
} = require("discord.js");

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i++) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

function createPagesFromData<T>(
  data: T[],
  chunkSize: number,
  pageBuilder: (
    chunk: T[],
    pageIndex: number,
    totalPages: number,
  ) => EmbedBuilder,
): EmbedBuilder[] {
  const chunks = chunkArray(data, chunkSize);

  return chunks.map((chunk, index) => {
    return pageBuilder(chunk, index, chunks.length);
  });
}

async function pagination(
  interactionOrMessage: typeof CommandInteraction,
  pages: EmbedBuilder[],
  timeout = 60000,
  ephemeral = false,
) {
  if (!interactionOrMessage || !pages || pages.length === 0) return;

  if (pages.length === 1) {
    if (typeof interactionOrMessage.reply === "function") {
      return await interactionOrMessage.reply({
        embeds: [pages[0]],
        fetchReply: true,
        ephemeral: ephemeral, // Add ephemeral option
      });
    } else {
      return await interactionOrMessage.channel.send({ embeds: [pages[0]] });
    }
  }

  let currentPage = 0;

  const prevButton = new ButtonBuilder()
    .setCustomId("prev_page")
    .setLabel("◀ Back")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId("next_page")
    .setLabel("Next ▶")
    .setStyle(ButtonStyle.Primary);

  const buttonRow = new ActionRowBuilder().addComponents(
    prevButton,
    nextButton,
  );

  let responseMessage;
  const isInteraction = typeof interactionOrMessage.reply === "function";

  if (isInteraction) {
    if (interactionOrMessage.deferred || interactionOrMessage.replied) {
      responseMessage = await interactionOrMessage.editReply({
        embeds: [
          pages[currentPage].setFooter({
            text: `Page ${currentPage + 1} of ${pages.length}`,
          }),
        ],
        components: [buttonRow],
        fetchReply: true,
      });
    } else {
      responseMessage = await interactionOrMessage.reply({
        embeds: [
          pages[currentPage].setFooter({
            text: `Page ${currentPage + 1} of ${pages.length}`,
          }),
        ],
        components: [buttonRow],
        fetchReply: true,
        ephemeral: ephemeral, // Add ephemeral option
      });
    }
  } else {
    responseMessage = await interactionOrMessage.channel.send({
      embeds: [
        pages[currentPage].setFooter({
          text: `Page ${currentPage + 1} of ${pages.length}`,
        }),
      ],
      components: [buttonRow],
    });
  }

  const userId = isInteraction
    ? interactionOrMessage.user.id
    : interactionOrMessage.author.id;
  const collector = responseMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
  });

  collector.on("collect", async (i: typeof User) => {
    if (i.user.id !== userId) {
      return await i.reply({
        content: "This pagination belongs to someone else!",
        flags: [64],
      });
    }

    collector.resetTimer();

    if (i.customId === "prev_page") {
      currentPage--;
    } else if (i.customId === "next_page") {
      currentPage++;
    }

    prevButton.setDisabled(currentPage === 0);
    nextButton.setDisabled(currentPage === pages.length - 1);

    await i.update({
      embeds: [
        pages[currentPage].setFooter({
          text: `Page ${currentPage + 1} of ${pages.length}`,
        }),
      ],
      components: [buttonRow],
    });
  });

  collector.on("end", async () => {
    prevButton.setDisabled(true);
    nextButton.setDisabled(true);

    try {
      await responseMessage.edit({
        components: [buttonRow],
      });
    } catch (error) {
      throw new Error("The message was deleted before timeout.");
    }
  });
}

async function paginateData<T>(
  interactionOrMessage: typeof CommandInteraction,
  data: T[],
  chunkSize: number,
  pageBuilder: (
    chunk: T[],
    pageIndex: number,
    totalPages: number,
  ) => EmbedBuilder,
  timeout = 60000,
  ephemeral = false,
) {
  const pages = createPagesFromData(data, chunkSize, pageBuilder);
  return pagination(interactionOrMessage, pages, timeout, ephemeral);
}

module.exports = { pagination, paginateData, chunkArray, createPagesFromData };
