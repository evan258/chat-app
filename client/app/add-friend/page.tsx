"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import FriendshipButton from "@/components/FriendshipButton";

interface SearchedUser {
  id: string,
  name: string,
  avatarUrl?: string,
  expiresAt?: string,
}

const AddFriendPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  useEffect(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    // ignore the response of an older search if the name changed in the meantime
    let ignore = false;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users?name=${encodeURIComponent(trimmedName)}`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to search users");
        }

        const result = await response.json();
        if (ignore) return;
        setUsers(result);
        setSearched(true);
      } catch (err) {
        console.log(err);
        toast.error("Failed to search users");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 400);

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [name]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim().length < 2) {
      setUsers([]);
      setSearched(false);
    }
  }

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
      <PageHeader title="Add friend">
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Search people by name"
            autoFocus
            className="w-full h-12 pl-12 pr-4 rounded-full bg-white text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>
      </PageHeader>

      <div className="px-5 py-4">
        {name.trim().length < 2 && (
          <p className="text-center text-gray-400 text-sm mt-10">Type at least 2 letters of a name to find people</p>
        )}

        {loading && (
          <p className="text-center text-gray-400 text-sm mt-10">Searching...</p>
        )}

        {!loading && searched && users.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-10">No one found with that name</p>
        )}

        {!loading && users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 py-3">
            <UserAvatar name={user.name} src={user.avatarUrl} />
            <span className="flex-1 min-w-0 truncate font-medium text-gray-900">{user.name}</span>
            <FriendshipButton userId={user.id} className="h-9 px-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default AddFriendPage
