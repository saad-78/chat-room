import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  owner: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const Room = mongoose.model("Room", roomSchema)
