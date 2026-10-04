"use client";

import ConversationItem from "@/components/ConversationItem";
import Loading from "@/components/Loading";
import { authClient } from "@/lib/auth-client";
import { getConversationInfo } from "@/lib/utils";
import { useAppSelector } from "@/state/store";
import { LogOut, MessageCircle, Search, UserPlus, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const filters = ["All", "Unread", "Direct", "Groups"] as const;

export default function Home() {
  const {data: session, isPending: sessionPending} = authClient.useSession();
  const router = useRouter();
  const conversations = useAppSelector((state) => state.conversations.conversations);
  const usersById = useAppSelector((state) => state.users.byId);
  const loaded = useAppSelector((state) => state.conversations.loaded);
  const friendships = useAppSelector((state) => state.friendships.friendships);
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/login");
    }
  }, [sessionPending, session, router]);

  const handleSignOut = async () => {
    const {error} = await authClient.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    // full reload so the socket and the store of this user are dropped
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  const closeSearch = () => {
    setSearching(false);
    setSearch("");
  }

  const getLastId = (conversation: typeof conversations[number]) => {
    const activity = conversation.lastActivity;
    if (!activity) return 0;
    return activity.type === "message" ? activity.id : activity.messageId;
  }

  const visibleConversations = conversations
    .filter((conversation) => {
      if (filter === "Unread") return conversation.unreadCount > 0;
      if (filter === "Direct") return conversation.type === "Direct";
      if (filter === "Groups") return conversation.type === "Group";
      return true;
    })
    .filter((conversation) => {
      const { name } = getConversationInfo(conversation, session?.user.id, usersById);
      return name.toLowerCase().includes(search.trim().toLowerCase());
    })
    .sort((a, b) => getLastId(b) - getLastId(a) || b.id - a.id);

  const unreadCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const receivedRequests = friendships.filter((friendship) => friendship.status === "Pending" && friendship.friendId === session?.user.id).length;

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto flex flex-col">
      <header className="bg-linear-to-br from-brand-dark to-brand rounded-b-3xl px-5 pt-6 pb-5 text-white shadow-lg">
        {searching ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                autoFocus
                className="w-full h-11 pl-12 pr-4 rounded-full bg-white text-gray-800 placeholder:text-gray-400 outline-none"
              />
            </div>
            <button onClick={closeSearch} aria-label="Close search" className="flex size-10 items-center justify-center rounded-full hover:bg-white/15">
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Image src="/logo-light.svg" alt="E-Chat" width={120} height={40} preload={true} />
            <div className="flex items-center gap-1">
              <button onClick={() => setSearching(true)} aria-label="Search chats" className="flex size-10 items-center justify-center rounded-full hover:bg-white/15">
                <Search className="size-5" />
              </button>
              <Link href="/friendships" aria-label="Friends" className="relative flex size-10 items-center justify-center rounded-full hover:bg-white/15">
                <Users className="size-5" />
                {receivedRequests > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-brand-accent text-white text-[11px] md:text-[11px] xl:text-[11px] leading-none flex items-center justify-center">
                    {receivedRequests}
                  </span>
                )}
              </Link>
              <Link href="/add-friend" aria-label="Add friend" className="flex size-10 items-center justify-center rounded-full hover:bg-white/15">
                <UserPlus className="size-5" />
              </Link>
              <button onClick={handleSignOut} aria-label="Sign out" className="flex size-10 items-center justify-center rounded-full hover:bg-white/15">
                <LogOut className="size-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto px-5 py-4 scrollbar-none">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === item ? "bg-brand text-white shadow-md shadow-brand/30" : "bg-brand-light text-brand hover:bg-brand-accent/30"
            }`}
          >
            {item}
            {item === "Unread" && unreadCount > 0 && (
              <span className={`min-w-5 rounded-full px-1.5 text-xs md:text-xs xl:text-xs ${filter === item ? "bg-white text-brand" : "bg-brand-accent text-white"}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {!loaded ? (
          <div className="px-5 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="flex items-center gap-3 animate-pulse">
                <div className="size-14 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-100" />
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="flex flex-col items-center text-center px-8 mt-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-light">
              <MessageCircle className="size-8 text-brand" />
            </div>
            {conversations.length === 0 ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-1">No chats yet</h3>
                <p className="text-gray-500 text-sm mb-6">Add a friend to start your first conversation</p>
                <Link href="/add-friend" className="rounded-full bg-brand-accent px-6 py-2.5 text-white font-medium hover:bg-brand">
                  Add friend
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No chats match your search or filter</p>
            )}
          </div>
        ) : (
          visibleConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              myId={session?.user.id}
              onClick={() => router.push(`/conversations/${conversation.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
