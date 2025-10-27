import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import "./App.css"

function App() {
  const [username, setUsername] = useState("")
  const [roomId, setRoomId] = useState("")
  const [roomOwner, setRoomOwner] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [joined, setJoined] = useState(false)
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messageRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [uid] = useState(() => localStorage.getItem("uid") || uuidv4())

  useEffect(() => localStorage.setItem("uid", uid), [uid])
  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages])

  const showToast = (text: string, color = "rose") => {
    setToast({ text, color })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const s = localStorage.getItem("chat-session")
    if (s) {
      const { username, roomId } = JSON.parse(s)
      setUsername(username)
      setRoomId(roomId)
      reconnect(username, roomId)
    }
  }, [])

  const connect = (action: "create-room" | "join-room") => {
    const ws = new WebSocket("wss://chat-room-8fg1.onrender.com")
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: action, payload: { id: uid, user: username, roomId } }))
      localStorage.setItem("chat-session", JSON.stringify({ username, roomId }))
    }
    setupHandlers(ws)
    wsRef.current = ws
  }

  const reconnect = (user: string, room: string) => {
    const ws = new WebSocket("wss://chat-room-8fg1.onrender.com")
    ws.onopen = () => ws.send(JSON.stringify({ type: "reconnect", payload: { id: uid, user, roomId: room } }))
    setupHandlers(ws)
    wsRef.current = ws
  }

  const setupHandlers = (ws: WebSocket) => {
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "room-created") {
        setJoined(true)
        setRoomOwner(data.owner)
        showToast(`🟢 Room "${roomId}" created!`, "green")
      } else if (data.type === "history") {
        setJoined(true)
        setRoomOwner(data.owner)
        setMessages(data.messages)
      } else if (data.type === "error") showToast(data.message, "amber")
      else if (data.type === "chat") setMessages((p) => [...p, data])
      else if (data.type === "system") setMessages((p) => [...p, { system: true, message: data.message }])
      else if (data.type === "room-deleted") {
        showToast("🚨 Room deleted by owner", "red")
        leaveRoom()
      }
    }
  }

  const sendMessage = () => {
    const msg = messageRef.current?.value.trim()
    if (!msg || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ type: "chat", payload: { message: msg } }))
    messageRef.current!.value = ""
  }

  const leaveRoom = () => {
    wsRef.current?.send(JSON.stringify({ type: "leave-room" }))
    wsRef.current?.close()
    setJoined(false)
    setMessages([])
    localStorage.removeItem("chat-session")
    showToast("👋 You left the room", "yellow")
  }

  const deleteRoom = () => {
    wsRef.current?.send(JSON.stringify({ type: "delete-room" }))
    showToast("❌ Room deleted", "red")
  }

  const formatTime = (t: string) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-white relative overflow-hidden">
      {toast && (
        <div
          className={`fixed top-5 right-2 sm:right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs sm:text-sm text-white bg-${toast.color}-600 transition transform duration-300 animate-fade-in-down`}
        >
          {toast.text}
        </div>
      )}

      {!joined ? (
        <div className="m-auto text-center space-y-6 px-4">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight">Realtime Chat</h1>
          <input
            className="p-3 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br />
          <input
            className="p-3 rounded-lg text-black w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <div className="flex justify-center mt-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => connect("create-room")} className="bg-gradient-to-r from-pink-500 to-orange-500 px-6 py-2 text-sm sm:text-base rounded-lg shadow-md hover:opacity-90 transition">
                Create
              </button>
              <button onClick={() => connect("join-room")} className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2 text-sm sm:text-base rounded-lg shadow-md hover:opacity-90 transition">
                Join
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center border-b border-gray-700 p-3 sm:p-4 bg-[#111] text-sm sm:text-base">
            <h2 className="font-semibold">
              Room: {roomId} <span className="text-gray-400">|</span> You: {username}
            </h2>
            <div className="space-x-2 flex">
              <button onClick={leaveRoom} className="bg-yellow-500 hover:bg-yellow-600 px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-black font-medium text-xs sm:text-base">
                Leave
              </button>
              {username === roomOwner && (
                <button onClick={deleteRoom} className="bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-base">
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-scroll p-3 sm:p-5 space-y-4 sm:space-y-5 bg-gradient-to-b from-[#0d0d0d] to-[#141414]">
            {messages.map((msg, i) => {
              const isSelf = msg.uid === uid
              const initial = (msg.user || username)[0]?.toUpperCase()
              return (
                <div key={i} className={`flex items-end gap-2 sm:gap-3 ${isSelf ? "justify-end" : "justify-start"}`}>
                  {!msg.system && (
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full font-semibold text-xs sm:text-sm ${
                        isSelf ? "bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white" : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {initial}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-3 rounded-3xl shadow-md transition-all ${
                      isSelf
                        ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-br-none"
                        : msg.system
                        ? "bg-transparent text-yellow-400 italic text-center mx-auto"
                        : "bg-[#262626] text-gray-100 rounded-bl-none"
                    }`}
                  >
                    {!isSelf && !msg.system && (
                      <div className="text-[10px] sm:text-xs font-semibold mb-1 text-gray-400">{msg.user}</div>
                    )}
                    <div className="break-words whitespace-pre-wrap text-sm sm:text-[15px] leading-snug">
                      {msg.message}
                    </div>
                    {msg.timestamp && !msg.system && (
                      <div className="text-[10px] sm:text-[11px] opacity-60 mt-1 text-right">{formatTime(msg.timestamp)}</div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef}></div>
          </div>

          {/* Mobile keyboard-aware input bar */}
          <div
            id="input-bar"
            className="keyboard-aware flex items-center bg-[#111] border-t border-gray-700 p-2 sm:p-3 sticky bottom-[env(keyboard-inset-height,0)]"
          >
            <input
              ref={messageRef}
              placeholder="Message..."
              className="flex-1 bg-[#1c1c1c] rounded-full p-2 sm:p-3 px-3 sm:px-5 text-xs sm:text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-gray-500"
              onFocus={() => {
                if ("virtualKeyboard" in navigator) {
                  // @ts-ignore
                  navigator.virtualKeyboard.overlaysContent = true
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="ml-2 sm:ml-3 bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 sm:px-5 py-2 rounded-full font-medium text-xs sm:text-sm hover:opacity-90 transition"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
