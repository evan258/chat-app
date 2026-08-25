"use client";

import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function Home() {
  const {data: session, isPending: sessionPending} = authClient.useSession();
  const router = useRouter();

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

    router.push("/login");
  }

  if (sessionPending) return <Loading />;  

  return (
    <div>
      <h1 className="my-10">This is home page {session?.user.name}</h1>
      <Button onClick={handleSignOut}>Sign out</Button>
    </div>
  );
}
