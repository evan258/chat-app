import type { User } from "@/state/usersSlice";
import UserAvatar from "./UserAvatar";

// like messenger: the avatars of everyone who is typing and an animated bubble
const TypingIndicator = ({users}: {users: User[]}) => {
  return (
    <div className="flex items-end gap-2 px-3 pt-0.5 pb-2.5">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <UserAvatar key={user.id} name={user.name} src={user.avatarUrl} className="size-7 text-xs ring-2 ring-[#F3F7FC]" />
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm">
        <div className="size-2 animate-bounce rounded-full bg-gray-400" />
        <div className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
        <div className="size-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export default TypingIndicator
