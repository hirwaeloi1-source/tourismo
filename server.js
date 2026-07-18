// ======================================
// TOURISMO SERVER
// ======================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

const app = express();

// ======================================
// MIDDLEWARE
// ======================================

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));


// ======================================
// MONGODB
// ======================================

mongoose.connect(process.env.MONGO_URI)
.then(() => {

    console.log("✅ Connected to MongoDB");

})
.catch(err => {

    console.error(err);

});


// ======================================
// SESSION
// ======================================

app.use(

    session({

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        store: MongoStore.create({

            mongoUrl: process.env.MONGO_URI

        }),

        cookie: {

            httpOnly: true,

            maxAge: 1000 * 60 * 60 * 24,

            secure: process.env.NODE_ENV === "production",

            sameSite: "lax"

        }

    })

);


// ======================================
// USER MODEL
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

        unique: true,

        required: true

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

        default: ""

    }

},

{

    timestamps: true

});

const User = mongoose.model("User", userSchema);


// ======================================
// EMAIL
// ======================================

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    }

});


// ======================================
// LOGIN MIDDLEWARE
// ======================================

function requireLogin(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({

            success: false,

            message: "Please login first."

        });

    }

    next();

}
// ======================================
// ROUTES
// ======================================

// Landing Page
app.get("/", (req, res) => {

    if (req.session.userId) {
        return res.redirect("/home");
    }

    res.sendFile(path.join(__dirname, "login.html"));

});

// Login Page
app.get("/login", (req, res) => {

    res.sendFile(path.join(__dirname, "login.html"));

});

// Signup Page
app.get("/signup", (req, res) => {

    res.sendFile(path.join(__dirname, "signup.html"));

});

// Protected Home
app.get("/home", requireLogin, (req, res) => {

    res.sendFile(path.join(__dirname, "home.html"));

});


// ======================================
// SIGNUP
// ======================================

app.post("/signup", async (req, res) => {

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

                message: "All fields are required."

            });

        }


        const existingUser = await User.findOne({

            email

        });


        if (existingUser) {

            return res.status(400).json({

                success: false,

                message: "Email already exists."

            });

        }


        const hashedPassword = await bcrypt.hash(password, 12);

        const verificationToken = crypto
            .randomBytes(32)
            .toString("hex");


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


        const verificationLink =

            `${process.env.SERVER_URL}/verify/${verificationToken}`;


        await transporter.sendMail({

            from: `"Tourismo" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: "Verify your Tourismo Account",

            html: `

            <h2>Welcome to Tourismo</h2>

            <p>Hello <b>${firstName}</b>,</p>

            <p>
            Thank you for creating a Tourismo account.
            </p>

            <p>
            Click the button below to verify your email.
            </p>

            <a href="${verificationLink}"
            style="
            background:#2e8b57;
            color:white;
            padding:14px 22px;
            text-decoration:none;
            border-radius:6px;
            display:inline-block;
            ">

            Verify Email

            </a>

            <br><br>

            <p>

            If you didn't create this account,

            simply ignore this email.

            </p>

            `

        });


        res.json({

            success: true,

            message:
            "Verification email has been sent to your email address. Please verify your account before logging in."

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error."

        });

    }

});
// ======================================
// VERIFY EMAIL
// ======================================

app.get("/verify/:token", async (req, res) => {

    try {

        const user = await User.findOne({

            verificationToken: req.params.token

        });

        if (!user) {

            return res.send("<h2>Invalid or expired verification link.</h2>");

        }

        user.verified = true;
        user.verificationToken = "";

        await user.save();

        res.redirect("/login.html?verified=true");

    }

    catch (err) {

        console.error(err);

        res.status(500).send("Server Error");

    }

});


// ======================================
// LOGIN
// ======================================

app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "Account not found."

            });

        }

        if (!user.verified) {

            return res.status(403).json({

                success: false,

                message: "Please verify your email first."

            });

        }

        const passwordCorrect = await bcrypt.compare(

            password,

            user.password

        );

        if (!passwordCorrect) {

            return res.status(401).json({

                success: false,

                message: "Incorrect email or password."

            });

        }

        req.session.userId = user._id;
        req.session.userName = user.firstName;
        req.session.email = user.email;

        res.json({

            success: true,

            message: "Login successful.",

            redirect: "/home"

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error."

        });

    }

});


// ======================================
// CURRENT LOGGED-IN USER
// ======================================

app.get("/me", requireLogin, async (req, res) => {

    try {

        const user = await User.findById(req.session.userId)

            .select("-password -verificationToken");

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }

        res.json(user);

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error."

        });

    }

});
// ======================================
// LOGOUT
// ======================================

app.post("/logout", (req, res) => {

    req.session.destroy(err => {

        if (err) {

            return res.status(500).json({

                success: false,

                message: "Logout failed."

            });

        }

        res.clearCookie("connect.sid");

        res.json({

            success: true,

            message: "Logged out successfully."

        });

    });

});


// ======================================
// PROFILE
// ======================================

app.get("/profile", requireLogin, async (req, res) => {

    try {

        const user = await User.findById(req.session.userId)

            .select("-password -verificationToken");

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }

        res.json({

            success: true,

            user

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error."

        });

    }

});


// ======================================
// UPDATE PROFILE
// ======================================

app.put("/profile", requireLogin, async (req, res) => {

    try {

        const {

            firstName,
            secondName,
            phone,
            dob,
            nationality

        } = req.body;

        const user = await User.findById(req.session.userId);

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }

        user.firstName = firstName;
        user.secondName = secondName;
        user.phone = phone;
        user.dob = dob;
        user.nationality = nationality;

        await user.save();

        res.json({

            success: true,

            message: "Profile updated successfully.",

            user

        });

    }

    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server Error."

        });

    }

});


// ======================================
// PROTECTED PAGES
// ======================================

app.get("/explore", requireLogin, (req, res) => {

    res.sendFile(path.join(__dirname, "explore.html"));

});

app.get("/messages", requireLogin, (req, res) => {

    res.sendFile(path.join(__dirname, "messages.html"));

});

app.get("/bookings", requireLogin, (req, res) => {

    res.sendFile(path.join(__dirname, "bookings.html"));

});

app.get("/profile-page", requireLogin, (req, res) => {

    res.sendFile(path.join(__dirname, "profile.html"));

});


// ======================================
// 404 PAGE
// ======================================

app.use((req, res) => {

    res.status(404).send("<h2>404 - Page Not Found</h2>");

});


// ======================================
// START SERVER
// ======================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`✅ Tourismo Server running on port ${PORT}`);

});