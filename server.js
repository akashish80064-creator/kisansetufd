const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const db = require("./database");

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "CHANGE_THIS_SECRET_IN_PRODUCTION";


// =================================
// MIDDLEWARE
// =================================

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "public")
));


// =================================
// DATABASE SEED
// =================================

function seedDatabase() {

    const farmerExists =
        db.prepare(
            "SELECT id FROM farmers WHERE phone = ?"
        ).get("9876543210");

    if (!farmerExists) {

        const password =
            bcrypt.hashSync("farmer123", 10);

        db.prepare(`
            INSERT INTO farmers
            (farmer_id, name, phone, village, password)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            "KS10245",
            "Ramesh Kumar",
            "9876543210",
            "Rampur",
            password
        );
    }


    const officerExists =
        db.prepare(
            "SELECT id FROM officers WHERE phone = ?"
        ).get("9999999999");

    if (!officerExists) {

        const password =
            bcrypt.hashSync("officer123", 10);

        db.prepare(`
            INSERT INTO officers
            (name, phone, password, center)
            VALUES (?, ?, ?, ?)
        `).run(
            "Procurement Officer",
            "9999999999",
            password,
            "District Procurement Center"
        );
    }


    const scheduleCount =
        db.prepare(
            "SELECT COUNT(*) AS count FROM schedules"
        ).get().count;

    if (scheduleCount === 0) {

        const schedules = [

            [
                "Wheat",
                "District Procurement Center",
                "2026-08-26",
                "09:00",
                "17:00",
                100
            ],

            [
                "Wheat",
                "District Procurement Center",
                "2026-08-27",
                "09:00",
                "17:00",
                100
            ],

            [
                "Rice",
                "District Procurement Center",
                "2026-08-28",
                "09:00",
                "16:00",
                80
            ]

        ];


        const insert =
            db.prepare(`
                INSERT INTO schedules
                (crop, center, date, start_time, end_time, available_slots)
                VALUES (?, ?, ?, ?, ?, ?)
            `);


        const transaction =
            db.transaction(() => {

                for (const schedule of schedules) {

                    insert.run(...schedule);

                }

            });

        transaction();
    }
}

seedDatabase();


// =================================
// AUTHENTICATION MIDDLEWARE
// =================================

function authenticate(req, res, next) {

    const header =
        req.headers.authorization;

    if (!header) {

        return res.status(401).json({
            error: "Authentication required"
        });

    }


    const token =
        header.replace("Bearer ", "");


    try {

        req.user =
            jwt.verify(
                token,
                JWT_SECRET
            );

        next();

    } catch {

        return res.status(401).json({
            error: "Invalid or expired login"
        });

    }
}


// =================================
// FARMER REGISTRATION
// =================================

app.post(
    "/api/farmer/register",
    (req, res) => {

        const { name, phone, village, password } = req.body;

        if (!name || !phone || !village || !password) {
            return res.status(400).json({
                error: "Name, phone, village and password are required"
            });
        }

        const cleanPhone = String(phone).trim();

        if (!/^\d{10}$/.test(cleanPhone)) {
            return res.status(400).json({
                error: "Please enter a valid 10-digit phone number"
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                error: "Password must contain at least 6 characters"
            });
        }

        const existing = db.prepare(
            "SELECT id FROM farmers WHERE phone = ?"
        ).get(cleanPhone);

        if (existing) {
            return res.status(409).json({
                error: "An account with this phone number already exists"
            });
        }

        const passwordHash = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO farmers
            (farmer_id, name, phone, village, password)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            "PENDING",
            String(name).trim(),
            cleanPhone,
            String(village).trim(),
            passwordHash
        );

        const farmerId = "KS" + String(10000 + result.lastInsertRowid);

        db.prepare(`
            UPDATE farmers
            SET farmer_id = ?
            WHERE id = ?
        `).run(farmerId, result.lastInsertRowid);

        const token = jwt.sign(
            { role: "farmer", id: result.lastInsertRowid },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            token,
            farmer: {
                id: result.lastInsertRowid,
                farmerId,
                name: String(name).trim(),
                phone: cleanPhone,
                village: String(village).trim()
            }
        });
    }
);


// =================================
// FARMER LOGIN
// =================================

app.post(
    "/api/farmer/login",
    (req, res) => {

        const {
            phone,
            password
        } = req.body;


        const farmer =
            db.prepare(`
                SELECT *
                FROM farmers
                WHERE phone = ?
            `).get(phone);


        if (!farmer) {

            return res.status(401).json({
                error: "Invalid phone or password"
            });

        }


        const valid =
            bcrypt.compareSync(
                password,
                farmer.password
            );


        if (!valid) {

            return res.status(401).json({
                error: "Invalid phone or password"
            });

        }


        const token =
            jwt.sign(
                {
                    role: "farmer",
                    id: farmer.id
                },
                JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );


        res.json({
            token,

            farmer: {
                id: farmer.id,
                farmerId: farmer.farmer_id,
                name: farmer.name,
                phone: farmer.phone,
                village: farmer.village
            }
        });

    }
);


// =================================
// OFFICER LOGIN
// =================================

app.post(
    "/api/officer/login",
    (req, res) => {

        const {
            phone,
            password
        } = req.body;


        const officer =
            db.prepare(`
                SELECT *
                FROM officers
                WHERE phone = ?
            `).get(phone);


        if (!officer) {

            return res.status(401).json({
                error: "Invalid login"
            });

        }


        const valid =
            bcrypt.compareSync(
                password,
                officer.password
            );


        if (!valid) {

            return res.status(401).json({
                error: "Invalid login"
            });

        }


        const token =
            jwt.sign(
                {
                    role: "officer",
                    id: officer.id
                },
                JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );


        res.json({
            token,

            officer: {
                id: officer.id,
                name: officer.name,
                center: officer.center
            }
        });

    }
);


// =================================
// FARMER PROFILE
// =================================

app.get(
    "/api/farmer/profile",
    authenticate,
    (req, res) => {

        if (req.user.role !== "farmer") {

            return res.status(403).json({
                error: "Farmer access required"
            });

        }


        const farmer =
            db.prepare(`
                SELECT
                    id,
                    farmer_id,
                    name,
                    phone,
                    village
                FROM farmers
                WHERE id = ?
            `).get(req.user.id);


        res.json(farmer);

    }
);


// =================================
// GET SCHEDULE
// =================================

app.get(
    "/api/schedules",
    authenticate,
    (req, res) => {

        const schedules =
            db.prepare(`
                SELECT *
                FROM schedules
                WHERE date >= date('now')
                ORDER BY date ASC
            `).all();


        res.json(schedules);

    }
);


// =================================
// BOOK TOKEN
// =================================

app.post(
    "/api/tokens",
    authenticate,
    (req, res) => {

        if (req.user.role !== "farmer") {

            return res.status(403).json({
                error: "Farmer access required"
            });

        }


        const {
            crop,
            quantity,
            scheduleId
        } = req.body;


        if (
            !crop ||
            !quantity ||
            !scheduleId
        ) {

            return res.status(400).json({
                error: "All fields are required"
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
                error: "Schedule not found"
            });

        }


        if (schedule.available_slots <= 0) {

            return res.status(400).json({
                error: "No slots available"
            });

        }


        // Check duplicate booking

        const duplicate =
            db.prepare(`
                SELECT id
                FROM tokens
                WHERE farmer_id = ?
                AND schedule_id = ?
                AND status != 'CANCELLED'
            `).get(
                req.user.id,
                scheduleId
            );


        if (duplicate) {

            return res.status(400).json({
                error:
                    "You already have a token for this schedule"
            });

        }


        // Generate next token

        const latest =
            db.prepare(`
                SELECT MAX(token_number) AS maximum
                FROM tokens
                WHERE schedule_id = ?
            `).get(scheduleId);


        const tokenNumber =
            (latest.maximum || 0) + 1;


        const transaction =
            db.transaction(() => {

                const result =
                    db.prepare(`
                        INSERT INTO tokens
                        (
                            token_number,
                            farmer_id,
                            crop,
                            quantity,
                            schedule_id
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `).run(
                        tokenNumber,
                        req.user.id,
                        crop,
                        quantity,
                        scheduleId
                    );


                db.prepare(`
                    UPDATE schedules
                    SET available_slots =
                        available_slots - 1
                    WHERE id = ?
                `).run(scheduleId);


                db.prepare(`
                    INSERT INTO procurement
                    (token_id, status)
                    VALUES (?, 'TOKEN_BOOKED')
                `).run(result.lastInsertRowid);


                db.prepare(`
                    INSERT INTO notifications
                    (farmer_id, title, message)
                    VALUES (?, ?, ?)
                `).run(
                    req.user.id,
                    "Token Confirmed",
                    `Your token #${tokenNumber} has been confirmed.`
                );


                return result.lastInsertRowid;

            });


        transaction();


        res.json({
            success: true,
            tokenNumber
        });

    }
);


