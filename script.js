const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kisansetu-secret-change-this";

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// DATABASE
// ========================================

const db = new Database("kisansetu.db");

// Farmers
db.prepare(`
CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    village TEXT,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Schedules
db.prepare(`
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    center TEXT NOT NULL,
    available_slots INTEGER DEFAULT 50
)
`).run();

// Tokens
db.prepare(`
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER NOT NULL,
    schedule_id INTEGER,
    token_number INTEGER,
    crop TEXT,
    quantity REAL,
    procurement_status TEXT DEFAULT 'Booked',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Payments
db.prepare(`
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER,
    token_id INTEGER,
    amount REAL,
    crop TEXT,
    quantity REAL,
    status TEXT DEFAULT 'Pending'
)
`).run();

// Notifications
db.prepare(`
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER,
    title TEXT,
    message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// ========================================
// CREATE DEFAULT SCHEDULES
// ========================================

const scheduleCount =
    db.prepare("SELECT COUNT(*) AS count FROM schedules").get().count;

if (scheduleCount === 0) {

    const insertSchedule = db.prepare(`
        INSERT INTO schedules
        (crop, date, start_time, end_time, center, available_slots)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertSchedule.run(
        "Paddy",
        "2026-09-01",
        "09:00",
        "17:00",
        "KisanSetu Procurement Center",
        50
    );

    insertSchedule.run(
        "Wheat",
        "2026-09-03",
        "09:00",
        "17:00",
        "District Procurement Center",
        40
    );
}

// ========================================
// AUTH MIDDLEWARE
// ========================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: "Login required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Invalid login token"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.farmerId = decoded.id;

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Your session has expired. Please login again."
        });
    }
}

// ========================================
// REGISTER FARMER
// ========================================

