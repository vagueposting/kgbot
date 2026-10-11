import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
} from "discord.js";
import { setupDatabase } from "./db/setup";
import { botFeedChannels } from "./types/botFeedChannels";
import dotenv from "dotenv";
import { handleActiveCheckRoll } from "./auto-gm/handleActiveCheckRoll";
import { autoGMOrchestrator } from "./auto-gm/autoGMOrchestrator";
import { handleRetrievalButton } from "./auto-gm/activeCheckManager";
dotenv.config();

export interface Command {
  data: {
    name: string;
  };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export class ExtendedClient extends Client {
  commands: Collection<string, Command> = new Collection();
}

setupDatabase();
botFeedChannels.rehydrate();

const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const stats = fs.statSync(commandsPath);

  if (stats.isDirectory()) {
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      loadCommand(filePath);
    }
  } else if (stats.isFile() && folder.endsWith(".js")) {
    loadCommand(commandsPath);
  }
}

function loadCommand(filePath: string) {
  const imported = require(filePath);

  const command = imported.default || imported;

  if (command && "data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  // AUTOCOMPLETE
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (command.autocomplete) {
        await command.autocomplete(interaction);
      }
    } catch (error) {
      console.error(
        `Error handling autocomplete for ${interaction.commandName}:`,
        error,
      );
    }
    return;
  }

  // SLASH
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.log(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  // BUTTON
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("retrieve_check_")) {
      await handleRetrievalButton(interaction, interaction.guild!);
    }
  }
});

client.on("messageCreate", async (message) => {
  console.log(
    `[messageCreate] Event received in channel: ${message.channel.id}`,
  );

  if (!botFeedChannels.cachedIds.has(message.channel.id)) {
    console.log(
      `[messageCreate] Dropped: Channel ${message.channel.id} not in cachedIds.`,
    );
    return;
  }

  const { tupperLog } = botFeedChannels.data;
  if (message.channel.id === tupperLog) {
    console.log("[messageCreate] Processing TupperLog message...");

    if (!message.embeds.length) {
      console.log("[messageCreate] Dropped: Message has no embeds.");
      return;
    }

    const isRollHandled = await handleActiveCheckRoll(message);
    if (isRollHandled) return;

    await autoGMOrchestrator(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
