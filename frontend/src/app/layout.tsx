import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UrbanFlow Nexus - Command Center",
  description: "AI-Powered Prescriptive Traffic Intervention Engine for Smart Cities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <body suppressHydrationWarning className="h-full flex overflow-hidden bg-[#F1F3F6]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-4 scroll-smooth">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
