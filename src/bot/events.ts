import { Client, Events } from "discord.js";

export function registerEvents(client: Client): void {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  });
}
