import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePattern = (() => {
    if (!supabaseUrl) return null;

    try {
        const parsed = new URL(supabaseUrl);
        return {
            protocol: parsed.protocol.replace(":", "") as "http" | "https",
            hostname: parsed.hostname,
            port: parsed.port || undefined,
        };
    } catch {
        return null;
    }
})();

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
            {
                protocol: "http",
                hostname: "127.0.0.1",
            },
            ...(supabasePattern ? [supabasePattern] : []),
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
    async headers() {
        return [
            {
                source: "/.well-known/apple-app-site-association",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/json",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
