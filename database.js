const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
    path.join(__dirname, "kisansetu.db")
);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    village TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    center TEXT NOT NULL,
    available_slots INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    token_number TEXT NOT NULL,
    crop TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'Booked',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const scheduleCount = db
    .prepare("SELECT COUNT(*) AS count FROM schedules")
    .get();

if (scheduleCount.count === 0) {

    const insert = db.prepare(`
        INSERT INTO schedules
        (crop, date, start_time, end_time, center, available_slots)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
        "Wheat",
        "2026-09-01",
        "09:00 AM",
        "05:00 PM",
        "District Procurement Center",
        50
    );

    insert.run(
        "Rice",
        "2026-09-03",
        "09:00 AM",
        "05:00 PM",
        "Agriculture Market Yard",
        40
    );

    insert.run(
        "Maize",
        "2026-09-05",
        "10:00 AM",
        "04:00 PM",
        "Taluk Procurement Center",
        30
    );
}

module.exports = db;
