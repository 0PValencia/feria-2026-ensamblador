import { io } from "socket.io-client";

export function crearSocket() {
  return io({
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}
