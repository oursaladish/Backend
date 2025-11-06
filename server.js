
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

/* ================================
   ✅ CORS CONFIGURATION
================================ */
const allowedOrigins = [
  "https://oursaladish.vercel.app",
  "https://oursaladish.shop",
  "https://www.oursaladish.shop",
  "https://api.oursaladish.shop",
  "https://oursaladish.onrender.com",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// ✅ CORS before Helmet
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ================================
   ✅ SECURITY HEADERS
================================ */
app.use(helmet());

// ✅ (Optional) Relax Render headers
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Resource-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  next();
});

/* ================================
   ✅ BODY PARSERS
================================ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ================================
   🗄️ DATABASE CONNECTION
================================ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ================================
   🚀 ROUTES
================================ */

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "🥗 Our Saladish Backend is Running Successfully!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Detailed health route
app.get("/api/health", (req, res) => {
  res.json({
    status: "✅ Healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    uptime: process.uptime(),
  });
});

// ✅ All API routes
app.use("/api", authRoutes);
app.use("/api/orders", ordersRoute);
app.use("/api/menu", menuRoutes);

// ✅ Admin test route
app.get("/api/admin/test", authenticateToken, isAdmin, (req, res) => {
  res.json({
    message: "✅ Admin verified successfully",
    user: req.user,
  });
});

/* ================================
   ❌ ERROR HANDLING
================================ */
// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error",
      details: "This origin is not allowed to access the API.",
    });
  }

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

/* ================================
   🔥 SERVER STARTUP
================================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 Our Saladish Backend Server Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
🗄️ Database: ${
    mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌"
  }
📅 Started: ${new Date().toISOString()}

✅ Frontend URL: ${process.env.FRONTEND_URL || "Not set"}
✅ Backend URL: ${process.env.BACKEND_URL || "Not set"}
`);
});

/* ================================
   🧹 GRACEFUL SHUTDOWN
================================ */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed.");
  process.exit(0);
});

module.exports = app;
