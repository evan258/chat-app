import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "E-Chat profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const name = user?.name ?? "E-Chat";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 55%, #40C4FF 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            background: "#40C4FF",
            border: "10px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 110,
            fontWeight: 700,
          }}
        >
          {name.trim()[0]?.toUpperCase() ?? "E"}
        </div>
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700 }}>{name}</div>
        <div style={{ marginTop: 16, fontSize: 36, opacity: 0.85 }}>Add me on E-Chat</div>
      </div>
    ),
    { ...size }
  );
}
