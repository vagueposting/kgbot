import { getDb } from "../db/setup";
import { POI, POIRow } from "../types/POItypes";

export function readAllPois(): POI[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM poi").all() as POIRow[];
  return rows.map((row) => POI.fromRow(row));
}

export function readPoiByCode(code: string): POI | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM poi WHERE code = ?").get(code) as
    | POI
    | undefined;
}
