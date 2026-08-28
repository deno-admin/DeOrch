import AppLayout from "../components/AppLayout";
import type { Metadata } from "next";
import { DrafterProvider } from "../context/DrafterContext";
import "./globals.css";

const geistSans = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: "DeOrch Platform",
  description: "Unified LeadOS and CareerOS platform",
  robots: { index: false, follow: false },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DrafterProvider>
          <AppLayout>{children}</AppLayout>
        </DrafterProvider>
      </body>
    </html>
  );
}
