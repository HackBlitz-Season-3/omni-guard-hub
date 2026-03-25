import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniGuard Command",
  description: "AI Disaster Response & Triage Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#050505] text-[#00ffd0]">
        {children}
      </body>
    </html>
  );
}