import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';
const siteDescription = 'แพลตฟอร์มเรียนออนไลน์ที่จะช่วยให้คุณพัฒนาทักษะการเขียนโปรแกรม และก้าวสู่การเป็นนักพัฒนามืออาชีพ';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MilerDev - เรียน Coding ออนไลน์",
    template: "%s | MilerDev",
  },
  description: siteDescription,
  keywords: ['เรียน coding', 'คอร์สออนไลน์', 'web development', 'programming', 'MilerDev', 'เขียนโปรแกรม'],
  authors: [{ name: 'MilerDev' }],
  creator: 'MilerDev',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: siteUrl,
    siteName: 'MilerDev',
    title: 'MilerDev - เรียน Coding ออนไลน์',
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MilerDev - เรียน Coding ออนไลน์',
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansThai.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
