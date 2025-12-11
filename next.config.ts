/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Increase body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  images: {
    domains: ['drive.google.com', 'lh3.googleusercontent.com'],
  },
}

module.exports = nextConfig