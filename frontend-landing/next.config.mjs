/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      'isomorphic-ws': './lib/isomorphic-ws.ts',
    },
  },
}

export default nextConfig
