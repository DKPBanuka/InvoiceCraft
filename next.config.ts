// next.config.ts

import type { NextConfig } from 'next';

// Import the PWA package
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

// Your Next.js config
const nextConfig: NextConfig = {
  // typescript: { ignoreBuildErrors: true }, // REMOVED - It's better to fix errors
  // eslint: { ignoreDuringBuilds: true }, // REMOVED - It's better to fix linting issues
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// Wrap your entire config with the PWA function
export default withPWA(nextConfig);