// =================================
// FARMER TOKENS
// =================================

app.get(
    "/api/tokens/my",
    authenticate,
    (req, res) => {

        const tokens =
            db.prepare(`
                SELECT
                    t.id,
                    t.token_number,
                    t.crop,
                    t.quantity,
                    t.status,
                    t.created_at,
                    s.date,
                    s.start_time,
                    s.end_time,
                    s.center,
                    p.status AS procurement_status,
                    p.verified_quantity,
                    p.rate,
                    p.total_amount
                FROM tokens t

                JOIN schedules s
                    ON s.id = t.schedule_id

                LEFT JOIN procurement p
                    ON p.token_id = t.id

                WHERE t.farmer_id = ?

                ORDER BY t.id DESC
            `).all(req.user.id);


        res.json(tokens);

    }
);


// =================================
// LIVE QUEUE
// =================================

app.get(
    "/api/queue/:tokenId",
    authenticate,
    (req, res) => {

        const token =
            db.prepare(`
                SELECT *
                FROM tokens
                WHERE id = ?
            `).get(req.params.tokenId);


        if (!token) {

            return res.status(404).json({
                error: "Token not found"
            });

        }


        if (
            req.user.role === "farmer" &&
            token.farmer_id !== req.user.id
        ) {

            return res.status(403).json({
                error: "Access denied"
            });

        }


        const ahead =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM tokens
                WHERE schedule_id = ?
                AND token_number < ?
                AND status IN
                    ('BOOKED', 'ARRIVED', 'VERIFYING')
            `).get(
                token.schedule_id,
                token.token_number
            );


        const current =
            db.prepare(`
                SELECT token_number
                FROM tokens
                WHERE schedule_id = ?
                AND status IN
                    ('ARRIVED', 'VERIFYING')
                ORDER BY token_number ASC
                LIMIT 1
            `).get(token.schedule_id);


        res.json({

            yourToken:
                token.token_number,

            farmersAhead:
                ahead.count,

            currentToken:
                current
                    ? current.token_number
                    : token.token_number,

            estimatedMinutes:
                ahead.count * 3

        });

    }
);


// =================================
// OFFICER QUEUE
// =================================

app.get(
    "/api/officer/queue",
    authenticate,
    (req, res) => {

        if (req.user.role !== "officer") {

            return res.status(403).json({
                error: "Officer access required"
            });

        }


        const queue =
            db.prepare(`
                SELECT
                    t.id,
                    t.token_number,
                    t.crop,
                    t.quantity,
                    t.status,
                    f.farmer_id,
                    f.name,
                    f.phone,
                    f.village,
                    s.date,
                    s.start_time,
                    p.status AS procurement_status
                FROM tokens t

                JOIN farmers f
                    ON f.id = t.farmer_id

                JOIN schedules s
                    ON s.id = t.schedule_id

                LEFT JOIN procurement p
                    ON p.token_id = t.id

                WHERE t.status IN
                    ('BOOKED', 'ARRIVED', 'VERIFYING')

                ORDER BY t.token_number ASC
            `).all();


        res.json(queue);

    }
);


// =================================
// OFFICER UPDATE TOKEN
// =================================

app.patch(
    "/api/officer/tokens/:id",
    authenticate,
    (req, res) => {

        if (req.user.role !== "officer") {

            return res.status(403).json({
                error: "Officer access required"
            });

        }


        const {
            status,
            verifiedQuantity,
            rate
        } = req.body;


        const token =
            db.prepare(`
                SELECT *
                FROM tokens
                WHERE id = ?
            `).get(req.params.id);


        if (!token) {

            return res.status(404).json({
                error: "Token not found"
            });

        }


        const allowedStatuses = [
            "ARRIVED",
            "VERIFYING",
            "COMPLETED",
            "CANCELLED"
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error: "Invalid status"
            });

        }


        const farmer =
            db.prepare(`
                SELECT *
                FROM farmers
                WHERE id = ?
            `).get(token.farmer_id);


        const transaction =
            db.transaction(() => {

                db.prepare(`
                    UPDATE tokens
                    SET status = ?
                    WHERE id = ?
                `).run(
                    status,
                    token.id
                );


                if (status === "ARRIVED") {

                    db.prepare(`
                        UPDATE procurement
                        SET status = 'FARMER_ARRIVED',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE token_id = ?
                    `).run(token.id);

                }


                if (status === "VERIFYING") {

                    db.prepare(`
                        UPDATE procurement
                        SET
                            status = 'CROP_VERIFICATION',
                            verified_quantity = ?,
                            rate = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE token_id = ?
                    `).run(
                        verifiedQuantity || token.quantity,
                        rate || 2300,
                        token.id
                    );

                }


                if (status === "COMPLETED") {

                    const quantity =
                        verifiedQuantity || token.quantity;

                    const cropRate =
                        rate || 2300;

                    const amount =
                        quantity * cropRate;


                    db.prepare(`
                        UPDATE procurement
                        SET
                            status = 'PROCUREMENT_COMPLETED',
                            verified_quantity = ?,
                            rate = ?,
                            total_amount = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE token_id = ?
                    `).run(
                        quantity,
                        cropRate,
                        amount,
                        token.id
                    );


                    const procurement =
                        db.prepare(`
                            SELECT id
                            FROM procurement
                            WHERE token_id = ?
                        `).get(token.id);


                    db.prepare(`
                        INSERT INTO payments
                        (
                            procurement_id,
                            amount,
                            status
                        )
                        VALUES (?, ?, 'PROCESSING')
                    `).run(
                        procurement.id,
                        amount
                    );

                }


                db.prepare(`
                    INSERT INTO notifications
                    (farmer_id, title, message)
                    VALUES (?, ?, ?)
                `).run(
                    farmer.id,
                    "Procurement Updated",
                    `Your procurement status is now ${status}.`
                );

            });


        transaction();


        res.json({
            success: true
        });

    }
);


// =================================
// PAYMENT
// =================================

app.get(
    "/api/payments",
    authenticate,
    (req, res) => {

        if (req.user.role !== "farmer") {

            return res.status(403).json({
                error: "Farmer access required"
            });

        }


        const payments =
            db.prepare(`
                SELECT
                    pay.id,
                    pay.amount,
                    pay.status,
                    pay.transaction_reference,
                    pay.created_at,
                    p.status AS procurement_status,
                    t.token_number,
                    t.crop,
                    t.quantity
                FROM payments pay

                JOIN procurement p
                    ON p.id = pay.procurement_id

                JOIN tokens t
                    ON t.id = p.token_id

                WHERE t.farmer_id = ?

                ORDER BY pay.id DESC
            `).all(req.user.id);


        res.json(payments);

    }
);


// =================================
// NOTIFICATIONS
// =================================

app.get(
    "/api/notifications",
    authenticate,
    (req, res) => {

        if (req.user.role !== "farmer") {
            return res.status(403).json({
                error: "Farmer access required"
            });
        }

        const notifications =
            db.prepare(`
                SELECT *
                FROM notifications
                WHERE farmer_id = ?
                ORDER BY id DESC
            `).all(req.user.id);


        res.json(notifications);

    }
);


// =================================
// HEALTH CHECK
// =================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            status: "online",
            service: "KisanSetu API"
        });

    }
);


// =================================
// START SERVER
// =================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(`
========================================
 KISANSETU SERVER
========================================

Server running at:

http://localhost:${PORT}

Farmer login:
Phone: 9876543210
Password: farmer123

Officer login:
Phone: 9999999999
Password: officer123

========================================
        `);

    }
);
