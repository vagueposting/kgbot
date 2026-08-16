import { getDb } from "../db/setup";
import { POI } from "../types/POItypes";

export function readAllPois(): POI[] {
  const db = getDb();
  return db.prepare("SELECT * FROM poi").all() as POI[];
}

export function readPoiByCode(code: string): POI | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM poi WHERE code = ?").get(code) as
    | POI
    | undefined;
}
