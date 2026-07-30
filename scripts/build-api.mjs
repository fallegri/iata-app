/**
 * Bundles the Express server app into a single file for Vercel Serverless Functions.
 * Uses esbuild to resolve all imports (including @iata-app/shared and node_modules)
 * into one self-contained CommonJS file at api/index.js.
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await build({
  entryPoints: [resolve(root, 'server/src/app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: resolve(root, 'api/index.mjs'),
  external: [
    // Native modules that can't be bundled
    '@neondatabase/serverless',
    'pg-native',
  ],
  // Resolve @iata-app/shared from the workspace
  alias: {
    '@iata-app/shared': resolve(root, 'shared/src/index.ts'),
  },
  banner: {
    js: '// Auto-generated bundle for Vercel Serverless Functions\n',
  },
  sourcemap: false,
  minify: false,
});

console.log('✅ API bundle built: api/index.mjs');
