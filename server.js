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

// ✅ SECURITY: Helmet for basic security headers
app.use(helmet());

// ✅ CORS: Simplified configuration for debugging
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://oursaladish-frontend.vercel.app",
    "https://oursaladish-frontend.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "Accept", 
    "X-Requested-With",
    "Origin",
    "Access-Control-Allow-Origin"
  ],
  exposedHeaders: ["Authorization"]
}));

// ✅ Handle preflight requests globally
app.options("*", cors());

// ✅ BODY PARSING: Increase limits for potential large payloads
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
  .then(() => console.log("✅ MongoDB connected to:", process.env.MONGO_URI))
  .catch((err) => console.error("❌ MongoDB connection error:", err));


// ==========================
// 🧪 TEST ROUTES (Debugging)
// ==========================

// ✅ Basic health check
app.get("/", (req, res) => {
  res.json({ 
    message: "🥗 Our Saladish Backend is Running Successfully!",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ✅ Detailed health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "✅ Healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// ✅ CORS test endpoint
app.get("/api/cors-test", (req, res) => {
  res.json({ 
    message: "✅ CORS is working correctly!",
    yourOrigin: req.headers.origin,
    allowedOrigins: [
      "http://localhost:3000",
      "https://oursaladish-frontend.vercel.app"
    ],
    headers: req.headers
  });
});

// ✅ Request logger middleware (for debugging)
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin}`);
  console.log(`   Content-Type: ${req.headers['content-type']}`);
  next();
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

// 404 handler for undefined routes
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
  
  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      error: "Duplicate field value entered",
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }
  
  // Default error
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
   • GET  /api/cors-test  - CORS test endpoint
   • POST /api/login      - User login
   • POST /api/register   - User registration
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