import { addIncomingMessage, confirmMessage, deleteRemovingMessage, markMessageAsFailed, markMessageAsUnsent, removeMessage, setLastRead, setTyping, updateMessageReactions } from "@/state/messagesSlice";
import { store } from "@/state/store";
import { toast } from "sonner";
import { authClient } from "./auth-client";
import { addConversation, markLastActivityUnsent, newMessageInConversation, removeConversation, removeMemberFromConversation, updateConversation, updateLastActivity } from "@/state/conversationsSlice";
import { addFriendship, removeFriendship, updateFriendship } from "@/state/friendshipsSlice";
import { addNotification } from "@/state/notificationsSlice";

let socket: WebSocket | null = null;

export async function connectSocket () {
  if (socket) return;

  const { data, error } = await authClient.token();
  if (error || !data?.token) return;

  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(data.token)}`;
  socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
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

        socket?.send(JSON.stringify({
          type: "conversation_read",
          conversationId: data.message.conversationId,
        }));
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
          store.dispatch(newMessageInConversation(data.message.conversationId));
        } else {
          socket?.send(JSON.stringify({
            type: "conversation_read",
            conversationId: data.message.conversationId,
          }));
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
        store.dispatch(addFriendship(data.friendShip));
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

      default:
        break;
    }
  }

  socket.onerror = (err) => {
    console.log(err);
  }

  socket.onclose = () => {
    socket = null;
  }
}
