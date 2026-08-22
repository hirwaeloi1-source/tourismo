const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ===============================
// SERVE FRONTEND FILES
// ===============================

app.use(express.static(
    path.join(__dirname)
));
// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "home.html")
    );

});


// Allow /home to open home.html

app.get("/home", (req, res) => {

    res.sendFile(
        path.join(__dirname, "home.html")
    );

});


// ===============================
// MONGODB CONNECTION
// ===============================
const MONGODB_URI =
    process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
    .then(() => {

        console.log(
            "✅ Connected to MongoDB"
        );

    })
    .catch(error => {

        console.error(
            "❌ MongoDB CONNECTION ERROR:",
            error
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
        unique: true
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
    mongoose.model(
        "User",
        userSchema
    );
    // ===============================
// SIGNUP ROUTE
// ===============================

app.post("/signup", async (req, res) => {

    try {

        console.log(
            "📥 SIGNUP REQUEST RECEIVED"
        );


        // =========================
        // GET FORM DATA
        // =========================

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
            String(email)
                .trim()
                .toLowerCase();


        // =========================
        // CHECK EXISTING ACCOUNT
        // =========================

        const existingUser =
            await User.findOne({

                email:
                    normalizedEmail

            });


        if (existingUser) {

            return res.status(400).json({

                success: false,

                message:
                    "This email is already registered. Please use a different email."

            });

        }


        // =========================
        // CREATE SESSION TOKEN
        // =========================

        const sessionToken =
            crypto
                .randomBytes(32)
                .toString("hex");


        // =========================
        // CREATE NEW USER
        // =========================

        const newUser =
            new User({

                firstName:
                    String(firstName)
                        .trim(),

                secondName:
                    String(secondName)
                        .trim(),

                email:
                    normalizedEmail,

                phone:
                    String(phone)
                        .trim(),

                dob:
                    String(dob)
                        .trim(),

                nationality:
                    String(nationality)
                        .trim(),

                password:
                    password,

                // IMPORTANT:
                // User is automatically logged in
                // immediately after signup.

                sessionToken:
                    sessionToken

            });


        // =========================
        // SAVE TO MONGODB
        // =========================

        await newUser.save();


        console.log(
            "✅ USER SAVED TO MONGODB:",
            normalizedEmail
        );


        // =========================
        // CREATE LOGIN COOKIE
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


        // Only use Secure when HTTPS
        // is actually being used.

        if (isHttps) {

            cookie += "; Secure";

        }


        res.setHeader(
            "Set-Cookie",
            cookie
        );


        console.log(
            "✅ AUTO LOGIN SUCCESS:",
            normalizedEmail
        );


        // =========================
        // RETURN SUCCESS
        // =========================

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully!",

            user: {

                firstName:
                    newUser.firstName,

                secondName:
                    newUser.secondName,

                email:
                    newUser.email,

                phone:
                    newUser.phone,

                dob:
                    newUser.dob,

                nationality:
                    newUser.nationality

            }

        });


    }

    catch (error) {

        console.error(
            "❌ SIGNUP ERROR:",
            error
        );


        // =========================
        // DUPLICATE EMAIL
        // =========================

        if (
            error.code === 11000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This email is already registered."

            });

        }


        // =========================
        // SERVER ERROR
        // =========================

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
        // CHECK REQUIRED FIELDS
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

                email:
                    normalizedEmail

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

        if (
            user.password !== password
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Email or password is incorrect."

            });

        }


        // =========================
        // CREATE NEW SESSION TOKEN
        // =========================

        const sessionToken =
            crypto
                .randomBytes(32)
                .toString("hex");


        // =========================
        // SAVE SESSION
        // =========================

        user.sessionToken =
            sessionToken;


        await user.save();


        // =========================
        // CREATE LOGIN COOKIE
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


        // =========================
        // RETURN LOGIN SUCCESS
        // =========================

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
                .map(cookie =>
                    cookie.trim()
                );


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


        // =========================
        // GET SESSION TOKEN
        // =========================

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
        // RETURN USER INFORMATION
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


        // =========================
        // FIND SESSION COOKIE
        // =========================

        const cookies =
            cookieHeader
                .split(";")
                .map(cookie =>
                    cookie.trim()
                );


        const sessionCookie =
            cookies.find(cookie =>
                cookie.startsWith(
                    "tourismo_session="
                )
            );


        // =========================
        // REMOVE SESSION FROM USER
        // =========================

        if (sessionCookie) {

            const sessionToken =
                sessionCookie
                    .split("=")
                    .slice(1)
                    .join("=");


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