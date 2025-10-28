require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const SibApiV3Sdk = require("sib-api-v3-sdk"); // ✅ Brevo Official SDK

const router = express.Router();

// =========================================================
// ⚙️ Configure Brevo SDK
// =========================================================
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const brevoEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// =========================================================
// Helper: Send Email via Brevo
// =========================================================
async function sendEmailBrevo(to, subject, html) {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
      sender: { name: process.env.SENDER_NAME, email: process.env.SENDER_EMAIL },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    });

    await brevoEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error.response?.body || error.message);
  }
}

// =========================================================
// 1️⃣ Register User
// =========================================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("📩 Register Request:", req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      emailToken,
    });

    await newUser.save();

    const verifyLink = `${process.env.BACKEND_URL}/api/auth/verify/${emailToken}`;
    const html = `
      <h2>Welcome to Our Saladish, ${name}! 🥗</h2>
      <p>Please confirm your email by clicking the link below:</p>
      <a href="${verifyLink}" target="_blank">${verifyLink}</a>
      <p>If you didn’t request this, please ignore this email.</p>
    `;

    await sendEmailBrevo(email, "Verify your email - Our Saladish", html);

    res.status(201).json({
      message: "Registration successful! Please check your email to confirm.",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// =========================================================
// 2️⃣ Verify Email
// =========================================================
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailToken: token });

    if (!user) {
      return res.status(400).send("<h2>❌ Invalid or expired verification link.</h2>");
    }

    user.isVerified = true;
    user.emailToken = undefined;
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/email-verified`);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).send("<h2>⚠️ Something went wrong during verification.</h2>");
  }
});

// =========================================================
// 3️⃣ Login
// =========================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.isVerified)
      return res.status(400).json({ error: "Please confirm your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

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

// =========================================================
// 4️⃣ Forgot Password
// =========================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const html = `
      <h3>Reset Your Password 🔐</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
    `;

    await sendEmailBrevo(email, "Reset your password - Our Saladish", html);

    res.json({ message: "✅ Password reset link sent to your email!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// =========================================================
// 5️⃣ Reset Password
// =========================================================
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
