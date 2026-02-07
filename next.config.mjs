/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow reading files from outside the project directory
  experimental: {
    serverComponentsExternalPackages: ['gray-matter'],
  },
};

export default nextConfig;
