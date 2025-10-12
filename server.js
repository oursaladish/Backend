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

// Middleware setup
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(helmet());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Default route
app.get("/", (req, res) => res.send("🥗 Our Saladish Backend is Running!"));

// API routes
app.use("/api", authRoutes);
app.use("/api/orders", ordersRoute);
app.use("/api/menu", menuRoutes);

// Admin test route
app.get("/api/admin/test", authenticateToken, isAdmin, (req, res) => {
  res.json({ message: "✅ Admin verified", user: req.user });
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
