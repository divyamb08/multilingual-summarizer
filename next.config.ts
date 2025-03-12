import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    api: {
      bodyParser: {
        sizeLimit: "10mb",
      },
    },
  },
};

export default nextConfig;
