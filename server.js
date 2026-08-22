const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const crypto = require("crypto");

dotenv.config();

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(bodyParser.json());

app.use(express.static(__dirname));


// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        __dirname + "/home.html"
    );

});


// Allow /home to open home.html

app.get("/home", (req, res) => {

    res.sendFile(
        __dirname + "/home.html"
    );

});


// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
    .connect(
        process.env.MONGO_URI ||
        "mongodb://localhost:27017/tourismo"
    )
    .then(() => {

        console.log(
            "✅ MongoDB connected"
        );

    })
    .catch((err) => {

        console.error(
            "❌ MongoDB connection error:",
            err
        );

    });


// ===============================
// USER SCHEMA
// ===============================

const userSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: true
    },

    secondName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    phone: {
        type: String,
        required: true
    },

    dob: {
        type: String,
        required: true
    },

    nationality: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    // =========================
    // LOGIN SESSION
    // =========================

    sessionToken: {
        type: String,
        default: null
    }

});


const User =
    mongoose.model("User", userSchema);
    // ===============================
// SIGNUP ROUTE
// ===============================

app.post("/signup", async (req, res) => {

    try {

        console.log(
            "📥 SIGNUP REQUEST RECEIVED"
        );


        const {
            firstName,
            secondName,
            email,
            phone,
            dob,
            nationality,
            password
        } = req.body;


        // =========================
        // CHECK REQUIRED FIELDS
        // =========================

        if (
            !firstName ||
            !secondName ||
            !email ||
            !phone ||
            !dob ||
            !nationality ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "All fields are required."

            });

        }


        // =========================
        // NORMALIZE EMAIL
        // =========================

        const normalizedEmail =
            email.trim().toLowerCase();


        // =========================
        // CHECK EXISTING ACCOUNT
        // =========================

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });


        if (existingUser) {

            return res.status(400).json({

                success: false,

                message:
                    "This email is already registered. Please use a different email."

            });

        }


        // =========================
        // CREATE ACCOUNT
        // =========================

        const newUser = new User({

            firstName:
                firstName.trim(),

            secondName:
                secondName.trim(),

            email:
                normalizedEmail,

            phone:
                phone.trim(),

            dob:
                dob.trim(),

            nationality:
                nationality.trim(),

            password:
                password

        });


        // =========================
        // SAVE TO MONGODB
        // =========================

        await newUser.save();


        console.log(
            "✅ USER SAVED TO MONGODB:",
            normalizedEmail
        );


        return res.status(201).json({

            success: true,

            message:
                "Account created successfully!"

        });


    }

    catch (error) {

        console.error(
            "❌ SIGNUP ERROR:",
            error
        );


        if (error.code === 11000) {

            return res.status(400).json({

                success: false,

                message:
                    "This email is already registered."

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Server error. Please try again."

        });

    }

});
// ===============================
// LOGIN ROUTE
// ===============================

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // =========================
        // NORMALIZE EMAIL
        // =========================

        const normalizedEmail =
            String(email || "")
                .trim()
                .toLowerCase();


        console.log(
            "🔑 LOGIN ATTEMPT:",
            normalizedEmail
        );


        // =========================
        // CHECK FIELDS
        // =========================

        if (
            !normalizedEmail ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        // =========================
        // FIND USER
        // =========================

        const user =
            await User.findOne({
                email: normalizedEmail
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Email or password is incorrect."

            });

        }


        // =========================
        // CHECK PASSWORD
        // =========================

        if (user.password !== password) {

            return res.status(401).json({

                success: false,

                message:
                    "Email or password is incorrect."

            });

        }


        // =========================
        // CREATE SESSION TOKEN
        // =========================

        const sessionToken =
            crypto
                .randomBytes(32)
                .toString("hex");


        user.sessionToken =
            sessionToken;


        await user.save();


        // =========================
        // SET LOGIN COOKIE
        // =========================

        const isHttps =
            req.headers["x-forwarded-proto"] === "https" ||
            req.secure;


        let cookie =
            `tourismo_session=${sessionToken}; ` +
            `HttpOnly; ` +
            `Path=/; ` +
            `SameSite=Lax; ` +
            `Max-Age=604800`;


        if (isHttps) {

            cookie += "; Secure";

        }


        res.setHeader(
            "Set-Cookie",
            cookie
        );


        console.log(
            "✅ LOGIN SUCCESS:",
            normalizedEmail
        );


        return res.json({

            success: true,

            message:
                "Login successful!",

            user: {

                firstName:
                    user.firstName,

                secondName:
                    user.secondName,

                email:
                    user.email

            }

        });


    }

    catch (error) {

        console.error(
            "❌ LOGIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error. Please try again."

        });

    }

});
// ===============================
// GET CURRENT LOGGED-IN USER
// ===============================

app.get("/me", async (req, res) => {

    try {

        const cookieHeader =
            req.headers.cookie || "";


        // =========================
        // FIND SESSION COOKIE
        // =========================

        const cookies =
            cookieHeader
                .split(";")
                .map(cookie => cookie.trim());


        const sessionCookie =
            cookies.find(cookie =>
                cookie.startsWith(
                    "tourismo_session="
                )
            );


        if (!sessionCookie) {

            return res.status(401).json({

                success: false,

                message:
                    "Not logged in."

            });

        }


        const sessionToken =
            sessionCookie
                .split("=")
                .slice(1)
                .join("=");


        // =========================
        // FIND USER
        // =========================

        const user =
            await User.findOne({
                sessionToken:
                    sessionToken
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Session expired."

            });

        }


        // =========================
        // RETURN USER
        // =========================

        return res.json({

            success: true,

            user: {

                firstName:
                    user.firstName,

                secondName:
                    user.secondName,

                email:
                    user.email,

                phone:
                    user.phone,

                dob:
                    user.dob,

                nationality:
                    user.nationality

            }

        });


    }

    catch (error) {

        console.error(
            "❌ /ME ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error."

        });

    }

});
// ===============================
// LOGOUT
// ===============================

app.post("/logout", async (req, res) => {

    try {

        const cookieHeader =
            req.headers.cookie || "";


        const cookies =
            cookieHeader
                .split(";")
                .map(cookie => cookie.trim());


        const sessionCookie =
            cookies.find(cookie =>
                cookie.startsWith(
                    "tourismo_session="
                )
            );


        if (sessionCookie) {

            const sessionToken =
                sessionCookie
                    .split("=")
                    .slice(1)
                    .join("=");


            // Remove session from MongoDB

            await User.updateOne(

                {
                    sessionToken:
                        sessionToken
                },

                {
                    $set: {
                        sessionToken: null
                    }
                }

            );

        }


        // =========================
        // CLEAR COOKIE
        // =========================

        res.setHeader(

            "Set-Cookie",

            "tourismo_session=; " +
            "HttpOnly; " +
            "Path=/; " +
            "SameSite=Lax; " +
            "Max-Age=0"

        );


        console.log(
            "✅ USER LOGGED OUT"
        );


        return res.json({

            success: true,

            message:
                "Logged out successfully."

        });


    }

    catch (error) {

        console.error(
            "❌ LOGOUT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to logout."

        });

    }

});
// ===============================
// START SERVER
// ===============================

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `🚀 Tourismo Server running on port ${PORT}`
    );

    console.log(
        `🌍 Server running on port ${PORT}`
    );

});