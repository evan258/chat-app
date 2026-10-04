"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, Send } from "lucide-react";
import type { ReactionType } from "@/generated/prisma";
import { authClient } from "@/lib/auth-client";
import { sendSocketMessage } from "@/lib/socket";
import { getConversationInfo } from "@/lib/utils";
import { setOpenConversationId, updateSeenConversation } from "@/state/conversationsSlice";
import {
  addOptimisticMessage, addRemovingMessage, deleteRemovingMessage, markMessageAsFailed, Message,
  prependMessages, removeMessage, setMessages, updateMessageReactions,
} from "@/state/messagesSlice";
import { useAppDispatch, useAppSelector } from "@/state/store";
import { addUser } from "@/state/usersSlice";
import Loading from "@/components/Loading";
import LoadOlderMessages from "@/components/LoadOlderMessages";
import MessageBubble from "@/components/MessageBubble";
import UserAvatar from "@/components/UserAvatar";

// virtuoso needs a positive firstItemIndex that it can decrease every time messages are prepended
const START_INDEX = 100000;
// same as the page size of the older messages endpoint
const PAGE_SIZE = 40;
const noMessages: Message[] = [];

interface ListContext {
  isLoadingOlder: boolean,
}

const ListHeader = ({ context }: { context?: ListContext }) => {
  return (
    <div className="relative h-10">
      {context?.isLoadingOlder && <LoadOlderMessages />}
    </div>
  )
}

