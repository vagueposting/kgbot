import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./game.db");

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS poi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL
    )
`;

db.exec(createTableQuery);

console.log("Database and POI table created successfully!");

db.close();
