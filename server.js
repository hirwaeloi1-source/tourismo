```javascript
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
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
app.use(express.urlencoded({ extended: true }));

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

// Serve frontend files
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
        console.error("❌ MongoDB connection error:", error);
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
// EMAIL SETUP
// ======================================

// IMPORTANT:
// EMAIL_PASS must be a Gmail APP PASSWORD,
// NOT your normal Gmail password.

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 465,

    secure: true,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },

    // Prevent signup from hanging forever
    connectionTimeout: 15000,

    greetingTimeout: 15000,

    socketTimeout: 20000

});


// Check SMTP connection when server starts

transporter.verify()

    .then(() => {

        console.log("✅ Email server ready");

    })

    .catch((error) => {

        console.error(
            "❌ SMTP ERROR:",
            error.message
        );

        console.error(
            "❌ SMTP CODE:",
            error.code || "unknown"
        );

        console.error(
            "❌ Check EMAIL_USER and EMAIL_PASS on Render."
        );

    });


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
```
```javascript
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
        // CHECK IF EMAIL ALREADY EXISTS
        // ======================================

        const existingUser =
            await User.findOne({ email });


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

            firstName,

            secondName,

            email,

            phone,

            dob,

            nationality,

            password: hashedPassword,

            verified: false,

            verificationToken

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
        // EMAIL
        // ======================================

        const mailOptions = {

            from: process.env.EMAIL_USER,

            to: email,

            subject: "Verify your Tourismo Account",

            html: `

                <h2>Welcome to Tourismo</h2>

                <p>Hello ${firstName},</p>

                <p>
                    Thank you for creating a Tourismo account.
                </p>

                <p>
                    Click the button below to verify your email:
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
                    If the button doesn't work, copy and paste
                    this link into your browser:
                </p>

                <p>
                    ${verificationLink}
                </p>

            `

        };


        // ======================================
        // SEND EMAIL
        // ======================================

        try {

            await transporter.sendMail(mailOptions);


            console.log(
                "✅ VERIFICATION EMAIL SENT:",
                email
            );


            return res.json({

                success: true,

                message:
                    "Verification email sent. Check your inbox."

            });

        }


        catch (emailError) {

            console.error(
                "❌ EMAIL ERROR:",
                emailError
            );


            console.error(
                "❌ EMAIL MESSAGE:",
                emailError.message
            );


            console.error(
                "❌ EMAIL CODE:",
                emailError.code || "unknown"
            );


            // ======================================
            // DELETE USER IF EMAIL FAILED
            // ======================================

            try {

                await User.deleteOne({
                    _id: user._id
                });

                console.log(
                    "🗑️ Unverified user removed."
                );

            }

            catch (deleteError) {

                console.error(
                    "❌ FAILED TO CLEAN UP USER:",
                    deleteError
                );

            }


            return res.status(500).json({

                success: false,

                message:
                    "Verification email could not be sent. Please try again later."

            });

        }

    }


    catch (err) {

        console.error(
            "❌ SIGNUP ERROR:",
            err
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

app.get("/verify/:token", async (req, res) => {

    try {

        const token = req.params.token;


        const user =
            await User.findOne({
                verificationToken: token
            });


        if (!user) {

            return res.status(400).send(`

                <h2>Invalid or expired verification link.</h2>

                <p>
                    Please create a new account or contact support.
                </p>

            `);

        }


        user.verified = true;

        user.verificationToken = null;

        await user.save();


        console.log(
            "✅ EMAIL VERIFIED:",
            user.email
        );


        // Send user to login page

        return res.redirect("/login");


    }


    catch (error) {

        console.error(
            "❌ VERIFICATION ERROR:",
            error
        );


        return res.status(500).send(`

            <h2>Verification failed.</h2>

            <p>
                Please try again later.
            </p>

        `);

    }

});
```
```javascript
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
        // CHECK FIELDS
        // ======================================

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and password are required"

            });

        }


        // ======================================
        // FIND USER
        // ======================================

        const user =
            await User.findOne({ email });


        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password"

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

                message: "Invalid email or password"

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
        // CREATE LOGIN SESSION
        // ======================================

        req.session.userId = user._id.toString();


        console.log(
            "✅ LOGIN SUCCESS:",
            user.email
        );


        return res.json({

            success: true,

            message: "Login successful",

            user: {

                id: user._id,

                firstName: user.firstName,

                secondName: user.secondName,

                email: user.email

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

                message: "Could not log out"

            });

        }


        res.clearCookie("connect.sid");


        return res.json({

            success: true,

            message: "Logged out successfully"

        });

    });

});


// ======================================
// CHECK CURRENT LOGIN
// ======================================

app.get("/me", async (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                message: "Not logged in"

            });

        }


        const user =
            await User.findById(
                req.session.userId
            ).select("-password");


        if (!user) {

            req.session.destroy(() => {});


            return res.status(401).json({

                success: false,

                message: "User not found"

            });

        }


        return res.json({

            success: true,

            user

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

    res.json({

        success: true,

        message: "Tourismo server is working 🚀"

    });

});
```javascript
// ======================================
// 404 HANDLER
// ======================================

app.use((req, res) => {

    // API requests get JSON
    if (req.path.startsWith("/api/") || req.path === "/signup" || req.path === "/login") {

        return res.status(404).json({

            success: false,

            message: "Route not found"

        });

    }


    // Other unknown routes
    res.status(404).send("Page not found");

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


    res.status(500).json({

        success: false,

        message: "Internal server error"

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
        `🌍 SERVER_URL: ${process.env.SERVER_URL || "not set"}`
    );

    console.log(
        `📧 EMAIL_USER: ${process.env.EMAIL_USER || "not set"}`
    );

});
```

