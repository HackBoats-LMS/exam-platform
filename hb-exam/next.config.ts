import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images (logo from hackboats.com)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.hackboats.com',
        pathname: '/images/**',
      },
    ],
  },

  // Add security + performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enable XSS protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Aggressive caching for static assets (JS, CSS, images)
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // Reduce bundle size: don't include source maps in production
  productionBrowserSourceMaps: false,

  // Compress output
  compress: true,

  // Experimental: enable React Server Component optimizations
  experimental: {
    // Optimize package imports for large libraries
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
