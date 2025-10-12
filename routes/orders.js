const express = require("express");
const Order = require("../models/order");

const router = express.Router();

// Place an order
router.post("/", async (req, res) => {
  try {
    const { userId, items, address, paymentMethod, total } = req.body;

    const newOrder = new Order({
      userId,
      items,
      address,
      paymentMethod: paymentMethod || "COD",
      total,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ success: true, order: savedOrder });
  } catch (err) {
    console.error("🚨 Order creation error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json({ success: true, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
