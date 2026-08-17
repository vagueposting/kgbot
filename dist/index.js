"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedClient = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const discord_js_1 = require("discord.js");
const setup_1 = require("./db/setup");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class ExtendedClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
}
exports.ExtendedClient = ExtendedClient;
(0, setup_1.setupDatabase)();
const client = new ExtendedClient({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
client.once(discord_js_1.Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
const foldersPath = node_path_1.default.join(__dirname, "commands");
const commandFolders = node_fs_1.default.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = node_path_1.default.join(foldersPath, folder);
    const stats = node_fs_1.default.statSync(commandsPath);
    if (stats.isDirectory()) {
        const commandFiles = node_fs_1.default
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"));
        for (const file of commandFiles) {
            const filePath = node_path_1.default.join(commandsPath, file);
            loadCommand(filePath);
        }
    }
    else if (stats.isFile() && folder.endsWith(".js")) {
        loadCommand(commandsPath);
    }
}
function loadCommand(filePath) {
    const imported = require(filePath);
    const command = imported.default || imported;
    if (command && "data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
    }
    else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.log(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "There was an error executing this command!",
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
        else {
            await interaction.reply({
                content: "There was an error executing this command!",
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    }
});
client.login(process.env.DISCORD_TOKEN);
