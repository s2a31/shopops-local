import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // The generic admin-gallery artwork is locally generated SVG committed to
    // this repo, so serving it through next/image is safe with a restrictive
    // CSP and no script execution.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    return [
      {
        // Existing local databases may still contain the former SVG paths.
        source: "/images/products/:slug\\.svg",
        destination: "/images/products/:slug.webp",
      },
    ];
  },
};

export default nextConfig;
