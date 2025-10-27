require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

// Import routes
const authRoutes = require("./routes/auth");
const ordersRoute = require("./routes/orders");
const menuRoutes = require("./routes/menu");

// Middlewares
const authenticateToken = require("./middlewares/auth");
const isAdmin = require("./middlewares/isAdmin");

// Initialize app
const app = express();

// ==========================
// 🛠️ MIDDLEWARE SETUP
// ==========================

// ✅ Security: Helmet for HTTP header protection
app.use(helmet());

// ✅ CORS: Unified configuration (Render + Localhost)
const allowedOrigins = [
  "http://localhost:3000",
  "https://oursaladish-frontend.vercel.app",
  "https://oursaladish-frontend.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow server-to-server/cURL requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "Origin"
  ],
  exposedHeaders: ["Authorization"]
}));

// ✅ Handle preflight requests globally
app.options("*", cors());

// ✅ BODY PARSING: Handle JSON payloads safely
app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON in request body" });
      throw new Error("Invalid JSON");
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// ==========================
// 🗄️ DATABASE CONNECTION
// ==========================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ==========================
// 🧪 TEST ROUTES
// ==========================

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "🥗 Our Saladish Backend is Running Successfully!",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    uptime: process.uptime()
  });
});

// ==========================
// 🚀 API ROUTES
// ==========================

app.use("/api", authRoutes);
app.use("/api/orders", ordersRoute);
app.use("/api/menu", menuRoutes);

// ==========================
// 👑 ADMIN ROUTES
// ==========================

app.get("/api/admin/test", authenticateToken, isAdmin, (req, res) => {
  res.json({
    message: "✅ Admin verified successfully",
    user: req.user
  });
});

// ==========================
// ❌ ERROR HANDLING MIDDLEWARE
// ==========================

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", err.stack);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate field value entered",
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message
  });
});

// ==========================
// 🔥 SERVER STARTUP
// ==========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 Our Saladish Backend Server Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
🗄️ Database: ${mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌"}
📅 Started: ${new Date().toISOString()}

📋 Available Test Endpoints:
   • GET  /               - Basic health check
   • GET  /api/health     - Detailed health info
   • POST /api/register   - User registration
   • POST /api/login      - User login
  `);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed.");
  process.exit(0);
});

module.exports = app;
