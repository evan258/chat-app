"use client";

import { Check } from "lucide-react";
import type { User } from "@/state/usersSlice";
import UserAvatar from "./UserAvatar";

// a list of friends to tick, used when creating a group and when adding members
const FriendPicker = ({friends, selectedIds, onToggle}: {
  friends: User[],
  selectedIds: string[],
  onToggle: (userId: string) => void,
}) => {
  return (
    <div>
      {friends.map((friend) => {
        const isSelected = selectedIds.includes(friend.id);

        return (
          <button
            key={friend.id}
            type="button"
            onClick={() => onToggle(friend.id)}
            className="w-full flex items-center gap-3 py-2.5 text-left"
          >
            <UserAvatar name={friend.name} src={friend.avatarUrl} />
            <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{friend.name}</span>
            <span className={`flex size-6 items-center justify-center rounded-full border-2 ${
              isSelected ? "border-brand bg-brand text-white" : "border-gray-300"
            }`}>
              {isSelected && <Check className="size-4" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default FriendPicker
