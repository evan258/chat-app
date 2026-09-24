import { addIncomingMessage, confirmMessage, deleteRemovingMessage, markMessageAsFailed, markMessageAsUnsent, removeMessage, setLastRead, setTyping, updateMessageReactions } from "@/state/messagesSlice";
import { store } from "@/state/store";
import { toast } from "sonner";
import { addConversation, markLastActivityUnsent, newMessageInConversation, removeConversation, removeMemberFromConversation, updateConversation, updateLastActivity, updateSeenConversation } from "@/state/conversationsSlice";
import { addFriendship, removeFriendship, updateFriendship } from "@/state/friendshipsSlice";
import { addNotification } from "@/state/notificationsSlice";
import { addUser, removeUser } from "@/state/usersSlice";
import { clearToken, getToken } from "./api";
import { loadInitialData, loadMessages } from "./loaders";

let socket: WebSocket | null = null;
let connecting: Promise<void> | null = null;
let shouldReconnect = false;
let hasConnectedBefore = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_RECONNECT_DELAY = 30 * 1000;

export function connectSocket () {
  shouldReconnect = true;
  if (socket || connecting) return;

  connecting = openSocket().finally(() => {
    connecting = null;
  });
}

export function disconnectSocket () {
  shouldReconnect = false;
  hasConnectedBefore = false;
  reconnectAttempts = 0;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const current = socket;
  socket = null;
  current?.close();
}

export function sendSocketMessage (data: object) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(data));
  return true;
}

export function markConversationRead (conversationId: number) {
  store.dispatch(updateSeenConversation({ conversationId }));
  sendSocketMessage({
    type: "conversation_read",
    conversationId,
  });
}

function scheduleReconnect () {
  if (!shouldReconnect || reconnectTimer) return;

  const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket();
  }, delay);
}

// events may have been missed while offline, so refetch what is in the store
async function resync () {
  await loadInitialData();

  const loadedIds = Object.keys(store.getState().messages.hasMoreByConversation).map(Number);
  await Promise.allSettled(loadedIds.map((id) => loadMessages(id)));

  const { conversations, openConversationId } = store.getState().conversations;
  const openConversation = conversations.find((conv) => conv.id === openConversationId);
  if (openConversation && openConversation.unreadCount > 0) {
    markConversationRead(openConversation.id);
  }
}

