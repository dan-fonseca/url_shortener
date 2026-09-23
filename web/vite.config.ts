import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // For local dev, point VITE_API_ORIGIN at a deployed stack
  // (e.g. https://d123.cloudfront.net) to proxy /api calls to it.
  const env = loadEnv(mode, process.cwd());
  return {
    // Served by CloudFront under /app/* from the S3 bucket's app/ prefix.
    base: '/app/',
    build: { outDir: 'dist', assetsDir: 'assets', sourcemap: true },
    server: env.VITE_API_ORIGIN
      ? { proxy: { '/api': { target: env.VITE_API_ORIGIN, changeOrigin: true } } }
      : undefined,
  };
});
