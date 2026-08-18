import { getDb } from "../db/setup";

export function selectRow<T>(
  table: string,
  filter: Record<string, string | number | boolean>,
) {
  const db = getDb();

  const keys = Object.keys(filter);

  if (keys.length !== 1) {
    throw new Error(`Filter must contain exactly one key-value pair.`);
  }

  const columnName = keys[0];
  const columnValue = filter[columnName];
  const safeValue =
    typeof columnValue === "boolean" ? (columnValue ? 1 : 0) : columnValue;

  const safeTable = table.replace(/[^a-zA-Z0-9_]/g, "");
  const safeColumn = columnName.replace(/[^a-zA-Z0-9_]/g, "");

  const query = `SELECT * FROM ${safeTable} WHERE ${safeColumn} = ? LIMIT 1`;

  const row = db.prepare(query).get(safeValue);

  return row;
}
