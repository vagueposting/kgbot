"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const discord_js_1 = require("discord.js");
function createClient() {
    return new discord_js_1.Client({
        intents: [discord_js_1.GatewayIntentBits.Guilds],
    });
}
