// services/activeCheckManager.ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  Guild,
  MessageFlags,
  ButtonInteraction,
} from "discord.js";
import {
  ActiveCheckSession,
  activeCheckSessions,
} from "../types/ActiveCheckSession";
import { ResponseRolls } from "../types/POItypes";
import { timeouts } from "../types/timeouts";
import { makeSessionKey } from "../utils/sessionKey";

/**
 * Starts a new active roll session for a specific player in a channel.
 */
export function startRollSession(params: {
  channelID: string;
  playerID: string;
  poiCode: string;
  actionKey: string;
  checkData: ResponseRolls;
  checkIndex?: number;
  guild: Guild;
}): void {
  const sessionKey = makeSessionKey(params.channelID, params.playerID);

  clearRollSession(params.channelID, params.playerID);

  const activeTimer = setTimeout(
    () => {
      transitionToRetrievalWindow(
        params.channelID,
        params.playerID,
        params.guild,
      );
    },
    timeouts.get("rollForPOI") ?? 20 * 60 * 1000,
  );

  activeCheckSessions.set(sessionKey, {
    poiCode: params.poiCode,
    playerID: params.playerID,
    channelID: params.channelID,
    actionKey: params.actionKey,
    checkData: params.checkData,
    checkIndex: params.checkIndex ?? 0,
    state: "ACTIVE",
    activeTimer,
  });
}

/**
 * 2. Transitions session from 20-min ACTIVE window to 18-hr RETRIEVABLE window.
 */
async function transitionToRetrievalWindow(
  channelID: string,
  playerID: string,
  guild: Guild,
): Promise<void> {
  const sessionKey = makeSessionKey(channelID, playerID);
  const session = activeCheckSessions.get(sessionKey);
  if (!session) return;

  session.state = "RETRIEVABLE";

  const retrieveButton = new ButtonBuilder()
    .setCustomId(`retrieve_check_${channelID}_${playerID}`)
    .setLabel("Retrieve Roll Opportunity")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🔄");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    retrieveButton,
  );

  try {
    const channel = (await guild.channels.fetch(channelID)) as TextChannel;
    if (channel) {
      const msg = await channel.send({
        content: `<@${playerID}> ⏳ **Your 20-minute roll window has expired.**\nYou have **18 hours** to retrieve this interaction using the button below.`,
        components: [row],
      });
      session.promptMessageID = msg.id;
    }
  } catch (err) {
    console.error("Failed to post retrieval message:", err);
  }

  session.retrievalTimer = setTimeout(
    () => {
      clearRollSession(channelID, playerID);
      console.log(
        `[ActiveCheck] Session permanently expired for ${sessionKey}`,
      );
    },
    timeouts.get("retrievePOI") ?? 18 * 60 * 60 * 1000,
  );
}

/**
 * 3.andles button interactions to reactivate a stale session.
 */
export async function handleRetrievalButton(
  interaction: ButtonInteraction,
  guild: Guild,
): Promise<void> {
  const rawId = interaction.customId.replace("retrieve_check_", "");
  const [channelID, playerID] = rawId.split("_");

  const sessionKey = makeSessionKey(channelID, playerID);
  const session = activeCheckSessions.get(sessionKey);

  if (!session || session.state !== "RETRIEVABLE") {
    await interaction.reply({
      content: "This opportunity is no longer available to retrieve.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.user.id !== session.playerID) {
    await interaction.reply({
      content: "Only the player who triggered this check can retrieve it!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (session.retrievalTimer) clearTimeout(session.retrievalTimer);

  session.state = "ACTIVE";
  session.activeTimer = setTimeout(
    () => {
      transitionToRetrievalWindow(channelID, playerID, guild);
    },
    20 * 60 * 1000,
  );

  await interaction.update({
    content: `🔄 **Interaction Retrieved!** <@${session.playerID}>, you have **20 minutes** to complete your roll in this channel.`,
    components: [],
  });
}

/**
 * Intercepts incoming messages to see if they belong to an ACTIVE roll session.
 */
export function getActiveSession(
  channelID: string,
  playerID: string,
): ActiveCheckSession | null {
  const sessionKey = makeSessionKey(channelID, playerID);
  const session = activeCheckSessions.get(sessionKey);
  if (!session) return null;

  if (session.state === "ACTIVE") {
    return session;
  }

  return null;
}

/**
 * Cleans up session for a specific player in a channel and cancels all associated timers.
 */
export function clearRollSession(channelID: string, playerID: string): void {
  const sessionKey = makeSessionKey(channelID, playerID);
  const session = activeCheckSessions.get(sessionKey);
  if (!session) return;

  if (session.activeTimer) clearTimeout(session.activeTimer);
  if (session.retrievalTimer) clearTimeout(session.retrievalTimer);

  activeCheckSessions.delete(sessionKey);
}
