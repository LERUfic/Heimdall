import type { NextConfig } from "next";
import os from "os";

// 1. Get the container's internal IPs
const interfaces = os.networkInterfaces();
const validIps = Object.values(interfaces)
  .flat()
  .filter((i) => i?.family === 'IPv4')
  .map((i) => i?.address as string);

// 2. Allow explicitly defined hostnames (via Env) OR fallback to localhost
const allowedExternalOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['localhost:3000', '127.0.0.1:3000'];

const nextConfig: NextConfig = {
  /* config options here */

  allowedDevOrigins: [...validIps, ...allowedExternalOrigins],

  // Note: If your login is failing due to Next.js 14+ Server Actions, 
  // you likely also need to explicitly whitelist them here:
  experimental: {
    serverActions: {
      allowedOrigins: [...validIps, ...allowedExternalOrigins],
    },
  },
};

export default nextConfig;
