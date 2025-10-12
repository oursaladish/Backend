// routes/address.js
const express = require("express");
const router = express.Router();
const Order = require("../models/order"); // Order model

// POST /api/address
router.post("/", async (req, res) => {
  try {
    const { userId, name, phone, street, city, state, zip } = req.body;

    const newAddress = {
      name,
      phone,
      street,
      city,
      state,
      zip,
    };

    // Save as part of new order or attach to user
    const order = new Order({
      userId,
      address: newAddress,
      items: [], // cart items can be added later at checkout
      total: 0,
      status: "pending",
    });

    await order.save();
    res.status(201).json({ success: true, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
