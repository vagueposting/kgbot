"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rest = new discord_js_1.REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
// Wipe all guild commands
rest
    .put(discord_js_1.Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
    .then(() => console.log("Cleared all guild commands"));
// Wipe all global commands
rest
    .put(discord_js_1.Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
    .then(() => console.log("Cleared all global commands"));
