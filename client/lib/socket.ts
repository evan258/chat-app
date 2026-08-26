import { addIncomingMessage, confirmMessage, deleteRemovingMessage, markMessageAsFailed, markMessageAsUnsent, removeMessage, setLastRead, setTyping, updateMessageReactions } from "@/state/messagesSlice";
import { store } from "@/state/store";
import { toast } from "sonner";
import { authClient } from "./auth-client";
import { markLastActivityUnsent, newMessageInConversation } from "@/state/conversationsSlice";

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
        }))
        break;

      case "message_sent_failed":
        store.dispatch(markMessageAsFailed({
          tempId: data.tempId,
          conversationId: data.conversationId,
        }))
        break;

      case "message_received":
        store.dispatch(addIncomingMessage(data.message))

        const state = store.getState();
        if (state.conversations.openConversationId !== data.message.conversationId) {
          store.dispatch(newMessageInConversation(data.message.conversationId));
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
        }))
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

      case "conversation_read":
        store.dispatch(setLastRead({
          conversationId: data.conversationId,
          userId: data.userId,
          messageId: data.messageId,
        }))
        break;

      
      default:
        break;
    }
  }

  socket.onerror = () => {
    socket = null;
  }

  socket.onclose = () => {
    socket = null;
  }
}
