import { Message } from "discord.js";
import { fullPOIParser } from "./fullPOIParser";
import { resolveChannel } from "../utils/resolveChannel";
import { startRollSession } from "./activeCheckManager";

export async function autoGMOrchestrator(message: Message) {
  const parsedMessage = await fullPOIParser(message);
  if (!parsedMessage) return;

  const channel = await resolveChannel(message.guild!, parsedMessage.channelID);
  if (!channel) return;

  try {
    const targetMessage = await channel.messages.fetch(parsedMessage.messageID);

    if (parsedMessage.checks && parsedMessage.checks.length > 0) {
      const check = parsedMessage.checks[0];

      const prompt =
        `${parsedMessage.text}\n\n` +
        `🎲 **All rolls in this situation have a modifier!** (${check.modifier ?? 10})\n` +
        `• **Approaches:** ${check.approach?.join(", ") ?? "Any"}\n` +
        `• **Skills:** ${check.skill_tag?.join(", ") ?? "Any"}\n` +
        `*(Roll within 20 minutes)*`;

      await targetMessage.reply({ content: prompt });

      startRollSession({
        channelID: parsedMessage.channelID,
        playerID: parsedMessage.playerID,
        poiCode: parsedMessage.poiCode,
        actionKey: parsedMessage.actionKey ?? "_",
        checkData: check,
        guild: message.guild!,
      });
    } else {
      await targetMessage.reply(parsedMessage.text);
    }
  } catch (error) {
    console.error("Orchestration error:", error);
  }
}
