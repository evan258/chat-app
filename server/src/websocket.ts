import { WebSocket, WebSocketServer } from "ws";

const clients = new Map<number, WebSocket>();

export function setupWebSocket (wss: WebSocketServer) {
  wss.on("connection", (ws, request) => {
    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
    })
  });
}
