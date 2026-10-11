import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Telegram Web (web.telegram.org) shows mini apps in an iframe; the native
// Telegram apps use a webview. Only Telegram may frame this app.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://web.telegram.org" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // A second local copy (e.g. the development signer beside a production
  // build) needs its own build folder: two Next processes must not share one.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // This app has its own lockfile inside the MultiSig repo.
  outputFileTracingRoot: __dirname,
  // `next dev` behind a tunnel (Telegram needs https): allow its host to load dev assets.
  allowedDevOrigins: ['*.trycloudflare.com'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  webpack: (config, { webpack }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' });
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    // The single-threaded build, as in coordinator-frontend: its "node" export
    // condition lacks the WASM array types during SSR bundling.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@miden-sdk/miden-sdk$': path.join(__dirname, 'node_modules/@miden-sdk/miden-sdk/dist/st/index.js'),
    };
    // zone.js replaces the global Promise, and the Miden SDK's IndexedDB store
    // (Dexie) then fails every transaction with PrematureCommitError. Nothing
    // here should load it; if a dependency ever tries (Para's telemetry did in
    // coordinator-frontend), it gets an empty module instead.
    const emptyStub = path.join(__dirname, 'src/stubs/empty.js');
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^(?:@opentelemetry\/context-zone(?:-peer-dep)?|zone\.js)$/,
      emptyStub,
    ));
    // Privy's optional Farcaster-on-Solana support; this app is Ethereum keys only.
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@farcaster\/mini-app-solana$/, emptyStub));
    return config;
  },
};

export default nextConfig;
