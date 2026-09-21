import { APIEmbedField } from "discord.js";

export function matchTupperboxLogID(
  embedField: APIEmbedField,
  regex: RegExp = /\((\d{17,20})\)/,
) {
  const idMatch = embedField.value.match(regex);
  const id = idMatch ? idMatch[1] : null;
  return id;
}
