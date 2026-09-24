import { useEffect } from "react";
import { useAppSelector, store } from "@/state/store";
import { loadMessages } from "@/lib/loaders";
import { markConversationRead } from "@/lib/socket";

// when a conversation is opened: fetch its messages the first time and mark it as read
export function useOpenConversation() {
  const openConversationId = useAppSelector((state) => state.conversations.openConversationId);

  useEffect(() => {
    if (openConversationId === null) return;

    const state = store.getState();

    // hasMore is only set by loadMessages, so it tells us whether the first page was fetched
    // (messagesByConversation can already hold messages that arrived over the socket)
    if (state.messages.hasMoreByConversation[openConversationId] === undefined) {
      loadMessages(openConversationId).catch((err) => console.log(err));
    }

    const conversation = state.conversations.conversations.find((conv) => conv.id === openConversationId);
    if (conversation && conversation.unreadCount > 0) {
      markConversationRead(openConversationId);
    }
  }, [openConversationId]);
}
