import { getDb } from "../../db/setup";
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";

export function fetchPOIData(
  query: string = "",
  interaction: ChatInputCommandInteraction | AutocompleteInteraction,
): ApplicationCommandOptionChoiceData[] {
  const db = getDb();
  const cleanQuery = query.toLowerCase().trim();

  const rows = db
    .prepare<
      [],
      { code: string; data: string }
    >(/* sql */ `SELECT code, data FROM poi`)
    .all();

  return rows
    .filter((row) => row.code.toLowerCase().includes(cleanQuery))
    .slice(0, 25)
    .map((row) => {
      const poiData = JSON.parse(row.data);

      const { name, channel } = poiData;

      return {
        name: `${name} - #${interaction.guild?.channels.cache.get(channel)!.name} - ${row.code}`,
        value: row.code,
      };
    });
}
