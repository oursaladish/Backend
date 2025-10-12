const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: String, // optional, can be from Redux auth state
  items: [
    {
      cartId: String,
      name: String,
      portion: String,
      price: Number,
      quantity: Number,
      image: String,
    },
  ],
  address: {
    name: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
  },
  paymentMethod: { type: String, default: "COD" },
  total: Number,
  status: { type: String, default: "pending" }, // pending, confirmed
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
