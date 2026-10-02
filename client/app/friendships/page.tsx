"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/state/store";
import { removeFriendship, updateFriendship } from "@/state/friendshipsSlice";
import { addConversation } from "@/state/conversationsSlice";
import { addUser } from "@/state/usersSlice";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

const tabs = ["Sent", "Received", "Friends"] as const;

const emptyMessages = {
  Sent: "You haven't sent any friend requests",
  Received: "No friend requests waiting for you",
  Friends: "You haven't added any friends yet",
};

const FriendshipsPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const friendships = useAppSelector((state) => state.friendships.friendships);
  const [tab, setTab] = useState<typeof tabs[number]>("Received");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  const myId = session?.user.id;

  const lists = {
    Sent: friendships.filter((friendship) => friendship.status === "Pending" && friendship.userId === myId),
    Received: friendships.filter((friendship) => friendship.status === "Pending" && friendship.friendId === myId),
    Friends: friendships.filter((friendship) => friendship.status === "Accepted"),
  };

  const handleAccept = async (otherUserId: string) => {
    setLoadingUserId(otherUserId);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/friendships/${otherUserId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message);
      }

      const result = await response.json();
      dispatch(updateFriendship({
        userId: result.userId,
        friendId: result.friendId,
        status: "Accepted",
      }));
      dispatch(addConversation(result.conversation));
      dispatch(addUser(result.user));
    } catch (err) {
      console.log(err);
      toast.error("Failed to accept friend request");
    } finally {
      setLoadingUserId(null);
    }
  }

  const handleReject = async (otherUserId: string) => {
    setLoadingUserId(otherUserId);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/friendships/${otherUserId}/reject`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message);
      }

      const result = await response.json();
      dispatch(removeFriendship({
        userId: result.userId,
        friendId: result.friendId,
      }));
    } catch (err) {
      console.log(err);
      toast.error("Failed to reject friend request");
    } finally {
      setLoadingUserId(null);
    }
  }

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
      <PageHeader title="Friends" />

      <div className="flex gap-2 overflow-x-auto px-5 py-4 scrollbar-none">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === item ? "bg-brand text-white shadow-md shadow-brand/30" : "bg-brand-light text-brand hover:bg-brand-accent/30"
            }`}
          >
            {item}
            {lists[item].length > 0 && (
              <span className={`min-w-5 rounded-full px-1.5 text-xs md:text-xs xl:text-xs ${tab === item ? "bg-white text-brand" : "bg-brand-accent text-white"}`}>
                {lists[item].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-5">
        {lists[tab].length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">{emptyMessages[tab]}</p>
        )}

        {lists[tab].map((friendship) => (
          <div key={friendship.id} className="flex items-center gap-3 py-3">
            <Link href={`/users/${friendship.user.id}`} className="flex flex-1 min-w-0 items-center gap-3">
              <UserAvatar name={friendship.user.name} src={friendship.user.avatarUrl} />
              <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{friendship.user.name}</span>
            </Link>

            {tab === "Received" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(friendship.user.id)}
                  disabled={loadingUserId === friendship.user.id}
                  className="h-9 px-4 rounded-full bg-brand-accent text-white hover:bg-brand"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleReject(friendship.user.id)}
                  disabled={loadingUserId === friendship.user.id}
                  className="h-9 px-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Reject
                </Button>
              </div>
            )}

            {tab === "Sent" && (
              <span className="text-sm text-gray-400">Pending</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FriendshipsPage
