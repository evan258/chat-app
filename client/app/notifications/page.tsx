"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getConversationInfo } from "@/lib/utils";
import { Notification, removeNotification, setLastReadNotificationId, setNotifications } from "@/state/notificationsSlice";
import { useAppDispatch, useAppSelector } from "@/state/store";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";

const groupTypes = ["AddedToGroup", "RemovedFromGroup", "GroupNameChanged", "GroupPhotoChanged"];

const timeAgo = (createdAt: string, now: number) => {
  const minutes = Math.floor((now - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

const NotificationsPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.notifications.notifications);
  const conversations = useAppSelector((state) => state.conversations.conversations);
  const usersById = useAppSelector((state) => state.users.byId);
  const [loaded, setLoaded] = useState(false);
  // the read marker from before this page opened, everything newer is shown as new
  const [readBefore, setReadBefore] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const myId = session?.user.id;
  const newestId = notifications[0]?.id;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  // always load the list when the page opens, so the photo links are fresh
  // and notifications deleted on the server (for example after an unfriend) are gone
  useEffect(() => {
    if (!myId) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }

        const result = await response.json();
        dispatch(setNotifications(result.notifications));
        setReadBefore(result.lastReadNotificationId);
        setNow(Date.now());
        setLoaded(true);
      } catch (err) {
        console.log(err);
        toast.error("Failed to load notifications");
      }
    }

    fetchNotifications();
  }, [myId, dispatch]);

  // everything on the page is read, also a notification that arrives while the page is open
  useEffect(() => {
    if (!loaded || !newestId) return;

    const markAsRead = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/read`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to mark notifications as read");
        }

        const result = await response.json();
        dispatch(setLastReadNotificationId(result.lastReadNotificationId));
      } catch (err) {
        console.log(err);
      }
    }

    markAsRead();
  }, [loaded, newestId, dispatch]);

  const handleRemove = async (notificationId: number) => {
    setRemovingId(notificationId);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message);
      }

      dispatch(removeNotification(notificationId));
    } catch (err) {
      console.log(err);
      toast.error("Failed to remove the notification");
    } finally {
      setRemovingId(null);
    }
  }

  // the text, the picture and where tapping it goes
  const getContent = (notification: Notification) => {
    const initiator = usersById[notification.initiator.id] ?? notification.initiator;
    // the group may be gone from the store (left or removed), then the notification's own copy is used
    const conversation = conversations.find((item) => item.id === notification.conversationId?.id);
    const groupName = conversation
      ? getConversationInfo(conversation, myId, usersById).name
      : notification.conversationId?.name || "a group";
    const groupAvatar = conversation?.avatarUrl ?? notification.conversationId?.avatarUrl;
    const conversationLink = conversation ? `/conversations/${conversation.id}` : undefined;

    const texts = {
      FriendRequestSent: "sent you a friend request",
      FriendRequestAccepted: "accepted your friend request",
      FriendRequestRejected: "declined your friend request",
      Unfriended: "removed you from their friends",
      AddedToGroup: `added you to ${groupName}`,
      RemovedFromGroup: `removed you from ${groupName}`,
      GroupNameChanged: `renamed the group to ${groupName}`,
      GroupPhotoChanged: `changed the photo of ${groupName}`,
    };

    const links = {
      FriendRequestSent: "/friendships",
      FriendRequestAccepted: conversationLink ?? `/users/${initiator.id}`,
      FriendRequestRejected: `/users/${initiator.id}`,
      Unfriended: `/users/${initiator.id}`,
      AddedToGroup: conversationLink,
      RemovedFromGroup: undefined,
      GroupNameChanged: conversationLink,
      GroupPhotoChanged: conversationLink,
    };

    const isGroup = groupTypes.includes(notification.type);

    return {
      initiatorName: initiator.name,
      text: texts[notification.type],
      link: links[notification.type],
      avatarName: isGroup ? groupName : initiator.name,
      avatarUrl: isGroup ? groupAvatar : initiator.avatarUrl,
    };
  }

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
      <PageHeader title="Notifications" />

      {!loaded ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center text-center px-8 mt-16">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-light">
            <Bell className="size-8 text-brand" />
          </div>
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="py-2">
          {notifications.map((notification) => {
            const content = getContent(notification);
            const isNew = readBefore === null || notification.id > readBefore;

            const body = (
              <>
                <UserAvatar name={content.avatarName} src={content.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{content.initiatorName}</span> {content.text}
                  </p>
                  <span className={`text-xs ${isNew ? "font-medium text-brand" : "text-gray-400"}`}>
                    {timeAgo(notification.createdAt, now)}
                  </span>
                </div>
              </>
            );

            return (
              <div key={notification.id} className={`flex items-center gap-3 px-5 py-3 ${isNew ? "bg-brand-light/50" : ""}`}>
                {content.link ? (
                  <Link href={content.link} className="flex flex-1 min-w-0 items-center gap-3">{body}</Link>
                ) : (
                  <div className="flex flex-1 min-w-0 items-center gap-3">{body}</div>
                )}
                <button
                  onClick={() => handleRemove(notification.id)}
                  disabled={removingId === notification.id}
                  aria-label="Remove notification"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
