import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import NotificationProvider from "@/components/notifications/NotificationProvider";
import ThemeSurface from "@/components/theme/ThemeSurface";
import { Toaster } from "@/components/ui/sonner";

import { buildSiteJsonLd, serializeJsonLd, SITE_URL } from "@/lib/seo";

import WebVitalsReporter from '@/components/analytics/WebVitalsReporter';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const siteDescription = 'เรียนเขียนโปรแกรมออนไลน์ภาษาไทยกับ MilerDev เข้าใจแนวคิด ลงมือสร้างโปรเจกต์จริง ดูเนื้อหา ราคา และบททดลองฟรีก่อนสมัคร เรียนต่อได้ทุกเวลา';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย | MilerDev",
    template: "%s | MilerDev",
  },
  description: siteDescription,
  keywords: ['เรียนเขียนโปรแกรม', 'คอร์สเขียนโปรแกรมออนไลน์', 'เรียน coding', 'web development', 'MilerDev'],
  authors: [{ name: 'MilerDev' }],
  creator: 'MilerDev',
  publisher: 'MilerDev',
  category: 'education',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: '/',
    siteName: 'MilerDev',
    title: 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย | MilerDev',
    description: siteDescription,
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'MilerDev คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย | MilerDev',
    description: siteDescription,
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
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
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${prompt.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <WebVitalsReporter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildSiteJsonLd()),
          }}
        />
        <SessionProvider>
          <NotificationProvider>
            <ThemeSurface theme="light" surface="public">
              {children}
            </ThemeSurface>
            <Toaster position="top-center" richColors closeButton />
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
