import Database from "better-sqlite3";

const db = new Database("./game.db");

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS poi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL
    )
`;

db.exec(createTableQuery);

console.log("Database and POI table created successfully!");

db.close();
