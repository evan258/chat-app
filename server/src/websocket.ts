import { WebSocket, WebSocketServer } from "ws";
import { handleSendMessage } from "./handlers/handleSendMessage.js";
import { handleRemoveMessage } from "./handlers/handleRemoveMessage.js";
import { handleUnsendMessage } from "./handlers/handleUnsendMessage.js";
import { handleReactionUpdate } from "./handlers/handleReactionUpdate.js";
import { handleTyping } from "./handlers/handleTyping.js";
import { handleConversationRead } from "./handlers/handleConversationRead.js";

export const clients = new Map<string, WebSocket>();

export function setupWebSocket (wss: WebSocketServer) {
  wss.on("connection", (ws, request) => {
    const userId = ws.userId;
    clients.set(userId, ws);
    ws.on("message", async (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "send_message":
          await handleSendMessage(ws, userId, message);
          break;

        case "remove_message":
          await handleRemoveMessage(ws, userId, message);
          break;

        case "unsend_message":
          await handleUnsendMessage(ws, userId, message);
          break;

        case "reaction_update":
          await handleReactionUpdate(ws, userId, message);
          break;

        case "typing":
          await handleTyping(userId, message);
          break;

        case "conversation_read":
          await handleConversationRead(userId, message);
          break;

        default:
          break;
      }
    })
  });
}
