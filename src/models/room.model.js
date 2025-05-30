import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema({
  roomNumber: { type: String, unique: true },
  capacity: Number,
  occupants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isFull: { type: Boolean, default: false },
  floor: { type: Number },
});

export const Room = mongoose.model("Room", roomSchema);
roomSchema.pre("save", function (next) {
  this.isFull = this.occupants.length >= this.capacity;
  next();
});
