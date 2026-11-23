import path from "node:path";
import Database from "better-sqlite3";

export type dbType = Database.Database | null;

let dbInstance: dbType;

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
      channel TEXT UNIQUE NOT NULL,
      category TEXT UNIQUE NOT NULL,
      itemGroup TEXT,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rp_categories (
      id TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      settingName TEXT UNIQUE NOT NULL,
      settingData TEXT NOT NULL
    )

    CREATE TABLE IF NOT EXISTS users (
      userName TEXT NOT NULL,
      userID TEXT UNIQUE NOT NULL,
      firstJoined TEXT NOT NULL,
      leftOn TEXT,
      onServer BOOLEAN NOT NULL DEFAULT 0 CHECK (onServer IN (0, 1)),
      data TEXT NOT NULL,
      prunedOn TEXT
    )
  `;

  db.exec(createTableQuery);
  console.log("Database, POI table and Categories table initialized!");
}
