import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
            },
            {
                protocol: "http",
                hostname: "localhost",
            },
        ],
    },

    // Performance
    reactStrictMode: true,

    // Compression
    compress: true,

    // Powered by header (remove for security)
    poweredByHeader: false,

    // Experimental features
    experimental: {
        optimizePackageImports: ["lucide-react", "framer-motion"],
    },
};

export default nextConfig;
