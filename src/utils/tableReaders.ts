import { getDb } from "../db/setup";
import { POI, POIRow } from "../types/POItypes";
import { Guild } from "discord.js";

export async function readAllPois(guild: Guild): Promise<POI[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM poi").all() as POIRow[];
  return await Promise.all(rows.map((row) => POI.fromRow(row, guild)));
}

export async function readPoiByCode(code: string): Promise<POI | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM poi WHERE code = ?").get(code) as
    | POI
    | undefined;
}
