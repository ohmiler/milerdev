import type { Metadata } from "next";
import { Inter, Prompt } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import NotificationProvider from "@/components/notifications/NotificationProvider";
import ThemeSurface from "@/components/theme/ThemeSurface";

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
    images: [{
      url: `${siteUrl}/og-image.png`,
      width: 1200,
      height: 630,
      alt: 'MilerDev - เรียน Coding ออนไลน์',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MilerDev - เรียน Coding ออนไลน์',
    description: siteDescription,
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: {
    canonical: siteUrl,
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
      className={`${inter.variable} ${prompt.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'MilerDev',
              url: siteUrl,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${siteUrl}/courses?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <SessionProvider>
          <NotificationProvider>
            <ThemeSurface theme="light" surface="public">
              {children}
            </ThemeSurface>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
