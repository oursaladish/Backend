// 🔐 auth.js — Middleware to authenticate JWT tokens

const jwt = require("jsonwebtoken");

// Middleware to verify JWT and attach user info to request
const authenticateToken = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Format: "Bearer <token>"

  // If no token is provided, block access
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to request object
    req.user = decoded;

    // Proceed to next middleware or route
    next();
  } catch (err) {
    // Token is invalid or expired
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = authenticateToken;