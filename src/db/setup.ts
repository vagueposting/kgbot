import path from "node:path";
import Database from "better-sqlite3";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), "game.db");
    dbInstance = new Database(dbPath);
  }
  return dbInstance;
}

export function setupDatabase(): void {
  const db = getDb();
  const createTableQuery = /* sql */ `
    CREATE TABLE IF NOT EXISTS poi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL
    )

    CREATE TABLE IF NOT EXISTS rp_categories (
      id TEXT UNIQUE NOT NULL
    )
  `;

  db.exec(createTableQuery);
  console.log("Database and POI table initialized!");
}
