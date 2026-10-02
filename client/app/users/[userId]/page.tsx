import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserProfile from "@/components/UserProfile";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) {
    return { title: "User not found" };
  }

  const title = `${user.name} on E-Chat`;
  const description = `Add ${user.name} as a friend and start chatting on E-Chat.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "E-Chat",
      url: `/users/${userId}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) notFound();

  return <UserProfile userId={userId} />;
}
