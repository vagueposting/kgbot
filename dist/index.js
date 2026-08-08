import { Client, GatewayIntentBits, Events } from "discord.js";
import "dotenv/config";
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
// CLIENT READY EVENT
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot)
        return;
    if (message.content === "!ping") {
        await message.reply("Pong!");
    }
});
client.login(process.env.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map