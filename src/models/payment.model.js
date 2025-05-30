// models/payment.model.js

import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  method: {
    type: String,
    enum: ["cash", "card", "online"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
});

export const PaymentModel = mongoose.model("PaymentModel", paymentSchema);