app.post("/api/farmer/register", async (req, res) => {

    try {

        const {
            name,
            phone,
            village,
            password
        } = req.body;

        if (!name || !phone || !password) {

            return res.status(400).json({
                error: "Name, phone number and password are required"
            });
        }

        if (!/^[0-9]{10}$/.test(phone)) {

            return res.status(400).json({
                error: "Phone number must contain exactly 10 digits"
            });
        }

        if (password.length < 6) {

            return res.status(400).json({
                error: "Password must contain at least 6 characters"
            });
        }

        const existing = db.prepare(`
            SELECT id
            FROM farmers
            WHERE phone = ?
        `).get(phone);

        if (existing) {

            return res.status(400).json({
                error: "An account with this phone number already exists"
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO farmers
            (name, phone, village, password)
            VALUES (?, ?, ?, ?)
        `).run(
            name,
            phone,
            village || "",
            hashedPassword
        );

        const farmer = {
            id: result.lastInsertRowid,
            name,
            phone,
            village: village || ""
        };

        const token = jwt.sign(
            {
                id: farmer.id,
                phone: farmer.phone
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Account created successfully",
            token,
            farmer
        });

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            error: "Unable to create account"
        });
    }
});

// ========================================
// LOGIN FARMER
// ========================================

app.post("/api/farmer/login", async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {

            return res.status(400).json({
                error: "Phone number and password are required"
            });
        }

        const farmer = db.prepare(`
            SELECT *
            FROM farmers
            WHERE phone = ?
        `).get(phone);

        if (!farmer) {

            return res.status(401).json({
                error: "Invalid phone number or password"
            });
        }

        const passwordCorrect =
            await bcrypt.compare(
                password,
                farmer.password
            );

        if (!passwordCorrect) {

            return res.status(401).json({
                error: "Invalid phone number or password"
            });
        }

        const token = jwt.sign(
            {
                id: farmer.id,
                phone: farmer.phone
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",
            token,
            farmer: {
                id: farmer.id,
                name: farmer.name,
                phone: farmer.phone,
                village: farmer.village
            }
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            error: "Login failed"
        });
    }
});

// ========================================
// FARMER PROFILE
// ========================================

app.get(
    "/api/farmer/profile",
    authenticateToken,
    (req, res) => {

        const farmer = db.prepare(`
            SELECT
                id,
                name,
                phone,
                village
            FROM farmers
            WHERE id = ?
        `).get(req.farmerId);

        if (!farmer) {

            return res.status(404).json({
                error: "Farmer not found"
            });
        }

        res.json(farmer);
    }
);

// ========================================
// SCHEDULES
// ========================================

app.get("/api/schedules", (req, res) => {

    const schedules = db.prepare(`
        SELECT *
        FROM schedules
        ORDER BY date ASC
    `).all();

    res.json(schedules);
});

// ========================================
// BOOK TOKEN
// ========================================

app.post(
    "/api/tokens",
    authenticateToken,
    (req, res) => {

        try {

            const {
                crop,
                quantity,
                scheduleId
            } = req.body;

            if (!crop || !quantity || !scheduleId) {

                return res.status(400).json({
                    error: "Please complete all booking details"
                });
            }

            const schedule = db.prepare(`
                SELECT *
                FROM schedules
                WHERE id = ?
            `).get(scheduleId);

            if (!schedule) {

                return res.status(404).json({
                    error: "Schedule not found"
                });
            }

            if (schedule.available_slots <= 0) {

                return res.status(400).json({
                    error: "No slots available"
                });
            }

            const lastToken = db.prepare(`
                SELECT MAX(token_number) AS number
                FROM tokens
            `).get();

            const tokenNumber =
                (lastToken.number || 0) + 1;

            const result = db.prepare(`
                INSERT INTO tokens
                (
                    farmer_id,
                    schedule_id,
                    token_number,
                    crop,
                    quantity
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                req.farmerId,
                scheduleId,
                tokenNumber,
                crop,
                quantity
            );

            db.prepare(`
                UPDATE schedules
                SET available_slots = available_slots - 1
                WHERE id = ?
            `).run(scheduleId);

            res.json({
                message: "Token booked successfully",
                tokenNumber,
                id: result.lastInsertRowid
            });

        } catch (error) {

            console.error("TOKEN ERROR:", error);

            res.status(500).json({
                error: "Unable to book token"
            });
        }
    }
);

// ========================================
// MY TOKENS
// ========================================

app.get(
    "/api/tokens/my",
    authenticateToken,
    (req, res) => {

        const tokens = db.prepare(`
            SELECT
                tokens.*,
                schedules.date,
                schedules.center
            FROM tokens
            LEFT JOIN schedules
            ON tokens.schedule_id = schedules.id
            WHERE tokens.farmer_id = ?
            ORDER BY tokens.id DESC
        `).all(req.farmerId);

        res.json(tokens);
    }
);

// ========================================
// QUEUE
// ========================================

app.get(
    "/api/queue/:tokenId",
    authenticateToken,
    (req, res) => {

        const token = db.prepare(`
            SELECT *
            FROM tokens
            WHERE id = ?
            AND farmer_id = ?
        `).get(
            req.params.tokenId,
            req.farmerId
        );

        if (!token) {

            return res.status(404).json({
                error: "Token not found"
            });
        }

        const ahead = db.prepare(`
            SELECT COUNT(*) AS count
            FROM tokens
            WHERE schedule_id = ?
            AND token_number < ?
        `).get(
            token.schedule_id,
            token.token_number
        ).count;

        res.json({
            yourToken: token.token_number,
            currentToken: Math.max(
                1,
                token.token_number - ahead
            ),
            farmersAhead: ahead,
            estimatedMinutes: ahead * 10
        });
    }
);

// ========================================
// PAYMENTS
// ========================================

app.get(
    "/api/payments",
    authenticateToken,
    (req, res) => {

        const payments = db.prepare(`
            SELECT *
            FROM payments
            WHERE farmer_id = ?
            ORDER BY id DESC
        `).all(req.farmerId);

        res.json(payments);
    }
);

// ========================================
// NOTIFICATIONS
// ========================================

app.get(
    "/api/notifications",
    authenticateToken,
    (req, res) => {

        const notifications = db.prepare(`
            SELECT *
            FROM notifications
            WHERE farmer_id = ?
            OR farmer_id IS NULL
            ORDER BY id DESC
        `).all(req.farmerId);

        res.json(notifications);
    }
);

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {

    res.json({
        status: "online",
        service: "KisanSetu API"
    });
});

// ========================================
// FRONTEND
// ========================================

app.get("*", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("KISANSETU SERVER");
    console.log("=================================");
    console.log("");
    console.log(
        `Server running on port ${PORT}`
    );
});
