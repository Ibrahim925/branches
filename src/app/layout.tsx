import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Branches - Your Family Tree, Reimagined",
  description:
    "A private, beautiful space where your family grows together. Real-time collaboration, live chat, and stunning tree visualization.",
  openGraph: {
    title: "Branches - Your Family Tree, Reimagined",
    description:
      "A private, beautiful space where your family grows together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
