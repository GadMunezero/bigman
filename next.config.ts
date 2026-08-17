import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle with only the node_modules actually
  // used, so the container image does not ship the whole dependency tree.
  output: "standalone",
  // better-sqlite3 is a native module: keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
};

export default nextConfig;
