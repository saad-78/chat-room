import { WebSocketServer, WebSocket } from "ws"
import mongoose from "mongoose"
import dotenv from "dotenv"
import { Message } from "./models/message"
import { Room } from "./models/room"

dotenv.config()
const PORT = process.env.PORT || 8080
const MONGO_URI = process.env.MONGO_URI as string

mongoose.connect(MONGO_URI)
const wss = new WebSocketServer({ port: Number(PORT) })

interface ActiveRoom {
  users: Map<string, { socket: WebSocket; username: string }>
  owner: string
}

const activeRooms: Record<string, ActiveRoom> = {}

function broadcast(roomId: string, message: object) {
  const room = activeRooms[roomId]
  if (!room) return
  for (const [, { socket }] of room.users)
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

wss.on("connection", (socket) => {
  let uid: string | null = null
  let username: string | null = null
  let currentRoom: string | null = null

  socket.on("message", async (raw) => {
    const data = JSON.parse(raw.toString())
    const { type, payload } = data

    if (type === "create-room") {
      const { id, user, roomId } = payload
      if (await Room.exists({ roomId })) {
        socket.send(JSON.stringify({ type: "error", message: "Room already exists" }))
        return
      }
      await new Room({ roomId, owner: user }).save()
      activeRooms[roomId] = { users: new Map([[id, { socket, username: user }]]), owner: user }
      uid = id
      username = user
      currentRoom = roomId
      socket.send(JSON.stringify({ type: "room-created", owner: user }))
    }

    else if (type === "join-room") {
      const { id, user, roomId } = payload
      const dbRoom = await Room.findOne({ roomId })
      if (!dbRoom) {
        socket.send(JSON.stringify({ type: "error", message: "Room not found" }))
        return
      }
      if (!activeRooms[roomId]) activeRooms[roomId] = { users: new Map(), owner: dbRoom.owner }

      const room = activeRooms[roomId]
      room.users.set(id, { socket, username: user })
      uid = id
      username = user
      currentRoom = roomId

      const messagesRaw = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(50)
      const messages = messagesRaw.map((m: any) => ({
        user: m.username,
        message: m.message,
        timestamp: m.timestamp,
        uid: Array.from(room.users.entries()).find(([_, v]) => v.username === m.username)?.[0] || m.username,
      }))
      socket.send(JSON.stringify({ type: "history", messages, owner: dbRoom.owner }))
      broadcast(roomId, { type: "system", message: `${user} joined.` })
    }

    else if (type === "reconnect") {
      const { id, user, roomId } = payload
      const dbRoom = await Room.findOne({ roomId })
      if (!dbRoom) {
        socket.send(JSON.stringify({ type: "error", message: "Room not found" }))
        return
      }

      if (!activeRooms[roomId]) activeRooms[roomId] = { users: new Map(), owner: dbRoom.owner }
      const room = activeRooms[roomId]
      room.users.set(id, { socket, username: user })
      uid = id
      username = user
      currentRoom = roomId

      const messagesRaw = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(50)
      const messages = messagesRaw.map((m: any) => ({
        user: m.username,
        message: m.message,
        timestamp: m.timestamp,
        uid: Array.from(room.users.entries()).find(([_, v]) => v.username === m.username)?.[0] || m.username,
      }))
      socket.send(JSON.stringify({ type: "history", messages, owner: dbRoom.owner }))
    }

    else if (type === "chat" && currentRoom && username && uid) {
      const newMsg = await new Message({
        roomId: currentRoom,
        username,
        message: payload.message,
      }).save()

      const msgData = {
        type: "chat",
        user: username,
        uid,
        message: payload.message,
        timestamp: newMsg.timestamp,
      }
      broadcast(currentRoom, msgData)
    }

    else if (type === "leave-room" && currentRoom && uid) {
      const room = activeRooms[currentRoom]
      room?.users.delete(uid)
      broadcast(currentRoom, { type: "system", message: `${username} left.` })
    }

    else if (type === "delete-room" && currentRoom && username) {
      const room = activeRooms[currentRoom]
      if (!room || room.owner !== username) return
      broadcast(currentRoom, { type: "room-deleted", message: "🚨 Room deleted by owner." })
      for (const [, { socket }] of room.users)
        if (socket.readyState === WebSocket.OPEN) socket.close(1000, "Room deleted by owner")
      delete activeRooms[currentRoom]
      await Room.deleteOne({ roomId: currentRoom })
      await Message.deleteMany({ roomId: currentRoom })
    }
  })
})

console.log(`✅ WebSocket server running on ws://localhost:${PORT}`)
