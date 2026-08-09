"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvents = registerEvents;
const discord_js_1 = require("discord.js");
function registerEvents(client) {
    client.once(discord_js_1.Events.ClientReady, (readyClient) => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    });
}
