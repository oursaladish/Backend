require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/user");

const router = express.Router();

// ==========================
// Email transporter setup
// ==========================
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // Brevo uses TLS on port 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});


transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready to send messages!");
  }
});

// ==========================
// 1️⃣ Register User
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("📩 Register Request:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Generate verification token
    const emailToken = crypto.randomBytes(32).toString("hex");

    // 4️⃣ Create and save user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      emailToken,
    });

    await newUser.save();

    // 5️⃣ Send verification email
    const verifyLink = `${process.env.BACKEND_URL}/api/auth/verify/${emailToken}`;
    const mailOptions = {
      from: `"Our Saladish" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Verify your email - Our Saladish",
      html: `
        <h2>Welcome to Our Saladish, ${name}!</h2>
        <p>Please confirm your email by clicking the link below:</p>
        <a href="${verifyLink}" target="_blank">${verifyLink}</a>
        <br><br>
        <p>If you didn’t request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Verification email sent to ${email}`);

    res.status(201).json({
      message: "Registration successful! Please confirm your email to continue.",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// ==========================
// 2️⃣ Verify Email (Final)
// ==========================
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailToken: token });

    if (!user) {
      return res
        .status(400)
        .send("<h2>❌ Invalid or expired verification link.</h2>");
    }

    // Mark as verified
    user.isVerified = true;
    user.emailToken = undefined;
    await user.save();

    // ✅ Redirect user to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/email-verified`);
    
    // Alternatively, if you want to show HTML directly:
    // res.send("<h2>✅ Email verified successfully! You can now log in.</h2>");
  } catch (error) {
    console.error("Email verification error:", error);
    res
      .status(500)
      .send("<h2>⚠️ Something went wrong during verification.</h2>");
  }
});


// ==========================
// 3️⃣ Login
// ==========================
router.post("/login", async (req, res) => {
  try {
    console.log("🔐 Login Request:", req.body);
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.isVerified)
      return res.status(400).json({ error: "Please confirm your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ==========================
// 4️⃣ Forgot Password
// ==========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"Our Saladish" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - Our Saladish",
      html: `
        <p>Hi ${user.name},</p>
        <p>Click here to reset your password:</p>
        <a href="${resetLink}" target="_blank">Reset Password</a>
      `,
    });

    res.json({ message: "✅ Password reset link sent to your email!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// ==========================
// 5️⃣ Reset Password
// ==========================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: "✅ Password updated successfully!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
