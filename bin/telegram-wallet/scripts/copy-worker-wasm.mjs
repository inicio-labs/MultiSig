// The Miden SDK's web worker loads its WebAssembly from
// new URL('assets/miden_client_web.wasm', <the worker script's URL>). Next
// bundles the worker into /_next/static/chunks/, so that is
// /_next/static/chunks/assets/miden_client_web.wasm, where the build puts
// nothing: the server answers with its 404 page, and iOS refuses it
// ("Unexpected response MIME type"; desktop Chrome silently falls back to the
// main thread). Copy the worker's own WebAssembly there after every build,
// from the same installed package, so the glue and the binary always match.
// Argument: the build's static folder (default .next/static; .next-static/_next/static
// for the static site, which `next build` exports into its distDir).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules/@miden-sdk/miden-sdk/dist/st/workers/assets/miden_client_web.wasm');
const to = join(root, process.argv[2] ?? '.next/static', 'chunks/assets/miden_client_web.wasm');
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(`copied the Miden worker WebAssembly to ${to}`);
