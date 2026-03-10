import type { Metadata } from "next";
import { Toaster } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eucal AI 管理后台",
  description: "Eucal AI 管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
