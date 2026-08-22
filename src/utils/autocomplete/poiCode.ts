import { dbType } from "../../db/setup";
import { ApplicationCommandOptionChoiceData } from "discord.js";

export function getPOICodes(db?: dbType): ApplicationCommandOptionChoiceData[] {
  if (!db) {
    console.warn("Database not available, returning empty choices");
    return [];
  }

  return db
    .prepare<[], { code: string }>(/* sql */ `SELECT code FROM poi`)
    .all()
    .map((row: { code: string }) => ({
      name: row.code,
      value: row.code,
    }))
    .slice(0, 25);
}
