import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  ChatInputCommandInteraction,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

export interface Command {
  data: {
    name: string;
  };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class ExtendedClient extends Client {
  commands: Collection<string, Command> = new Collection();
}

const client = new ExtendedClient({ intents: [GatewayIntentBits.Guilds] });

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
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
