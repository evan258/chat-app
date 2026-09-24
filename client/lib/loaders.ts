import { store } from "@/state/store";
import { setConversations } from "@/state/conversationsSlice";
import { setFriendships } from "@/state/friendshipsSlice";
import { setHasMore, setMessages, prependMessages } from "@/state/messagesSlice";
import { setLastReadNotificationId, setNotifications } from "@/state/notificationsSlice";
import { setUsers } from "@/state/usersSlice";
import * as api from "./api";

// must match MESSAGES_PAGE_SIZE on the server
const MESSAGES_PAGE_SIZE = 40;

export async function loadConversations() {
  const conversations = await api.getConversations();
  store.dispatch(setConversations(conversations));
}

export async function loadFriendships() {
  const friendships = await api.getFriendships();
  store.dispatch(setFriendships(friendships));
  store.dispatch(setUsers(friendships.map((friendship) => friendship.user)));
}

export async function loadNotifications() {
  const { notifications, lastReadNotificationId } = await api.getNotifications();
  store.dispatch(setNotifications(notifications));
  store.dispatch(setLastReadNotificationId(lastReadNotificationId));
}

// everything the app needs right after login (and again after a reconnect)
export async function loadInitialData() {
  const results = await Promise.allSettled([
    loadConversations(),
    loadFriendships(),
    loadNotifications(),
  ]);

  for (const result of results) {
    if (result.status === "rejected") console.log(result.reason);
  }
}

export async function loadMessages(conversationId: number) {
  const messages = await api.getMessages(conversationId);

  // keep optimistic / failed messages, and anything that arrived over the socket while fetching
  const lastFetchedId = Number(messages[messages.length - 1]?.id ?? 0);
  const localOnly = (store.getState().messages.messagesByConversation[conversationId] ?? [])
    .filter((message) => message.status !== "sent" || Number(message.id) > lastFetchedId);

  store.dispatch(setMessages({ conversationId, messages: [...messages, ...localOnly] }));
  store.dispatch(setHasMore({ conversationId, hasMore: messages.length === MESSAGES_PAGE_SIZE }));
}

const loadingOlder = new Set<number>();

export async function loadOlderMessages(conversationId: number) {
  if (loadingOlder.has(conversationId)) return;

  const state = store.getState().messages;
  if (state.hasMoreByConversation[conversationId] === false) return;

  const oldest = state.messagesByConversation[conversationId]?.find((message) => message.status === "sent");
  if (!oldest) return;

  loadingOlder.add(conversationId);
  try {
    const messages = await api.getOlderMessages(conversationId, Number(oldest.id));
    store.dispatch(prependMessages({ conversationId, messages }));
    store.dispatch(setHasMore({ conversationId, hasMore: messages.length === MESSAGES_PAGE_SIZE }));
  } finally {
    loadingOlder.delete(conversationId);
  }
}
