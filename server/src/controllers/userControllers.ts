import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getPreviewUrls } from "../lib/utils.js";

export async function searchUsers(req: Request, res: Response) {
  try {
    const userId = req.userId!;
    const name = String(req.query.name ?? "").trim();

    if (name.length < 2) {
      return res.status(400).json({message: "Search name must be at least 2 characters"});
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
        },
        emailVerified: true,
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 20,
    });

    const result = await Promise.all(
      users.map(async (user) => {
        let avatarUrl: string | undefined;
        let avatarExpiresAt: string | undefined;

        if (user.avatar) {
          const {urls, expiresAt} = await getPreviewUrls([user.avatar]);
          avatarUrl = urls[0];
          avatarExpiresAt = expiresAt;
        }

        return {
          id: user.id,
          name: user.name,
          avatarUrl,
          expiresAt: avatarExpiresAt,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({message: "Failed to search users"});
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({message: "User not found"});
    }

    let avatarUrl: string | undefined;
    let avatarExpiresAt: string | undefined;

    if (user.avatar) {
      const {urls, expiresAt} = await getPreviewUrls([user.avatar]);
      avatarUrl = urls[0];
      avatarExpiresAt = expiresAt;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl,
      expiresAt: avatarExpiresAt,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({message: "Failed to retrieve user"});
  }
}
