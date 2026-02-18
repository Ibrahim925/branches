import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientRuntime } from '@/components/system/ClientRuntime';

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Branches - Your Family Tree, Reimagined",
  description:
    "A private, beautiful space where your family grows together. Real-time collaboration, live chat, and stunning tree visualization.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Branches - Your Family Tree, Reimagined",
    description:
      "A private, beautiful space where your family grows together.",
    type: "website",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://branches-azure.vercel.app'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-full`}>
        <ClientRuntime />
        {children}
      </body>
    </html>
  );
}
