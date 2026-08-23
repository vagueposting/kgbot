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

export async function getValidPOICategories(): Promise<string[]> {
  const db = getDb();
  const validCategories = db
    .prepare<[], { id: string }>(/* sql */ `SELECT id FROM rp_categories`)
    .all()
    .map((row) => row.id);

  return validCategories;
}

export async function validatePOICategory(id: string) {
  const db = getDb();

  const isItThere = db
    .prepare(
      /* sql */ `SELECT id FROM rp_categories
      WHERE id = ?`,
    )
    .pluck()
    .get(id);

  return isItThere;
}
