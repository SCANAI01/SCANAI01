/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['img.dexscreener.com', 'via.placeholder.com'],
    unoptimized: true,
  },
};

export default nextConfig;
