const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const session = require("express-session");
const path = require("path");

dotenv.config();

const app = express();


// ======================================
// BASIC SETUP
// ======================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ======================================
// SESSION
// ======================================

app.use(
    session({
        secret: process.env.SESSION_SECRET || "tourismo-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true
        }
    })
);


// ======================================
// SERVE FRONTEND
// ======================================

app.use(express.static(__dirname));


// ======================================
// PORT
// ======================================

const PORT = process.env.PORT || 3000;


// ======================================
// MONGODB CONNECTION
// ======================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log("✅ MongoDB connected");

    })
    .catch((error) => {

        console.error(
            "❌ MongoDB connection error:",
            error
        );

    });


// ======================================
// USER SCHEMA
// ======================================

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

    verified: {
        type: Boolean,
        default: false
    },

    verificationToken: {
        type: String,
        default: null
    }

});


const User = mongoose.model("User", userSchema);


// ======================================
// RESEND HTTPS EMAIL API
// ======================================

// IMPORTANT:
// RESEND_API_KEY must be added to Render Environment Variables.
//
// Example:
// RESEND_API_KEY=re_xxxxxxxxx
//
// RESEND_FROM must be a sender/domain
// authorized by your Resend account.

const RESEND_API_KEY =
    process.env.RESEND_API_KEY;

const RESEND_FROM =
    process.env.RESEND_FROM;


// ======================================
// CHECK RESEND CONFIGURATION
// ======================================

if (!RESEND_API_KEY) {

    console.error(
        "❌ RESEND_API_KEY is not set."
    );

}
else {

    console.log(
        "✅ Resend API key configured"
    );

}


if (!RESEND_FROM) {

    console.error(
        "❌ RESEND_FROM is not set."
    );

}
else {

    console.log(
        "📧 RESEND_FROM:",
        RESEND_FROM
    );

}


// ======================================
// LOGIN CHECK
// ======================================

function requireLogin(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({

            success: false,

            message: "Please login first"

        });

    }

    next();

}


// ======================================
// PAGES
// ======================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "home.html")
    );

});


app.get("/login", (req, res) => {

    res.sendFile(
        path.join(__dirname, "login.html")
    );

});


app.get("/signup", (req, res) => {

    res.sendFile(
        path.join(__dirname, "signup.html")
    );

});


app.get("/home", (req, res) => {

    res.sendFile(
        path.join(__dirname, "home.html")
    );

});
// ======================================
// SIGNUP
// ======================================

app.post("/signup", async (req, res) => {

    console.log("📥 SIGNUP REQUEST RECEIVED");

    try {

        const {
            firstName,
            secondName,
            email,
            phone,
            dob,
            nationality,
            password
        } = req.body;


        // ======================================
        // CHECK REQUIRED FIELDS
        // ======================================

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

                message: "All fields are required"

            });

        }


        // ======================================
        // CHECK EMAIL
        // ======================================

        const existingUser =
            await User.findOne({
                email: email
            });


        if (existingUser) {

            return res.status(400).json({

                success: false,

                message: "Email already exists"

            });

        }


        // ======================================
        // HASH PASSWORD
        // ======================================

        const hashedPassword =
            await bcrypt.hash(password, 12);


        // ======================================
        // CREATE VERIFICATION TOKEN
        // ======================================

        const verificationToken =
            crypto
                .randomBytes(32)
                .toString("hex");


        // ======================================
        // CREATE USER
        // ======================================

        const user = new User({

            firstName: firstName,

            secondName: secondName,

            email: email,

            phone: phone,

            dob: dob,

            nationality: nationality,

            password: hashedPassword,

            verified: false,

            verificationToken: verificationToken

        });


        await user.save();


        console.log(
            "✅ USER SAVED:",
            email
        );


        // ======================================
        // VERIFICATION LINK
        // ======================================

        const verificationLink =
            `${process.env.SERVER_URL}/verify/${verificationToken}`;


        console.log(
            "🔗 VERIFICATION LINK:",
            verificationLink
        );


        // ======================================
        // CHECK RESEND SETTINGS
        // ======================================

        if (!RESEND_API_KEY || !RESEND_FROM) {

            console.error(
                "❌ Resend environment variables are missing."
            );


            // Remove unverified account
            await User.deleteOne({
                _id: user._id
            });


            return res.status(500).json({

                success: false,

                message:
                    "Email service is not configured."

            });

        }


        // ======================================
        // EMAIL HTML
        // ======================================

        const emailHtml = `

            <div
                style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                "
            >

                <h2>
                    Welcome to Tourismo
                </h2>

                <p>
                    Hello ${firstName},
                </p>

                <p>
                    Thank you for creating your
                    Tourismo account.
                </p>

                <p>
                    Please click the button below
                    to verify your email address.
                </p>

                <p>

                    <a
                        href="${verificationLink}"
                        style="
                            display:inline-block;
                            padding:12px 20px;
                            background:#007bff;
                            color:white;
                            text-decoration:none;
                            border-radius:6px;
                        "
                    >
                        Verify My Account
                    </a>

                </p>

                <p>
                    If the button does not work,
                    copy and paste this link into
                    your browser:
                </p>

                <p>
                    ${verificationLink}
                </p>

                <p>
                    Thank you,<br>
                    Tourismo Team
                </p>

            </div>

        `;


        // ======================================
        // SEND EMAIL USING RESEND HTTPS API
        // ======================================

        try {

            const emailResponse =
                await fetch(
                    "https://api.resend.com/emails",
                    {
                        method: "POST",

                        headers: {
                            "Authorization":
                                `Bearer ${RESEND_API_KEY}`,

                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            from: RESEND_FROM,

                            to: [email],

                            subject:
                                "Verify your Tourismo Account",

                            html: emailHtml

                        })

                    }
                );


            // ======================================
            // READ RESEND RESPONSE
            // ======================================

            const responseText =
                await emailResponse.text();


            let responseData;

            try {

                responseData =
                    JSON.parse(responseText);

            }

            catch {

                responseData = {
                    raw: responseText
                };

            }


            // ======================================
            // RESEND ERROR
            // ======================================

            if (!emailResponse.ok) {

                console.error(
                    "❌ RESEND ERROR:",
                    responseData
                );


                // Remove unverified user
                await User.deleteOne({
                    _id: user._id
                });


                return res.status(500).json({

                    success: false,

                    message:
                        "Verification email could not be sent."

                });

            }


            // ======================================
            // EMAIL SENT
            // ======================================

            console.log(
                "✅ VERIFICATION EMAIL SENT:",
                email
            );


            console.log(
                "📨 RESEND RESPONSE:",
                responseData
            );


            return res.json({

                success: true,

                message:
                    "Verification email sent. Check your inbox."

            });

        }


        catch (emailError) {

            console.error(
                "❌ RESEND CONNECTION ERROR:",
                emailError
            );


            // Remove unverified user
            try {

                await User.deleteOne({
                    _id: user._id
                });

            }

            catch (deleteError) {

                console.error(
                    "❌ FAILED TO DELETE USER:",
                    deleteError
                );

            }


            return res.status(500).json({

                success: false,

                message:
                    "Verification email could not be sent."

            });

        }

    }


    catch (error) {

        console.error(
            "❌ SIGNUP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error. Please try again."

        });

    }

});


