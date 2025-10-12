// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGO_URI_LOCAL ||
    process.env.MONGO_URI_ATLAS;

  if (!uri) {
    console.error("❌ No MongoDB URI found in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
