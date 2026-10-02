"use client";

import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { connectSocket } from "@/lib/socket";
import { setConversations } from "@/state/conversationsSlice";
import { FriendshipExtended, setFriendships } from "@/state/friendshipsSlice";
import { setLastReadNotificationId, setNotifications } from "@/state/notificationsSlice";
import { useAppDispatch } from "@/state/store";
import { setUsers } from "@/state/usersSlice";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Home() {
  const {data: session, isPending: sessionPending} = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/login");
    }
  }, [sessionPending, session, router]);

  useEffect(() => {
    if (!session) return;

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
      }
    }

    fetchInitialData();
  }, [session, dispatch]);

  const handleSignOut = async () => {
    const {error} = await authClient.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.push("/login");
  }

  if (sessionPending) return <Loading />;  

  return (
    <div>
      <h1 className="my-10">This is home page {session?.user.name}</h1>
      <Button onClick={handleSignOut}>Sign out</Button>
    </div>
  );
}
