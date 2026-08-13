/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next 16 only allows the qualities declared here. These cover compact
    // cards through high-detail destination and place heroes without asking
    // the optimizer for arbitrary variants.
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2560],
    imageSizes: [32, 48, 64, 96, 128, 160, 256, 384],
    qualities: [60, 75, 85, 90],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Uploaded moderator/gallery photos are served from this public bucket.
      { protocol: "https", hostname: "gzkpnugqdyozzkppxcsn.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
}

export default nextConfig