// ======================================
// EMAIL VERIFICATION
// ======================================

app.get(
    "/verify/:token",
    async (req, res) => {

        try {

            const token =
                req.params.token;


            const user =
                await User.findOne({

                    verificationToken:
                        token

                });


            if (!user) {

                return res
                    .status(400)
                    .send(`

                        <h2>
                            Invalid or expired
                            verification link.
                        </h2>

                        <p>
                            Please create a new
                            account and try again.
                        </p>

                    `);

            }


            // ======================================
            // VERIFY USER
            // ======================================

            user.verified = true;

            user.verificationToken = null;

            await user.save();


            console.log(
                "✅ EMAIL VERIFIED:",
                user.email
            );


            // ======================================
            // REDIRECT TO LOGIN
            // ======================================

            return res.redirect(
                "/login"
            );

        }


        catch (error) {

            console.error(
                "❌ VERIFICATION ERROR:",
                error
            );


            return res
                .status(500)
                .send(`

                    <h2>
                        Verification failed.
                    </h2>

                    <p>
                        Please try again later.
                    </p>

                `);

        }

    }
);
// ======================================
// LOGIN
// ======================================

app.post("/login", async (req, res) => {

    console.log("📥 LOGIN REQUEST RECEIVED");

    try {

        const {
            email,
            password
        } = req.body;


        // ======================================
        // CHECK REQUIRED FIELDS
        // ======================================

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required"

            });

        }


        // ======================================
        // FIND USER
        // ======================================

        const user =
            await User.findOne({
                email: email
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        // ======================================
        // CHECK PASSWORD
        // ======================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        // ======================================
        // CHECK EMAIL VERIFICATION
        // ======================================

        if (!user.verified) {

            return res.status(403).json({

                success: false,

                message:
                    "Please verify your email before logging in."

            });

        }


        // ======================================
        // CREATE SESSION
        // ======================================

        req.session.userId =
            user._id.toString();


        console.log(
            "✅ LOGIN SUCCESS:",
            user.email
        );


        return res.json({

            success: true,

            message:
                "Login successful",

            user: {

                id: user._id,

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


// ======================================
// LOGOUT
// ======================================

app.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "❌ LOGOUT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Could not log out"

            });

        }


        res.clearCookie(
            "connect.sid"
        );


        return res.json({

            success: true,

            message:
                "Logged out successfully"

        });

    });

});


// ======================================
// CURRENT USER
// ======================================

app.get("/me", async (req, res) => {

    try {

        // ======================================
        // CHECK SESSION
        // ======================================

        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Not logged in"

            });

        }


        // ======================================
        // FIND USER
        // ======================================

        const user =
            await User.findById(
                req.session.userId
            ).select("-password");


        if (!user) {

            req.session.destroy(
                () => {}
            );


            return res.status(401).json({

                success: false,

                message:
                    "User not found"

            });

        }


        return res.json({

            success: true,

            user: user

        });

    }


    catch (error) {

        console.error(
            "❌ /me ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error"

        });

    }

});


// ======================================
// SERVER TEST
// ======================================

app.get("/api/test", (req, res) => {

    return res.json({

        success: true,

        message:
            "Tourismo server is working 🚀"

    });

});
// ======================================
// 404 HANDLER
// ======================================

app.use((req, res) => {

    // API routes
    if (
        req.path.startsWith("/api/") ||
        req.path === "/signup" ||
        req.path === "/login"
    ) {

        return res.status(404).json({

            success: false,

            message: "Route not found"

        });

    }


    // Other unknown pages
    return res.status(404).send(
        "Page not found"
    );

});


// ======================================
// SERVER ERROR HANDLER
// ======================================

app.use((error, req, res, next) => {

    console.error(
        "❌ SERVER ERROR:",
        error
    );


    if (res.headersSent) {

        return next(error);

    }


    return res.status(500).json({

        success: false,

        message:
            "Internal server error"

    });

});


// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {

    console.log(
        `🚀 Tourismo Server running on port ${PORT}`
    );

    console.log(
        `🌍 SERVER_URL: ${
            process.env.SERVER_URL || "not set"
        }`
    );

    console.log(
        `📧 RESEND_FROM: ${
            process.env.RESEND_FROM || "not set"
        }`
    );

});