require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

// -----------------------------
// Brevo (Sendinblue) SDK setup
// -----------------------------
const SibApiV3Sdk = require("sib-api-v3-sdk");

const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKeyAuth = brevoClient.authentications["api-key"];
apiKeyAuth.apiKey = process.env.BREVO_API_KEY;

const brevoEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const EMAIL_REQUIRED = (process.env.EMAIL_REQUIRED || "false").toLowerCase() === "true";

const router = express.Router();

/**
 * ✅ Helper: Send transactional email using Brevo
 */
async function sendEmailBrevo(to, subject, htmlContent) {
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || "Our Saladish";

  if (!senderEmail) {
    const msg = "SENDER_EMAIL is not set in .env";
    console.error("❌ Email sending failed:", msg);
    if (EMAIL_REQUIRED) throw new Error(msg);
    return { skipped: true, reason: msg };
  }

  const emailPayload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  try {
    const resp = await brevoEmailApi.sendTransacEmail(emailPayload);
    return resp;
  } catch (error) {
    const code = error?.response?.body?.code || error?.code || "unknown_error";
    const message = error?.response?.body?.message || error?.message || "Email send failed";

    console.error("❌ Email sending failed:", { code, message });

    if (EMAIL_REQUIRED) throw new Error("Email sending failed");
    return { failed: true, code, message };
  }
}

// =========================================================
// 1️⃣ REGISTER USER
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

    // ✅ Build verification link for backend (Render)
    const verifyLink = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/verify/${emailToken}`;

    const html = `
      <h2>Welcome to Our Saladish, ${name}! 🥗</h2>
      <p>Thanks for registering! Please confirm your email by clicking below:</p>
      <a href="${verifyLink}" target="_blank" style="color:#00bfa6;font-weight:bold;">Verify Email</a>
      <p>If you didn’t request this, please ignore this email.</p>
    `;

    await sendEmailBrevo(email, "Verify your email - Our Saladish", html);

    return res.status(201).json({
      message: "Registration successful! Please check your email to confirm.",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

// =========================================================
// 2️⃣ VERIFY EMAIL
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

    console.log(`✅ ${user.email} verified successfully`);

    // ✅ Redirect to live frontend domain (GoDaddy)
    return res.redirect(`${process.env.FRONTEND_URL || "https://www.oursaladish.shop"}/login?verified=true`);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).send("<h2>⚠️ Something went wrong during verification.</h2>");
  }
});

// =========================================================
// 3️⃣ LOGIN
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
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({
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
    return res.status(500).json({ error: "Login failed" });
  }
});

// =========================================================
// 4️⃣ FORGOT PASSWORD
// =========================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    const html = `
      <h3>Reset Your Password 🔐</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank" style="color:#00bfa6;font-weight:bold;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `;

    await sendEmailBrevo(email, "Reset your password - Our Saladish", html);

    return res.json({ message: "✅ Password reset link sent to your email!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to send reset email" });
  }
});

// =========================================================
// 5️⃣ RESET PASSWORD
// =========================================================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(400).json({ error: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    return res.json({ message: "✅ Password updated successfully!" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(400).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
