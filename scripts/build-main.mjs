// Bundles the Electron main and preload scripts.
import { build, context } from 'esbuild';
import { clientIdDefine } from './env.mjs';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: { main: 'src/main/main.ts', preload: 'src/preload/preload.ts' },
  outdir: 'dist/main',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  define: clientIdDefine(),
  sourcemap: watch,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
