import { addIncomingMessage, confirmMessage, deleteRemovingMessage, removeMessage, setLastRead, setTyping, updateMessageReactions } from "@/state/messagesSlice";
import { store } from "@/state/store";
import { toast } from "sonner";

let socket: WebSocket | null = null;

export function connectSocket () {
  if (socket) return;
  socket = new WebSocket(process.env.API_BASE_URL!);

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
        store.dispatch(confirmMessage({
          tempId: data.tempId,
          message: data.message,
        }))
        break;

      case "message_received":
        store.dispatch(addIncomingMessage(data.message))
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
}
