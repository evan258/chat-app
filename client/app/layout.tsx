import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { CircleCheck, CircleX } from "lucide-react";
import Providers from "./Providers";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "E-Chat",
  description: "Chat with your friends",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
        <Toaster
          closeButton
          icons={{
            success: <CircleCheck className="text-green-500" />,
            error: <CircleX className="text-red-500" />,
          }}
        />
      </body>
    </html>
  );
}
