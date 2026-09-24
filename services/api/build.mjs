// Bundles each Lambda handler into dist/<name>/index.mjs so Terraform can zip
// one self-contained directory per function.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

const handlersDir = 'src/handlers';
const handlers = readdirSync(handlersDir).filter((f) => f.endsWith('.ts'));

rmSync('dist', { recursive: true, force: true });

await Promise.all(
  handlers.map((file) => {
    const name = basename(file, '.ts');
    return build({
      entryPoints: [join(handlersDir, file)],
      outfile: join('dist', name, 'index.mjs'),
      bundle: true,
      minify: true,
      sourcemap: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      // The AWS SDK v3 ships with the Lambda Node.js runtime; excluding it
      // keeps bundles small and cold starts fast.
      external: ['@aws-sdk/*'],
      banner: {
        // Shim `require` for any CJS dependency bundled into an ESM output.
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
    });
  }),
);

console.log(`Built ${handlers.length} handlers: ${handlers.join(', ')}`);
