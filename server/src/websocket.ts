import { WebSocket, WebSocketServer } from "ws";
import { handleSendMessage } from "./handlers/handleSendMessage.js";
import { handleRemoveMessage } from "./handlers/handleRemoveMessage.js";
import { handleUnsendMessage } from "./handlers/handleUnsendMessage.js";
import { handleReactionUpdate } from "./handlers/handleReactionUpdate.js";
import { handleTyping } from "./handlers/handleTyping.js";
import { handleConversationRead } from "./handlers/handleConversationRead.js";
import { handleActiveUsersQuery } from "./handlers/handleActiveUsersQuery.js";
import { handleActiveStatus } from "./handlers/handleActiveStatus.js";
import { handleSetUsers } from "./handlers/handleSetUsers.js";

export const clients = new Map<string, WebSocket>();

export function setupWebSocket (wss: WebSocketServer) {
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", async (ws, request) => {
    const userId = ws.userId;

    const oldSocket = clients.get(userId);
    if (oldSocket) oldSocket.terminate();
    clients.set(userId, ws);

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

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

        case "active_users_query":
          await handleActiveUsersQuery(ws);
          break;

        default:
          break;
      }
    })

    ws.on("close", async () => {
      if (clients.get(userId) !== ws) return;
      clients.delete(userId);

      await handleActiveStatus(userId, "user_inactive");
    })

    await handleSetUsers(ws);
    await handleActiveStatus(userId, "user_active");
  });
}
