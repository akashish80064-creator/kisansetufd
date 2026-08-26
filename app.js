const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const db = require("./database");

const app = express();

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "kisansetu-change-this-secret";

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==========================================
// AUTH MIDDLEWARE
// ==========================================

function authenticate(req, res, next) {

    const authorization =
        req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            error: "Please login first"
        });
    }

    const parts =
        authorization.split(" ");

    const token =
        parts[1];

    if (!token) {
        return res.status(401).json({
            error: "Invalid login token"
        });
    }

    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Your login session has expired"
        });

    }
}


// ==========================================
// REGISTER FARMER
// ==========================================

app.post(
    "/api/farmer/register",
    async (req, res) => {

        try {

            const {
                name,
                phone,
                village,
                password
            } = req.body;

            if (
                !name ||
                !phone ||
                !village ||
                !password
            ) {
                return res.status(400).json({
                    error:
                        "Please fill all fields"
                });
            }

            if (!/^[0-9]{10}$/.test(phone)) {

                return res.status(400).json({
                    error:
                        "Phone number must contain 10 digits"
                });

            }

            if (password.length < 6) {

                return res.status(400).json({
                    error:
                        "Password must contain at least 6 characters"
                });

            }

            const existing =
                db.prepare(`
                    SELECT id
                    FROM farmers
                    WHERE phone = ?
                `).get(phone);

            if (existing) {

                return res.status(400).json({
                    error:
                        "An account already exists with this phone number"
                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const result =
                db.prepare(`
                    INSERT INTO farmers
                    (name, phone, village, password)
                    VALUES (?, ?, ?, ?)
                `).run(
                    name,
                    phone,
                    village,
                    hashedPassword
                );

            const farmer = {
                id:
                    result.lastInsertRowid,
                name,
                phone,
                village
            };

            const token =
                jwt.sign(
                    {
                        id: farmer.id,
                        type: "farmer"
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            res.json({
                message:
                    "Account created successfully",
                token,
                farmer
            });

        } catch (error) {

            console.error(
                "Register error:",
                error
            );

            res.status(500).json({
                error:
                    "Could not create account"
            });

        }

    }
);


// ==========================================
// FARMER LOGIN
// ==========================================

app.post(
    "/api/farmer/login",
    async (req, res) => {

        try {

            const {
                phone,
                password
            } = req.body;

            if (
                !phone ||
                !password
            ) {

                return res.status(400).json({
                    error:
                        "Phone number and password are required"
                });

            }

            const farmer =
                db.prepare(`
                    SELECT *
                    FROM farmers
                    WHERE phone = ?
                `).get(phone);

            if (!farmer) {

                return res.status(401).json({
                    error:
                        "Invalid phone number or password"
                });

            }

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    farmer.password
                );

            if (!passwordCorrect) {

                return res.status(401).json({
                    error:
                        "Invalid phone number or password"
                });

            }

            const token =
                jwt.sign(
                    {
                        id: farmer.id,
                        type: "farmer"
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "7d"
                    }
                );

            res.json({

                message:
                    "Login successful",

                token,

                farmer: {
                    id: farmer.id,
                    name: farmer.name,
                    phone: farmer.phone,
                    village: farmer.village
                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({
                error:
                    "Login failed"
            });

        }

    }
);


// ==========================================
// FARMER PROFILE
// ==========================================

app.get(
    "/api/farmer/profile",
    authenticate,
    (req, res) => {

        const farmer =
            db.prepare(`
                SELECT
                    id,
                    name,
                    phone,
                    village,
                    created_at
                FROM farmers
                WHERE id = ?
            `).get(req.user.id);

        if (!farmer) {

            return res.status(404).json({
                error:
                    "Farmer not found"
            });

        }

        res.json(farmer);

    }
);


// ==========================================
// SCHEDULES
// ==========================================

app.get(
    "/api/schedules",
    authenticate,
    (req, res) => {

        const schedules =
            db.prepare(`
                SELECT *
                FROM schedules
                ORDER BY date ASC
            `).all();

        res.json(schedules);

    }
);


// ==========================================
// BOOK TOKEN
// ==========================================

app.post(
    "/api/tokens",
    authenticate,
    (req, res) => {

        try {

            const {
                scheduleId,
                quantity
            } = req.body;

            if (
                !scheduleId ||
                !quantity
            ) {

                return res.status(400).json({
                    error:
                        "Please select schedule and quantity"
                });

            }

            const schedule =
                db.prepare(`
                    SELECT *
                    FROM schedules
                    WHERE id = ?
                `).get(scheduleId);

            if (!schedule) {

                return res.status(404).json({
                    error:
                        "Schedule not found"
                });

            }

            if (
                schedule.available_slots <= 0
            ) {

                return res.status(400).json({
                    error:
                        "No slots available"
                });

            }

            const tokenNumber =
                "KS-" +
                Date.now()
                    .toString()
                    .slice(-6);

            const result =
                db.prepare(`
                    INSERT INTO tokens
                    (
                        farmer_id,
                        schedule_id,
                        token_number,
                        crop,
                        quantity,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    req.user.id,
                    scheduleId,
                    tokenNumber,
                    schedule.crop,
                    quantity,
                    "Booked"
                );

            db.prepare(`
                UPDATE schedules
                SET available_slots =
                    available_slots - 1
                WHERE id = ?
            `).run(scheduleId);

            res.json({

                message:
                    "Token booked successfully",

                token: {

                    id:
                        result.lastInsertRowid,

                    token_number:
                        tokenNumber,

                    crop:
                        schedule.crop,

                    quantity,

                    status:
                        "Booked"

                }

            });

        } catch (error) {

            console.error(
                "Token error:",
                error
            );

            res.status(500).json({
                error:
                    "Could not book token"
            });

        }

    }
);


// ==========================================
// GET MY TOKENS
// ==========================================

app.get(
    "/api/tokens",
    authenticate,
    (req, res) => {

        const tokens =
            db.prepare(`
                SELECT *
                FROM tokens
                WHERE farmer_id = ?
                ORDER BY id DESC
            `).all(req.user.id);

        res.json(tokens);

    }
);


// ==========================================
// PAYMENTS
// ==========================================

app.get(
    "/api/payments",
    authenticate,
    (req, res) => {

        const payments =
            db.prepare(`
                SELECT *
                FROM payments
                WHERE farmer_id = ?
                ORDER BY id DESC
            `).all(req.user.id);

        res.json(payments);

    }
);


// ==========================================
// NOTIFICATIONS
// ==========================================

app.get(
    "/api/notifications",
    authenticate,
    (req, res) => {

        res.json([
            {
                title:
                    "Welcome to KisanSetu",
                message:
                    "Your farmer account is active."
            },
            {
                title:
                    "Procurement Schedules",
                message:
                    "Check available schedules and book your token."
            }
        ]);

    }
);


// ==========================================
// QUEUE
// ==========================================

app.get(
    "/api/queue",
    authenticate,
    (req, res) => {

        const count =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM tokens
                WHERE status = 'Booked'
            `).get();

        res.json({
            peopleWaiting:
                count.count,
            message:
                "Live procurement queue"
        });

    }
);


// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            status: "online",
            service:
                "KisanSetu API"
        });

    }
);


// ==========================================
// FRONTEND FALLBACK
// ==========================================

app.get(
    "*",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


module.exports = app;
