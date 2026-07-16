const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ========================
// ROOT ROUTE
// ========================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/home.html");
});

// ========================
// MONGODB CONNECTION
// ========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ========================
// USER SCHEMA
// ========================
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  secondName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  dob: { type: String, required: true },
  nationality: { type: String, required: true },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  token: { type: String }
});

const User = mongoose.model("User", userSchema);

// ========================
// EMAIL SETUP
// ========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ========================
// SIGNUP ROUTE
// ========================
app.post("/signup", async (req, res) => {
  try {
    const { firstName, secondName, email, phone, dob, nationality, password } = req.body;

    if (!firstName || !secondName || !email || !phone || !dob || !nationality || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const token = crypto.randomBytes(20).toString("hex");

    const newUser = new User({
      firstName,
      secondName,
      email,
      phone,
      dob,
      nationality,
      password,
      verified: false,
      token
    });

    await newUser.save();

    const verificationLink = `${process.env.SERVER_URL}/verify/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - Tourismo",
      html: `
        <h2>Welcome to Tourismo 🎉</h2>
        <p>Hello ${firstName},</p>
        <p>Click the button below to verify your account:</p>
        <a href="${verificationLink}">Verify Email</a>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("❌ Email error:", err);
        return res.status(500).json({ message: "Failed to send verification email." });
      }

      res.json({
        message: "Signup successful! Please check your email to verify your account."
      });
    });

  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// ========================
// VERIFY EMAIL ROUTE
// ========================
app.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ token: req.params.token });

    if (!user) {
      return res.send("<h3>Invalid or expired verification link.</h3>");
    }

    user.verified = true;
    user.token = null;
    await user.save();

    // Redirect directly to login page
    return res.redirect("/login.html");

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// ========================
// LOGIN ROUTE
// ========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email not found." });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Please verify your email first." });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    res.json({ message: "Login successful!" });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});