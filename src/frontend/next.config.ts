import type { NextConfig } from 'next';
const path = require('path');

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  // Removed output: 'export' to enable API routes
};

export default nextConfig;
