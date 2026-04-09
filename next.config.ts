import type { NextConfig } from "next";
import os from "os";

// Dynamically generate host origin strings matching the physical server's transient IPs to bypass HMR blocking
const interfaces = os.networkInterfaces();
const validIps = Object.values(interfaces)
  .flat()
  .filter((i) => i?.family === 'IPv4')
  .map((i) => i?.address as string);

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore -- Some localized typings might not reflect Next 15 standard directly
  allowedDevOrigins: validIps
};

export default nextConfig;
