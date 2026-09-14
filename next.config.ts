import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = process.env.DASTARKHAN_TARGET === 'vercel' || process.env.VERCEL === '1' ? {
  distDir: '.next-vercel',
  outputFileTracingRoot: path.resolve('.'),
  typescript: { tsconfigPath: 'tsconfig.vercel.json' },
  webpack(config) {
    config.resolve.alias[path.resolve('db/runtime.ts')] = path.resolve('db/runtime.vercel.ts');
    config.resolve.alias[path.resolve('app/worker-factory.ts')] = path.resolve('app/worker-factory.next.ts');
    return config;
  },
} : {};

export default nextConfig;
