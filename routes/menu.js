// backend/routes/menu.js
const express = require("express");
const router = express.Router();
const MenuItem = require("../models/menuItem");
const authenticateToken = require("../middlewares/auth");
const isAdmin = require("../middlewares/isAdmin");

// 🥗 Get all menu items (Public)
router.get("/", async (req, res) => {
  try {
    const menu = await MenuItem.find();
    res.json({ success: true, menu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch menu" });
  }
});

// 🧑‍🍳 Add new menu item (Admin only)
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.create(req.body);
    res.json({ success: true, menuItem });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to add item" });
  }
});

// ✏️ Update menu item (Admin only)
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!menuItem) return res.status(404).json({ success: false, error: "Item not found" });
    res.json({ success: true, menuItem });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update item" });
  }
});

// ❌ Delete menu item (Admin only)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete item" });
  }
});

module.exports = router;
