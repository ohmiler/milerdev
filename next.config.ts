import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheMaxMemorySize: 0,
  turbopack: {
    root: process.cwd(),
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
