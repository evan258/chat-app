import { WebSocket, WebSocketServer } from "ws";
import { handleSendMessage } from "./handlers/handleSendMessage.js";
import { handleRemoveMessage } from "./handlers/handleRemoveMessage.js";
import { handleUnsendMessage } from "./handlers/handleUnsendMessage.js";
import { handleReactionUpdate } from "./handlers/handleReactionUpdate.js";
import { handleTyping } from "./handlers/handleTyping.js";
import { handleConversationRead } from "./handlers/handleConversationRead.js";

// a user can have several open connections (tabs, devices)
export const clients = new Map<string, Set<WebSocket>>();

const HEARTBEAT_INTERVAL = 30 * 1000;

export function setupWebSocket (wss: WebSocketServer) {
  // every interval: terminate clients that never answered the previous ping,
  // then mark the rest as not alive and ping them again. a pong flips it back.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }

      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    clearInterval(heartbeat);
  });

  wss.on("connection", (ws, request) => {
    const userId = ws.userId;

    let userSockets = clients.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      clients.set(userId, userSockets);
    }
    userSockets.add(ws);

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("close", () => {
      const userSockets = clients.get(userId);
      if (!userSockets) return;
      userSockets.delete(ws);
      if (userSockets.size === 0) {
        clients.delete(userId);
      }
    });

    ws.on("error", (err) => {
      console.log(err);
    });

    ws.on("message", async (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      try {
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
      } catch (err) {
        console.log(err);
      }
    })
  });
}
