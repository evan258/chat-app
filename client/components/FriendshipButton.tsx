"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { Friendship } from "@/generated/prisma";
import { authClient } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/state/store";
import { addFriendship } from "@/state/friendshipsSlice";
import { addUser } from "@/state/usersSlice";
import { Button } from "./ui/button";

// the label comes from the friendship status (Pending / Accepted), accepting happens on the friendships page
const FriendshipButton = ({userId, initialFriendship, className = ""}: {
  userId: string,
  initialFriendship?: Pick<Friendship, "userId" | "friendId" | "status"> | null,
  className?: string,
}) => {
  const { data: session } = authClient.useSession();
  const friendships = useAppSelector((state) => state.friendships.friendships);
  const loaded = useAppSelector((state) => state.conversations.loaded);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const myId = session?.user.id;
  const storeFriendship = friendships.find((friendship) =>
    (friendship.userId === myId && friendship.friendId === userId) ||
    (friendship.userId === userId && friendship.friendId === myId)
  );

  // the profile already fetched its friendship, once the store is loaded it takes over so socket events show up live
  const friendship = loaded ? storeFriendship : initialFriendship;

  const handleAdd = async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/friendships/${userId}`, {
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
      dispatch(addFriendship(result.friendship));
      dispatch(addUser(result.friendship.user));
    } catch (err) {
      console.log(err);
      toast.error("Failed to send friend request");
    } finally {
      setLoading(false);
    }
  }

  // nothing to show yet, otherwise an existing friend would flash as "Add friend"
  if (!loaded && initialFriendship === undefined) {
    return (
      <Button disabled className={`rounded-full bg-gray-100 text-gray-400 opacity-100! ${className}`}>
        ...
      </Button>
    )
  }

  if (friendship?.status === "Accepted") {
    return (
      <Button disabled className={`rounded-full bg-brand-light text-brand opacity-100! ${className}`}>
        <Check /> Friends
      </Button>
    )
  }

  if (friendship?.status === "Pending" && friendship.userId === myId) {
    return (
      <Button disabled className={`rounded-full bg-gray-100 text-gray-500 opacity-100! ${className}`}>
        Requested
      </Button>
    )
  }

  if (friendship?.status === "Pending") {
    return (
      <Link
        href="/friendships"
        className={`inline-flex items-center justify-center rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-dark ${className}`}
      >
        Respond
      </Link>
    )
  }

  return (
    <Button
      onClick={handleAdd}
      disabled={loading}
      className={`rounded-full bg-brand-accent text-white hover:bg-brand ${className}`}
    >
      {loading ? "Please wait..." : "Add friend"}
    </Button>
  )
}

export default FriendshipButton
