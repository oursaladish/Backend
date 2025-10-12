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
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ==========================
// 1️⃣ Register
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      confirmationToken,
      confirmationTokenExpires: tokenExpiry,
    });

    const confirmationLink = `http://localhost:3000/confirm/${confirmationToken}`;
    await transporter.sendMail({
      from: `"Our Saladish" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Confirm Your Email",
      html: `
        <p>Hello ${name},</p>
        <p>Click the link below to confirm your email:</p>
        <a href="${confirmationLink}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    res.json({ message: "Registration successful! Check your email to confirm." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ==========================
// 2️⃣ Confirm Email
// ==========================
router.get("/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      confirmationToken: token,
      confirmationTokenExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ error: "Invalid or expired confirmation link" });

    if (user.confirmed)
      return res.status(400).json({ error: "Email already confirmed" });

    user.confirmed = true;
    user.confirmationToken = undefined;
    user.confirmationTokenExpires = undefined;
    await user.save();

    res.json({ message: "Email confirmed successfully!" });
  } catch (err) {
    console.error("Email confirmation error:", err);
    res.status(500).json({ error: "Confirmation failed" });
  }
});

// ==========================
// 3️⃣ Login
// ==========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.confirmed)
      return res.status(400).json({ error: "Please confirm your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ user, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ==========================
// 4️⃣ Forgot Password
// ==========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"Our Saladish" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <p>Hi ${user.name},</p>
        <p>Click here to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email!" });
  } catch (err) {
    console.error("Forgot password error:", err);
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
    if (!password) return res.status(400).json({ error: "Password is required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});
// ==========================
// 5️⃣ Verify Reset Token
// ==========================
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token with JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    res.json({ message: "Token is valid" });
  } catch (err) {
    console.error("Verify token error:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});



module.exports = router;
