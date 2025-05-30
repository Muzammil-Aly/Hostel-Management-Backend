import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
});
export const Complaint = mongoose.model("Complaint", complaintSchema);
