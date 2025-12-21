const nextConfig = {
  experimental: {
    serverActions: true,
  },

  images: {
    domains: ['drive.google.com', 'lh3.googleusercontent.com'],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
} as any

export default nextConfig
