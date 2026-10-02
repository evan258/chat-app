"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { connectSocket } from "@/lib/socket";
import { setConversations, setConversationsLoaded } from "@/state/conversationsSlice";
import { FriendshipExtended, setFriendships } from "@/state/friendshipsSlice";
import { setLastReadNotificationId, setNotifications } from "@/state/notificationsSlice";
import { useAppDispatch } from "@/state/store";
import { setUsers } from "@/state/usersSlice";

// runs once per page load for a signed in user, every page reads from the store afterwards
const InitialData = () => {
  const { data: session } = authClient.useSession();
  const dispatch = useAppDispatch();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    connectSocket();

    const fetchInitialData = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const headers = { Authorization: `Bearer ${data.token}` };
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        const [conversationsRes, friendshipsRes, notificationsRes] = await Promise.all([
          fetch(`${baseUrl}/conversations`, { headers }),
          fetch(`${baseUrl}/friendships`, { headers }),
          fetch(`${baseUrl}/notifications`, { headers }),
        ]);

        if (!conversationsRes.ok || !friendshipsRes.ok || !notificationsRes.ok) {
          throw new Error("Failed to fetch initial data");
        }

        const conversations = await conversationsRes.json();
        const friendships: FriendshipExtended[] = await friendshipsRes.json();
        const { notifications, lastReadNotificationId } = await notificationsRes.json();

        dispatch(setConversations(conversations));
        dispatch(setFriendships(friendships));
        dispatch(setUsers(friendships.map((friendship) => friendship.user)));
        dispatch(setNotifications(notifications));
        dispatch(setLastReadNotificationId(lastReadNotificationId));
      } catch (err) {
        console.log(err);
        toast.error("Failed to load your chats");
      } finally {
        dispatch(setConversationsLoaded());
      }
    }

    fetchInitialData();
  }, [userId, dispatch]);

  return null;
}

export default InitialData
