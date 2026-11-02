"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, UserPlus, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { uploadFiles } from "@/lib/upload";
import { getConversationInfo } from "@/lib/utils";
import { addMembersToConversation, removeConversation, removeMemberFromConversation, updateConversation } from "@/state/conversationsSlice";
import { useAppDispatch, useAppSelector } from "@/state/store";
import FriendPicker from "@/components/FriendPicker";
import GroupPhotoPicker from "@/components/GroupPhotoPicker";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

const GroupInfoPage = () => {
  const { conversationId: conversationIdParam } = useParams<{ conversationId: string }>();
  const conversationId = Number(conversationIdParam);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const conversationsLoaded = useAppSelector((state) => state.conversations.loaded);
  const conversation = useAppSelector((state) => state.conversations.conversations.find((item) => item.id === conversationId));
  const friendships = useAppSelector((state) => state.friendships.friendships);
  const usersById = useAppSelector((state) => state.users.byId);
  const [name, setName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const myId = session?.user.id;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  if (sessionPending || !conversationsLoaded) return <Loading />;

  if (!conversation || conversation.type !== "Group") {
    return (
      <div className="min-h-screen bg-white max-w-2xl w-full mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">This group could not be found</p>
        <Link href="/" className="rounded-full bg-brand px-6 py-2.5 text-white font-medium hover:bg-brand-dark">Back to chats</Link>
      </div>
    )
  }

  const info = getConversationInfo(conversation, myId, usersById);

  // null until the name is edited, so a name changed by someone else shows up
  const nameInput = name ?? conversation.name ?? "";

  // friends who are not in the group yet
  const friendsToAdd = friendships
    .filter((friendship) => friendship.status === "Accepted" && !conversation.members.includes(friendship.user.id))
    .map((friendship) => usersById[friendship.user.id] ?? friendship.user);

  const sendRequest = async (path: string, method: string, body?: object) => {
    const { data, error } = await authClient.token();
    if (error || !data?.token) throw new Error("Failed to get the token");

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/conversations/${conversationId}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message);
    }

    return response.json();
  }

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const result = await sendRequest("", "PUT", { name: nameInput.trim() });
      dispatch(updateConversation(result));
      setName(null);
    } catch (err) {
      console.log(err);
      toast.error("Failed to change the group name");
    } finally {
      setSavingName(false);
    }
  }

  const handlePhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileIds = await uploadFiles([file], () => {});
      const result = await sendRequest("", "PUT", { fileId: fileIds[0] });
      dispatch(updateConversation(result));
    } catch (err) {
      console.log(err);
      toast.error("Failed to change the group photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const handleAddMembers = async () => {
    setAdding(true);
    try {
      const result = await sendRequest("/members", "POST", { members: newMemberIds });
      dispatch(addMembersToConversation({ conversationId, memberIds: result.memberIds }));
      setNewMemberIds([]);
    } catch (err) {
      console.log(err);
      toast.error("Failed to add members");
    } finally {
      setAdding(false);
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    setLoadingMemberId(memberId);
    try {
      const result = await sendRequest(`/members/${memberId}`, "DELETE");
      dispatch(removeMemberFromConversation({ conversationId, memberId: result.memberId }));
    } catch (err) {
      console.log(err);
      toast.error("Failed to remove the member");
    } finally {
      setLoadingMemberId(null);
    }
  }

  const handleLeave = async () => {
    if (!myId) return;

    setLoadingMemberId(myId);
    try {
      await sendRequest(`/members/${myId}`, "DELETE");
      router.replace("/");
      dispatch(removeConversation({ conversationId }));
    } catch (err) {
      console.log(err);
      toast.error("Failed to leave the group");
      setLoadingMemberId(null);
    }
  }

  const toggleNewMember = (userId: string) => {
    setNewMemberIds(newMemberIds.includes(userId) ? newMemberIds.filter((id) => id !== userId) : [...newMemberIds, userId]);
  }

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
      <PageHeader title="Group info" backHref={`/conversations/${conversationId}`} />

      <div className="flex flex-col items-center px-5 pt-6">
        <GroupPhotoPicker name={info.name} src={info.avatarUrl} disabled={uploadingPhoto} onPick={handlePhoto} />
        {uploadingPhoto && <p className="mt-2 text-sm text-gray-400">Uploading photo...</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveName();
          }}
          className="mt-5 flex w-full gap-2"
        >
          <input
            value={nameInput}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            maxLength={50}
            className="h-12 min-w-0 flex-1 px-5 rounded-full bg-gray-100 text-gray-800 placeholder:text-gray-400 outline-none"
          />
          <Button
            type="submit"
            disabled={!nameInput.trim() || nameInput.trim() === conversation.name || savingName}
            className="h-12 rounded-full bg-brand-accent px-6 text-white hover:bg-brand"
          >
            {savingName ? "Saving..." : "Save"}
          </Button>
        </form>
      </div>

      <div className="px-5 pt-8">
        <p className="mb-1 text-sm font-medium text-gray-500">{conversation.members.length} members</p>

        {conversation.members.map((memberId) => {
          const isMe = memberId === myId;
          const member = usersById[memberId];
          const memberName = isMe ? session?.user.name ?? "You" : member?.name ?? "Member";

          return (
            <div key={memberId} className="flex items-center gap-3 py-2.5">
              <UserAvatar name={memberName} src={member?.avatarUrl} />
              <span className="flex-1 min-w-0 truncate font-medium text-gray-900">
                {memberName}{isMe && <span className="text-gray-400 font-normal"> (You)</span>}
              </span>
              {!isMe && (
                <Button
                  onClick={() => handleRemoveMember(memberId)}
                  disabled={loadingMemberId === memberId}
                  aria-label={`Remove ${memberName}`}
                  className="h-9 rounded-full bg-gray-100 px-4 text-gray-600 hover:bg-red-50 hover:text-red-500"
                >
                  <X className="size-4" />
                  Remove
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-5 pt-8">
        <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
          <UserPlus className="size-4" />
          Add friends {newMemberIds.length > 0 && `· ${newMemberIds.length} selected`}
        </p>

        {friendsToAdd.length === 0 ? (
          <p className="py-3 text-sm text-gray-400">All your friends are in this group</p>
        ) : (
          <>
            <FriendPicker friends={friendsToAdd} selectedIds={newMemberIds} onToggle={toggleNewMember} />
            <Button
              onClick={handleAddMembers}
              disabled={newMemberIds.length === 0 || adding}
              className="mt-2 w-full h-11 rounded-full bg-brand-accent text-white hover:bg-brand"
            >
              {adding ? "Adding..." : "Add to group"}
            </Button>
          </>
        )}
      </div>

      <div className="px-5 pt-8 pb-10">
        <Button
          onClick={handleLeave}
          disabled={loadingMemberId === myId}
          className="w-full h-11 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
        >
          <LogOut className="size-4" />
          {loadingMemberId === myId ? "Leaving..." : "Leave group"}
        </Button>
      </div>
    </div>
  )
}

export default GroupInfoPage
