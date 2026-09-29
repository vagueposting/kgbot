import { Message } from "discord.js";
import { fullPOIParser } from "./fullPOIParser";
import { resolveChannel } from "../utils/resolveChannel";
import { handleActiveCheckRoll } from "./handleActiveCheckRoll";
import { startRollSession } from "./activeCheckManager";

export async function autoGMOrchestrator(message: Message) {
  const isRollHandled = await handleActiveCheckRoll(message); // TODO: write handleActiveCheckRoll;
  if (isRollHandled) return;

  const parsedMessage = await fullPOIParser(message);
  if (!parsedMessage) return;

  const channel = await resolveChannel(message.guild!, parsedMessage.channelID);
  if (!channel) return;

  try {
    const targetMessage = await channel.messages.fetch(parsedMessage.messageID);

    if (parsedMessage.checks && parsedMessage.checks.length > 0) {
      const check = parsedMessage.checks[0];

      // TODO: turn this into an embed.
      const prompt =
        `${parsedMessage.text}\n\n` +
        `🎲 **Check Required!** (DC ${check.roll_dc ?? 10})\n` +
        `• **Approaches:** ${check.approach?.join(", ") ?? "Any"}\n` +
        `• **Skills:** ${check.skill_tag?.join(", ") ?? "Any"}\n` +
        `*(Roll within 20 minutes)*`;

      await targetMessage.reply({
        content: prompt,
      });

      startRollSession({
        channelID: parsedMessage.channelID,
        playerID: parsedMessage.playerID,
        poiCode: parsedMessage.poiCode,
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
