"use client";

import { Check, CheckCheck, Clock, TriangleAlert } from "lucide-react";
import type { ReactionType } from "@/generated/prisma";
import { reactionEmojis } from "@/lib/utils";
import { Message } from "@/state/messagesSlice";
import UserAvatar from "./UserAvatar";

interface MessageBubbleProps {
  message: Message,
  isMine: boolean,
  myId: string,
  isGroup: boolean,
  isLastInRun: boolean,
  senderName?: string,
  senderAvatar?: string,
  seen: boolean,
  isRemoving: boolean,
  isSelected: boolean,
  onSelect: () => void,
  onReact: (reaction: ReactionType) => void,
  onUnsend: () => void,
  onRemove: () => void,
  onRetry: () => void,
}

const formatTime = (createdAt: string) => {
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MessageBubble = ({
  message, isMine, myId, isGroup, isLastInRun, senderName, senderAvatar, seen, isRemoving, isSelected,
  onSelect, onReact, onUnsend, onRemove, onRetry,
}: MessageBubbleProps) => {
  const reactionCounts: Partial<Record<ReactionType, number>> = {};
  for (const item of message.reactions) {
    reactionCounts[item.reaction] = (reactionCounts[item.reaction] ?? 0) + 1;
  }
  const myReaction = message.reactions.find((item) => item.userId === myId)?.reaction;

  const actionClass = "rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100";

  return (
    <div className={`flex gap-2 px-3 pt-0.5 ${isLastInRun ? "pb-2.5" : "pb-0.5"} ${isMine ? "justify-end" : "justify-start"} ${isRemoving ? "opacity-50" : ""}`}>
      {!isMine && isGroup && (
        <div className="w-8 shrink-0 self-end">
          <UserAvatar name={senderName ?? "?"} src={senderAvatar} className="size-8 text-sm" />
        </div>
      )}

      <div className={`flex max-w-[78%] flex-col ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && isGroup && (
          <span className="mb-0.5 ml-1 text-xs text-gray-500">{senderName ?? "Member"}</span>
        )}

        <button
          onClick={onSelect}
          className={`rounded-2xl px-3.5 py-2 text-left ${
            isMine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white text-gray-900 shadow-sm"
          } ${message.unsent ? "italic opacity-70" : ""}`}
        >
          {message.unsent ? (
            <div className="text-sm">This message was unsent</div>
          ) : (
            <>
              {message.previewUrls.length > 0 && (
                <div className="mb-1.5 flex flex-col gap-1">
                  {message.previewUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="attachment" className="max-h-60 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {message.text && (
                <div className="whitespace-pre-wrap break-words text-[15px] leading-snug">{message.text}</div>
              )}
            </>
          )}

          <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${isMine ? "text-white/70" : "text-gray-400"}`}>
            {message.createdAt ? formatTime(message.createdAt) : "Sending"}
            {isMine && message.status === "sending" && <Clock className="size-3" />}
            {isMine && message.status === "sent" && (seen ? <CheckCheck className="size-3.5 text-brand-accent" /> : <Check className="size-3.5" />)}
            {isMine && message.status === "failed" && <TriangleAlert className="size-3.5 text-red-300" />}
          </div>
        </button>

        {Object.keys(reactionCounts).length > 0 && (
          <div className="-mt-1.5 flex gap-1 px-1">
            {(Object.keys(reactionCounts) as ReactionType[]).map((reaction) => (
              <span
                key={reaction}
                className={`rounded-full border bg-white px-1.5 text-xs shadow-sm ${myReaction === reaction ? "border-brand-accent" : "border-gray-100"}`}
              >
                {reactionEmojis[reaction]}{(reactionCounts[reaction] ?? 0) > 1 && ` ${reactionCounts[reaction]}`}
              </span>
            ))}
          </div>
        )}

        {message.status === "failed" && (
          <div className="mt-1 flex gap-2">
            <button onClick={onRetry} className={`${actionClass} text-red-500`}>Retry</button>
            <button onClick={onRemove} className={actionClass}>Delete</button>
          </div>
        )}

        {isSelected && message.status === "sent" && !isRemoving && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {!message.unsent && (Object.keys(reactionEmojis) as ReactionType[]).map((reaction) => (
              <button
                key={reaction}
                onClick={() => onReact(reaction)}
                className={`rounded-full bg-white px-1.5 py-0.5 text-base shadow-sm hover:scale-110 ${myReaction === reaction ? "ring-2 ring-brand-accent" : ""}`}
              >
                {reactionEmojis[reaction]}
              </button>
            ))}
            {isMine && !message.unsent && <button onClick={onUnsend} className={actionClass}>Unsend</button>}
            <button onClick={onRemove} className={actionClass}>Remove for me</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
