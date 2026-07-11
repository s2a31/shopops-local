import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product artwork is locally generated SVG committed to this repo (no
    // third-party or user-supplied SVGs), so serving it through next/image is
    // safe with a restrictive CSP and no script execution.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
