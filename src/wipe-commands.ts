import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

// Wipe all guild commands
rest
  .put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID!,
      process.env.GUILD_ID!,
    ),
    { body: [] },
  )
  .then(() => console.log("Cleared all guild commands"));

// Wipe all global commands
rest
  .put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: [] })
  .then(() => console.log("Cleared all global commands"));
