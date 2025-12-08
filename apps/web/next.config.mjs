import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@innkeeper/lib', '@innkeeper/engine', '@innkeeper/agents'],
  // Turbopack disabled - use webpack (specify --webpack flag in dev script)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'thread-stream': false,
      'pino-elasticsearch': false,
      'pino-pretty': false,
      'tap': false,
      'desm': false,
      'fastbench': false,
      // MetaMask SDK tries to import React Native packages - ignore them in web builds
      '@react-native-async-storage/async-storage': false,
      // Disable SES/Lockdown to prevent conflicts - AGGRESSIVE DISABLE
      'ses': false,
      'lockdown': false,
      '@endo/env-options': false,
      '@endo/init': false,
      '@endo/lockdown': false,
      // '@metamask/sdk': false, // Re-enabled - needed for metaMaskWallet
    };

    // Ignore SES-related packages to prevent auto-execution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'ses': false,
      'lockdown': false,
      '@endo/env-options': false,
      '@endo/init': false,
      '@endo/lockdown': false,
    };

    // Note: indexedDB ReferenceError during SSR is expected from dependencies
    // These are runtime warnings, not build errors - the build still succeeds

    return config;
  },
  serverExternalPackages: ['pino', 'thread-stream'],
  // Turbopack disabled - it has issues with test files in dependencies (thread-stream, WalletConnect)
  // Webpack handles these edge cases better. Turbopack can still be used for dev with `next dev --turbo` if desired
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' https://* wss://* http://localhost:* https://explorer-api.walletconnect.com https://*.walletconnect.com https://*.walletconnect.org https://pulse.walletconnect.org https://rpc.monad.xyz https://testnet-rpc.monad.xyz https://farcaster.xyz https://*.farcaster.xyz https://client.farcaster.xyz https://warpcast.com https://client.warpcast.com https://wrpcd.net https://*.wrpcd.net https://cloudflareinsights.com https://cloud.reown.com https://imagedelivery.net *; img-src 'self' blob: data: https://imagedelivery.net https://wrpcd.net https://*.wrpcd.net *; font-src 'self' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org https://wallet.farcaster.xyz; frame-ancestors 'self' http://localhost:* https://*.tavernkeeper.xyz https://farcaster.xyz https://*.farcaster.xyz https://wallet.farcaster.xyz https://warpcast.com https://client.warpcast.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
