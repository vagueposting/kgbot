import { GuildMember, PartialGuildMember } from "discord.js";
import { getDb } from "../db/setup";
import { Timestamp } from "../types/timestamp";

const THIRTY_DAYS_MS = new Timestamp(30).compute();

export function removeUser(member: GuildMember | PartialGuildMember): void {
  const db = getDb();
  const now = Date.now();
  const pruneDate = String(now + THIRTY_DAYS_MS);

  db.prepare(
    /*sql*/ `
    UPDATE users
    SET onServer = 0,
        leftOn = ?,
        pruneDate = ?
    WHERE userID = ?`,
  ).run(String(now), pruneDate, member.id);
}
