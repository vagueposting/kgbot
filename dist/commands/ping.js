"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pongs back and shows response time!"),
    async execute(interaction) {
        const timeSentMs = interaction.createdTimestamp;
        const pongTime = Date.now();
        await interaction.reply(`Pong! That took ${pongTime - timeSentMs}ms.`);
    },
};