// id of a message that is not confirmed by the server yet
const createTempId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ConversationView = ({ conversationId }: { conversationId: number }) => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const myId = session?.user.id;
  const conversationsLoaded = useAppSelector((state) => state.conversations.loaded);
  const conversation = useAppSelector((state) => state.conversations.conversations.find((item) => item.id === conversationId));
  const usersById = useAppSelector((state) => state.users.byId);
  const activeUsers = useAppSelector((state) => state.users.activeUsers);
  const messages = useAppSelector((state) => state.messages.messagesByConversation[conversationId]) ?? noMessages;
  const typing = useAppSelector((state) => state.messages.typingByConversation[conversationId]);
  const lastRead = useAppSelector((state) => state.messages.lastReadByConversation[conversationId]);
  const removingIds = useAppSelector((state) => state.messages.removingMessagesByConversation[conversationId]);

  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const [atBottom, setAtBottom] = useState(true);
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const loadingOlderRef = useRef(false);
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedUsersRef = useRef(new Set<string>());

  const unreadCount = conversation?.unreadCount ?? 0;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  // the socket uses this to know if a new message is read right away or counted as unread
  useEffect(() => {
    dispatch(setOpenConversationId(conversationId));

    return () => {
      dispatch(setOpenConversationId(null));
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!myId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/conversations/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (response.status === 403) return;
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const fetchedMessages: Message[] = await response.json();
        dispatch(setMessages({ conversationId, messages: fetchedMessages }));
        setHasMore(fetchedMessages.length >= PAGE_SIZE);
      } catch (err) {
        console.log(err);
        toast.error("Failed to load messages");
      } finally {
        setMessagesLoaded(true);
      }
    }

    fetchMessages();
  }, [myId, conversationId, dispatch]);

  // opening a conversation with unread messages marks it as read
  useEffect(() => {
    if (!messagesLoaded || unreadCount === 0) return;

    if (sendSocketMessage({ type: "conversation_read", conversationId })) {
      dispatch(updateSeenConversation({ conversationId }));
    }
  }, [messagesLoaded, unreadCount, conversationId, dispatch]);

  // group members that are not friends are not in the store yet, fetch their name and avatar once
  useEffect(() => {
    if (!conversation || !myId) return;

    const missingIds = conversation.members.filter((id) => id !== myId && !usersById[id] && !requestedUsersRef.current.has(id));
    if (missingIds.length === 0) return;

    missingIds.forEach((id) => requestedUsersRef.current.add(id));

    const fetchUsers = async () => {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      for (const id of missingIds) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${id}`, {
            headers: {
              Authorization: `Bearer ${data.token}`,
            },
          });

          if (!response.ok) continue;

          const user = await response.json();
          dispatch(addUser({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, expiresAt: user.expiresAt }));
        } catch (err) {
          console.log(err);
        }
      }
    }

    fetchUsers();
  }, [conversation, myId, usersById, dispatch]);

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!typingRef.current) return;

    typingRef.current = false;
    sendSocketMessage({ type: "typing", conversationId, isTyping: false });
  }

  useEffect(() => {
    return () => {
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior: "smooth" });
  }

  const loadOlderMessages = async () => {
    if (loadingOlderRef.current || !hasMore) return;

    const oldestMessage = messages[0];
    if (!oldestMessage || oldestMessage.status !== "sent") return;

    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/messages/conversations/${conversationId}/messages/${oldestMessage.id}`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch older messages");
      }

      const olderMessages: Message[] = await response.json();

      // the messages and firstItemIndex must change in the same render, otherwise the list jumps
      flushSync(() => {
        dispatch(prependMessages({ conversationId, messages: olderMessages }));
        setFirstItemIndex((index) => index - olderMessages.length);
      });

      setHasMore(olderMessages.length === PAGE_SIZE);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load older messages");
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }

  const sendMessage = (text: string) => {
    if (!myId) return;

    const tempId = createTempId();

    dispatch(addOptimisticMessage({
      id: tempId,
      conversationId,
      senderId: myId,
      createdAt: null,
      previewUrls: [],
      expiresAt: "",
      text,
      unsent: false,
      status: "sending",
      reactions: [],
    }));

    const sent = sendSocketMessage({ type: "send_message", id: tempId, conversationId, text, fileIds: [] });
    if (!sent) {
      dispatch(markMessageAsFailed({ tempId, conversationId }));
    }

    // your own message always scrolls to the bottom, even when you were reading older ones
    requestAnimationFrame(scrollToBottom);
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    sendMessage(text);
    setInput("");
    stopTyping();
  }

  const handleInputChange = (value: string) => {
    setInput(value);

    if (!typingRef.current) {
      typingRef.current = true;
      sendSocketMessage({ type: "typing", conversationId, isTyping: true });
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, 2000);
  }

  const handleRetry = (message: Message) => {
    dispatch(removeMessage({ conversationId, messageId: message.id }));
    if (message.text) sendMessage(message.text);
  }

  const handleReact = (message: Message, reaction: ReactionType) => {
    setSelectedId(null);
    if (!myId || typeof message.id !== "number") return;

    const payload = { conversationId, messageId: message.id, userId: myId, reactionType: reaction };
    dispatch(updateMessageReactions(payload));

    if (!sendSocketMessage({ type: "reaction_update", conversationId, messageId: message.id, reaction })) {
      dispatch(updateMessageReactions(payload));
      toast.error("Failed to react to the message");
    }
  }

  const handleUnsendOrRemove = (message: Message, type: "unsend_message" | "remove_message") => {
    setSelectedId(null);

    // a message that failed to send only exists here
    if (typeof message.id !== "number") {
      dispatch(removeMessage({ conversationId, messageId: message.id }));
      return;
    }

    dispatch(addRemovingMessage({ conversationId, messageId: message.id }));

    if (!sendSocketMessage({ type, conversationId, messageId: message.id })) {
      dispatch(deleteRemovingMessage({ conversationId, messageId: message.id }));
      toast.error("You are offline, try again in a moment");
    }
  }

  if (sessionPending || !conversationsLoaded) return <Loading />;

  if (!conversation) {
    return (
      <div className="min-h-screen bg-white max-w-2xl w-full mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">This conversation could not be found</p>
        <Link href="/" className="rounded-full bg-brand px-6 py-2.5 text-white font-medium hover:bg-brand-dark">Back to chats</Link>
      </div>
    )
  }

  const { name, avatarUrl, otherUserId } = getConversationInfo(conversation, myId, usersById);
  const isGroup = conversation.type === "Group";
  const isActive = otherUserId ? activeUsers[otherUserId] : false;

  const typingNames = Object.entries(typing ?? {})
    .filter(([userId, isTyping]) => isTyping && userId !== myId)
    .map(([userId]) => usersById[userId]?.name.split(" ")[0] ?? "Someone");

  let subtitle = isGroup ? `${conversation.members.length} members` : isActive ? "Online" : "Offline";
  if (typingNames.length > 0) {
    subtitle = isGroup
      ? `${typingNames[0]}${typingNames.length > 1 ? ` and ${typingNames.length - 1} more` : ""} typing...`
      : "typing...";
  }

  return (
    <div className="flex h-dvh max-w-2xl w-full mx-auto flex-col bg-[#F3F7FC]">
      <header className="shrink-0 bg-linear-to-br from-brand-dark to-brand rounded-b-3xl px-4 pt-5 pb-4 text-white shadow-lg z-10">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Back to chats" className="flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="relative">
            <UserAvatar name={name} src={avatarUrl} className="size-11 text-lg" />
            {isActive && <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-brand" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{name}</div>
            <div className={`truncate text-xs ${typingNames.length > 0 ? "text-brand-accent" : "text-white/70"}`}>{subtitle}</div>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {!messagesLoaded ? (
          <Loading />
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">No messages yet, say hi 👋</div>
        ) : (
          <Virtuoso<Message, ListContext>
            ref={virtuosoRef}
            style={{ height: "100%" }}
            data={messages}
            context={{ isLoadingOlder }}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={{ index: "LAST", align: "end" }}
            computeItemKey={(_, message) => message.id}
            followOutput={(isAtBottom) => (isAtBottom ? "smooth" : false)}
            atBottomStateChange={setAtBottom}
            atBottomThreshold={100}
            skipAnimationFrameInResizeObserver
            startReached={loadOlderMessages}
            components={{ Header: ListHeader }}
            itemContent={(index, message) => {
              // a row must never depend on the message above it, otherwise prepending older messages changes its height
              const next = messages[index - firstItemIndex + 1];
              const isLastInRun = !next || next.senderId !== message.senderId;
              const sender = usersById[message.senderId];
              const seen = typeof message.id === "number" && Object.entries(lastRead ?? {})
                .some(([userId, readId]) => userId !== myId && Number(message.id) <= readId);

              return (
                <MessageBubble
                  message={message}
                  isMine={message.senderId === myId}
                  myId={myId ?? ""}
                  isGroup={isGroup}
                  isLastInRun={isLastInRun}
                  senderName={sender?.name}
                  senderAvatar={sender?.avatarUrl}
                  seen={seen}
                  isRemoving={typeof message.id === "number" && !!removingIds?.includes(message.id)}
                  isSelected={selectedId === message.id}
                  onSelect={() => setSelectedId(selectedId === message.id ? null : message.id)}
                  onReact={(reaction) => handleReact(message, reaction)}
                  onUnsend={() => handleUnsendOrRemove(message, "unsend_message")}
                  onRemove={() => handleUnsendOrRemove(message, "remove_message")}
                  onRetry={() => handleRetry(message)}
                />
              )
            }}
          />
        )}

        {!atBottom && messages.length > 0 && (
          <button
            onClick={scrollToBottom}
            aria-label="Scroll to the latest message"
            className="absolute bottom-4 right-4 flex size-10 items-center justify-center rounded-full bg-white text-brand shadow-lg hover:bg-brand-light"
          >
            <ArrowDown className="size-5" />
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 flex items-center gap-2 bg-white px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a message ..."
          className="h-11 flex-1 rounded-full bg-gray-100 px-5 text-gray-800 placeholder:text-gray-400 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send message"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-accent text-white hover:bg-brand disabled:opacity-50"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  )
}

const ConversationPage = () => {
  const { conversationId } = useParams<{ conversationId: string }>();

  // the key resets the whole view (scroll state, firstItemIndex, input) when another conversation opens
  return <ConversationView key={conversationId} conversationId={Number(conversationId)} />
}

export default ConversationPage
