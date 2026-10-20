"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { updateConversation } from "@/state/conversationsSlice";
import { updateMessageUrls } from "@/state/messagesSlice";
import { store, useAppDispatch, useAppSelector } from "@/state/store";
import { updateUserAvatars } from "@/state/usersSlice";

const HOUR = 60 * 60 * 1000;
const REFRESH_BEFORE = 60 * 1000;
const RETRY_AFTER = 30 * 1000;

// the signed urls (avatars, message files) expire, so one minute before the first one does we ask the server
// for new urls for everything in the store, then wait for the expiresAt of the new ones.
// urls that arrive after that expire later, so the next round gets them before they expire.
const RefreshUrls = () => {
  const dispatch = useAppDispatch();
  const loaded = useAppSelector((state) => state.conversations.loaded);

  useEffect(() => {
    if (!loaded) return;

    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const getUrlOwners = () => {
      const { users, conversations, messages } = store.getState();

      return {
        userIds: Object.values(users.byId).filter((user) => user.avatarUrl),
        conversationIds: conversations.conversations.filter((conversation) => conversation.avatarUrl),
        messageIds: Object.values(messages.messagesByConversation).flat().filter((message) => message.previewUrls.length > 0),
      };
    }

    // the first round: the earliest expiresAt we have, or an hour from now if there are no urls yet
    const getFirstExpiry = () => {
      const { userIds, conversationIds, messageIds } = getUrlOwners();
      const times = [...userIds, ...conversationIds, ...messageIds]
        .map((item) => Date.parse(item.expiresAt ?? ""))
        .filter((time) => !isNaN(time));

      return times.length > 0 ? Math.min(...times) : Date.now() + HOUR;
    }

    const schedule = (expiry: number) => {
      timer = setTimeout(refresh, Math.max(expiry - REFRESH_BEFORE - Date.now(), 0));
    }

    const refresh = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) throw new Error("No token");

        const { userIds, conversationIds, messageIds } = getUrlOwners();

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userIds: userIds.map((user) => user.id),
            conversationIds: conversationIds.map((conversation) => conversation.id),
            messageIds: messageIds.map((message) => message.id).filter((id) => typeof id === "number"),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to refresh urls");
        }

        const result = await response.json();
        if (stopped) return;

        dispatch(updateUserAvatars(result.users));
        for (const conversation of result.conversations) dispatch(updateConversation(conversation));
        dispatch(updateMessageUrls(result.messages));

        schedule(Date.parse(result.expiresAt));
      } catch (err) {
        console.log(err);
        if (!stopped) timer = setTimeout(refresh, RETRY_AFTER);
      }
    }

    schedule(getFirstExpiry());

    return () => {
      stopped = true;
      clearTimeout(timer);
    }
  }, [loaded, dispatch]);

  return null;
}

export default RefreshUrls
