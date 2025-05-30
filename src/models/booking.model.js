import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
  fromDate: {
    type: Date,
  },
  toDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },
});

export const Booking = mongoose.model("Booking", bookingSchema);
