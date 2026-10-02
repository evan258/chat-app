"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Loading from "@/components/Loading";
import PageHeader from "@/components/PageHeader";
import UserAvatar from "@/components/UserAvatar";
import FriendshipButton from "@/components/FriendshipButton";

interface ProfileUser {
  id: string,
  name: string,
  email: string,
  avatarUrl?: string,
}

const UserPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const router = useRouter();
  const [fetchedUser, setFetchedUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isSelf = session?.user.id === userId;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [sessionPending, session, router]);

  // your own profile comes from the session, only other people are fetched
  useEffect(() => {
    if (!session || isSelf) return;

    const fetchUser = async () => {
      try {
        const { data, error } = await authClient.token();
        if (error || !data?.token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${data.token}`,
          },
        });

        if (response.status === 404) return;
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        setFetchedUser(await response.json());
      } catch (err) {
        console.log(err);
        toast.error("Failed to load this profile");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [session, isSelf, userId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied");
    } catch (err) {
      console.log(err);
      toast.error("Failed to copy the link");
    }
  }

  if (sessionPending || (!isSelf && loading)) return <Loading />;

  const user: ProfileUser | null = isSelf && session
    ? { id: session.user.id, name: session.user.name, email: session.user.email, avatarUrl: session.user.image ?? undefined }
    : fetchedUser;

  if (!user) {
    return (
      <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
        <PageHeader title="Profile" />
        <p className="text-center text-gray-400 mt-16">This user could not be found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white max-w-2xl w-full mx-auto">
      <PageHeader title="Profile" />

      <div className="flex flex-col items-center px-5 pt-8">
        <div className="rounded-full ring-4 ring-brand-light shadow-lg">
          <UserAvatar name={user.name} src={user.avatarUrl} className="size-32 text-5xl" />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-gray-900 text-center break-all">{user.name}</h2>

        <div className="mt-2 flex items-center gap-2 text-gray-500">
          <Mail className="size-4" />
          <span className="break-all">{user.email}</span>
        </div>

        <div className="mt-8 flex items-center gap-3">
          {isSelf ? (
            <span className="px-4 py-2 rounded-full bg-brand-light text-brand font-medium">This is you</span>
          ) : (
            <FriendshipButton userId={user.id} className="h-11 px-8 text-base" />
          )}
          <button
            onClick={handleCopyLink}
            aria-label="Copy profile link"
            className="flex size-11 items-center justify-center rounded-full bg-brand-light text-brand hover:bg-brand-accent/30"
          >
            <Link2 className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserPage
