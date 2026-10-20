"use client";

import { Conversation } from "@/state/conversationsSlice";
import { useAppSelector } from "@/state/store";
import { getConversationInfo, reactionEmojis } from "@/lib/utils";
import UserAvatar from "./UserAvatar";

const ConversationItem = ({conversation, myId, onClick}: {
  conversation: Conversation,
  myId: string | undefined,
  onClick: () => void,
}) => {
  const usersById = useAppSelector((state) => state.users.byId);
  const activeUsers = useAppSelector((state) => state.users.activeUsers);

  const { name, avatarUrl, otherUserId } = getConversationInfo(conversation, myId, usersById);
  const isActive = otherUserId ? activeUsers[otherUserId] : false;
  const hasUnread = conversation.unreadCount > 0;
  const activity = conversation.lastActivity;

  let preview = "No messages yet";
  if (activity) {
    // the user who made the activity: the sender of the message or the one who reacted
    const activityUserId = activity.type === "message" ? activity.senderId : activity.userId;
    const activityUserName = activityUserId === myId ? "You" : usersById[activityUserId]?.name ?? "Someone";

    if (activity.type === "message") {
      if (activity.unsent) preview = "Message unsent";
      else if (activity.text) preview = activity.text;
      else if (activity.filesLen === 1) preview = "📎 Attachment";
      else if (activity.filesLen > 1) preview = `📎 ${activity.filesLen} attachments`;

      // in a direct chat the other user is already the title
      if (activityUserId === myId || conversation.type === "Group") preview = `${activityUserName}: ${preview}`;
    } else {
      preview = `${activityUserName} reacted ${reactionEmojis[activity.reaction]} to a message`;
    }
  }

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-brand-light/60 transition-colors">
      <div className="relative">
        <UserAvatar name={name} src={avatarUrl} className="size-14 text-xl" />
        {isActive && (
          <div className="absolute bottom-0 right-0 size-3.5 rounded-full bg-green-500 border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`truncate text-base md:text-base xl:text-base ${hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
          {name}
        </p>
        <span className={`block truncate text-sm md:text-sm xl:text-sm ${hasUnread ? "font-medium text-gray-700" : "text-gray-400"}`}>
          {preview}
        </span>
      </div>

      {hasUnread && (
        <span className="min-w-6 h-6 px-2 rounded-full bg-brand-accent text-white text-xs md:text-xs xl:text-xs font-medium flex items-center justify-center">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  )
}

export default ConversationItem
