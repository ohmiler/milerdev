import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  cacheMaxMemorySize: 0,
  turbopack: {
    root: process.cwd(),
  },
  // The blog was retired; send old article links and bookmarks to the home page.
  async redirects() {
    return [
      { source: '/blog', destination: '/', permanent: true },
      { source: '/blog/:path*', destination: '/', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.bunny.net',
      },
      {
        protocol: 'https',
        hostname: '**.slipok.com',
      },
    ],
  },
};

export default nextConfig;
