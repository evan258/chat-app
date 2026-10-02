"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAppDispatch } from "@/state/store";
import { addFriendship, updateFriendship } from "@/state/friendshipsSlice";
import { addConversation } from "@/state/conversationsSlice";
import { addUser } from "@/state/usersSlice";
import { Button } from "./ui/button";

export type FriendshipStatus = "None" | "Friends" | "Sent" | "Received";

const FriendshipButton = ({userId, status, onStatusChange, className = ""}: {
  userId: string,
  status: FriendshipStatus,
  onStatusChange: (status: FriendshipStatus) => void,
  className?: string,
}) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

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
      onStatusChange("Sent");
    } catch (err) {
      console.log(err);
      toast.error("Failed to send friend request");
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/friendships/${userId}/accept`, {
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
      onStatusChange("Friends");
    } catch (err) {
      console.log(err);
      toast.error("Failed to accept friend request");
    } finally {
      setLoading(false);
    }
  }

  if (status === "Friends") {
    return (
      <Button disabled className={`rounded-full bg-brand-light text-brand opacity-100! ${className}`}>
        <Check /> Friends
      </Button>
    )
  }

  if (status === "Sent") {
    return (
      <Button disabled className={`rounded-full bg-gray-100 text-gray-500 opacity-100! ${className}`}>
        Requested
      </Button>
    )
  }

  return (
    <Button
      onClick={status === "Received" ? handleAccept : handleAdd}
      disabled={loading}
      className={`rounded-full bg-brand-accent text-white hover:bg-brand ${className}`}
    >
      {loading ? "Please wait..." : status === "Received" ? "Accept" : "Add friend"}
    </Button>
  )
}

export default FriendshipButton
