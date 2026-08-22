const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/tourismo"
  )
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
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
  }
});

const User = mongoose.model("User", userSchema);
// ===============================
// SIGNUP ROUTE
// ===============================

app.post("/signup", async (req, res) => {
  try {
    console.log("📥 SIGNUP REQUEST RECEIVED");

    const {
      firstName,
      secondName,
      email,
      phone,
      dob,
      nationality,
      password
    } = req.body;

    // Check required fields
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

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already registered. Please use a different email."
      });
    }

    // Create new account
    const newUser = new User({
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      dob: dob.trim(),
      nationality: nationality.trim(),
      password: password
    });

    // SAVE DIRECTLY TO MONGODB
    await newUser.save();

    console.log(
      "✅ USER SAVED TO MONGODB:",
      normalizedEmail
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully!"
    });

  } catch (error) {
    console.error("❌ SIGNUP ERROR:", error);

    // Duplicate email protection
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "This email is already registered. Please use a different email."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
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

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    console.log(
      "🔑 LOGIN ATTEMPT:",
      normalizedEmail
    );

    // Check that fields exist
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    // Find account using email
    const user = await User.findOne({
      email: normalizedEmail
    });

    // Account doesn't exist
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email or password is incorrect."
      });
    }

    // Check password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Email or password is incorrect."
      });
    }

    console.log(
      "✅ LOGIN SUCCESS:",
      normalizedEmail
    );

    return res.json({
      success: true,
      message: "Login successful!",

      user: {
        firstName: user.firstName,
        secondName: user.secondName,
        email: user.email
      }
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
});
// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `🚀 Tourismo Server running on port ${PORT}`
  );

  console.log(
    `🌍 Server running on port ${PORT}`
  );
});