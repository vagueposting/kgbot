import { Message } from "discord.js";
import { activeCheckSessions } from "../types/ActiveCheckSession";
import { POI } from "../types/POItypes";
import { readPoiByCode } from "../utils/tableReaders";
import { resolveChannel } from "../utils/resolveChannel";
import { readTupperLogMessages } from "./readTupperLogMessages";

/**
 * Intercepts incoming messages to check if they complete an active POI roll check.
 * @returns {Promise<boolean>} True if the message was processed as an active roll check; false otherwise.
 */
export async function handleActiveCheckRoll(
  message: Message,
): Promise<boolean> {
  // TODO: actually give this functionality.
  return true;
}
