import { useEffect, useRef, useState, useCallback } from "react"
import PartySocket from "partysocket"
import type { ServerMsg, RoomState, ClientMsg } from "../types/network"

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999"

interface UseRoomReturn {
  connected: boolean
  roomState: RoomState | null
  send: (msg: ClientMsg) => void
  lastEvent: ServerMsg | null
}

export function useRoom(roomId: string | null): UseRoomReturn {
  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [lastEvent, setLastEvent] = useState<ServerMsg | null>(null)
  const socketRef = useRef<PartySocket | null>(null)

  const send = useCallback((msg: ClientMsg) => {
    socketRef.current?.send(JSON.stringify(msg))
  }, [])

  useEffect(() => {
    if (!roomId) return

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
    })
    socketRef.current = socket

    socket.addEventListener("open", () => setConnected(true))
    socket.addEventListener("close", () => setConnected(false))

    socket.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data as string) as ServerMsg
      setLastEvent(msg)

      if (msg.type === "state") {
        setRoomState(msg.state)
      }
    })

    return () => {
      socket.close()
      socketRef.current = null
      setConnected(false)
      setRoomState(null)
    }
  }, [roomId])

  return { connected, roomState, send, lastEvent }
}