async function openSocket () {
  let token: string;
  try {
    token = await getToken();
  } catch (err) {
    console.log(err);
    scheduleReconnect();
    return;
  }

  // disconnectSocket() may have been called while waiting for the token
  if (!shouldReconnect) return;

  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(wsUrl);
  socket = ws;

  ws.onopen = () => {
    reconnectAttempts = 0;
    if (hasConnectedBefore) {
      resync().catch((err) => console.log(err));
    }
    hasConnectedBefore = true;
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "message_sent_successfully":
        store.dispatch(confirmMessage({
          tempId: data.tempId,
          message: data.message,
        }));

        store.dispatch(updateLastActivity({
          conversationId: data.message.conversationId,
          lastActivity: {
            type: "message",
            id: data.message.id,
            senderId: data.message.senderId,
            text: data.message.text,
            filesLen: data.message.previewUrls.length,
            unsent: data.message.unsent,
          },
        }));

        sendSocketMessage({
          type: "conversation_read",
          conversationId: data.message.conversationId,
        });
        break;

      case "message_sent_failed":
        store.dispatch(markMessageAsFailed({
          tempId: data.tempId,
          conversationId: data.conversationId,
        }))
        break;

      case "message_received":
        store.dispatch(addIncomingMessage(data.message));

        store.dispatch(updateLastActivity({
          conversationId: data.message.conversationId,
          lastActivity: {
            type: "message",
            id: data.message.id,
            senderId: data.message.senderId,
            text: data.message.text,
            filesLen: data.message.previewUrls.length,
            unsent: data.message.unsent,
          },
        }));

        const state = store.getState();
        if (state.conversations.openConversationId !== data.message.conversationId) {
          store.dispatch(newMessageInConversation({conversationId: data.message.conversationId}));
        } else {
          sendSocketMessage({
            type: "conversation_read",
            conversationId: data.message.conversationId,
          });
        }
        break;

      case "remove_message_failed":
        store.dispatch(deleteRemovingMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }))
        toast.error("Failed to remove message");
        break;

      case "remove_message_successfully":
        store.dispatch(deleteRemovingMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }))
        store.dispatch(removeMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }))
        break;

      case "message_unsent_successfully":
        store.dispatch(deleteRemovingMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        })) 
        store.dispatch(removeMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }));
        store.dispatch(markLastActivityUnsent({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }));
        break;

      case "message_unsent_failed":
        store.dispatch(deleteRemovingMessage({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }))
        toast.error("Failed to unsend message");
        break;

      case "incoming_message_unsent":
        store.dispatch(markMessageAsUnsent({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }));
        store.dispatch(markLastActivityUnsent({
          conversationId: data.conversationId,
          messageId: data.messageId,
        }));
        break;


      case "incoming_message_reaction_update":
        store.dispatch(updateMessageReactions({
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: data.userId,
          reactionType: data.reaction,
        }));

        store.dispatch(updateLastActivity({
          conversationId: data.conversationId,
          lastActivity: {
            type: "reaction",
            messageId: data.messageId,
            senderId: data.userId,
            reaction: data.reaction,
            reactionAction: data.action,
          },
        }));
        break;

      case "message_reaction_update_successfully":
        store.dispatch(updateLastActivity({
          conversationId: data.conversationId,
          lastActivity: {
            type: "reaction",
            messageId: data.messageId,
            senderId: data.userId,
            reaction: data.reaction,
            reactionAction: data.action,
          },
        }));
        break;

      case "message_reaction_update_failed":
        store.dispatch(updateMessageReactions({
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: data.userId,
          reactionType: data.reaction,
        }))
        break;

      case "user_typing":
        store.dispatch(setTyping({
          userId: data.userId,
          conversationId: data.conversationId,
          isTyping: data.isTyping,
        }))
      break;

      case "incoming_conversation_read":
        store.dispatch(setLastRead({
          conversationId: data.conversationId,
          userId: data.userId,
          messageId: data.messageId,
        }))
        break;

      case "incoming_conversation_added":
        store.dispatch(addConversation(data.conversation));
        break;

      case "incoming_conversation_update":
        store.dispatch(updateConversation(data.conversation));
        break;

      case "incoming_member_removal":
        store.dispatch(removeMemberFromConversation({
          conversationId: data.conversationId,
          memberId: data.memberId,
        }));
        break;

      case "removed_from_conversation":
        store.dispatch(removeConversation({
          conversationId: data.conversationId,
        }));
        break;

      case "incoming_user_unfriend":
        store.dispatch(removeConversation({
          conversationId: data.conversationId,
        }));

        store.dispatch(removeFriendship({
          userId: data.userId,
          friendId: data.friendId,
        }));
        break;

      case "incoming_friend_request":
        store.dispatch(addFriendship(data.friendship));
        break;

      case "friend_request_accepted":
        store.dispatch(updateFriendship({
          userId: data.userId,
          friendId: data.friendId,
          status: "Accepted",
        }));

        store.dispatch(addConversation(data.conversation));
        break;

      case "friend_request_rejected":
        store.dispatch(removeFriendship({
          userId: data.userId,
          friendId: data.friendId,
        }));
        break;

      case "incoming_notification":
        store.dispatch(addNotification(data.notification));
        break;

      case "add_user":
        store.dispatch(addUser(data.user));
        break;

      case "remove_user":
        store.dispatch(removeUser(data.userId));
        break;

      default:
        break;
    }
  }

  ws.onerror = (err) => {
    console.log(err);
  };

  ws.onclose = () => {
    // ignore sockets that were already replaced or closed on purpose
    if (socket !== ws) return;
    socket = null;

    // the upgrade may have been rejected because the token expired
    clearToken();
    scheduleReconnect();
  };
}
