"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { uploadFiles } from "@/lib/upload";
import { addConversation } from "@/state/conversationsSlice";
import { useAppDispatch, useAppSelector } from "@/state/store";
import FriendPicker from "@/components/FriendPicker";
import GroupPhotoPicker from "@/components/GroupPhotoPicker";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const NewGroupPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const friendships = useAppSelector((state) => state.friendships.friendships);
  const usersById = useAppSelector((state) => state.users.byId);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  // the picked photo is shown from an object url, it is released when another photo is picked or the page closes
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const friends = friendships
    .filter((friendship) => friendship.status === "Accepted")
    .map((friendship) => usersById[friendship.user.id] ?? friendship.user);

  const toggleMember = (userId: string) => {
    setMemberIds(memberIds.includes(userId) ? memberIds.filter((id) => id !== userId) : [...memberIds, userId]);
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) return;

      let fileId: number | undefined;
      if (photo) {
        const fileIds = await uploadFiles([photo], () => {});
        fileId = fileIds[0];
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: {
            type: "Group",
            members: memberIds,
            name: name.trim() || undefined,
            fileId,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message);
      }

      const conversation = await response.json();
      dispatch(addConversation(conversation));
      router.replace(`/conversations/${conversation.id}`);
    } catch (err) {
      console.log(err);
      toast.error("Failed to create the group");
      setCreating(false);
    }
  }

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto flex flex-col">
      <PageHeader title="New group" />

      <div className="flex flex-col items-center px-5 pt-6">
        <GroupPhotoPicker
          name={name || "Group"}
          src={photoUrl}
          disabled={creating}
          onPick={(file) => {
            if (!file.type.startsWith("image/")) {
              toast.error("Please pick an image");
              return;
            }
            setPhoto(file);
            setPhotoUrl(URL.createObjectURL(file));
          }}
        />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (optional)"
          maxLength={50}
          className="mt-5 w-full h-12 px-5 rounded-full bg-gray-100 text-gray-800 placeholder:text-gray-400 outline-none"
        />
      </div>

      <div className="flex-1 px-5 pt-6 pb-28">
        <p className="mb-1 text-sm font-medium text-gray-500">
          Pick at least 2 friends {memberIds.length > 0 && `· ${memberIds.length} selected`}
        </p>

        {friends.length < 2 ? (
          <div className="text-center mt-10">
            <p className="text-gray-400 text-sm mb-4">You need at least 2 friends to start a group</p>
            <Link href="/add-friend" className="rounded-full bg-brand-accent px-6 py-2.5 text-white font-medium hover:bg-brand">
              Add friend
            </Link>
          </div>
        ) : (
          <FriendPicker friends={friends} selectedIds={memberIds} onToggle={toggleMember} />
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <Button
          onClick={handleCreate}
          disabled={memberIds.length < 2 || creating}
          className="w-full h-12 rounded-full bg-brand-accent text-white text-base hover:bg-brand"
        >
          {creating ? "Creating..." : "Create group"}
        </Button>
      </div>
    </div>
  )
}

export default NewGroupPage
