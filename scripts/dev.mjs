// Dev loop: Vite for the UI, esbuild for main/preload, then Electron pointed at Vite.
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { build } from 'esbuild';
import { clientIdDefine } from './env.mjs';

const server = await createServer({ configFile: 'vite.config.ts' });
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173/';

const buildMain = () =>
  build({
    entryPoints: { main: 'src/main/main.ts', preload: 'src/preload/preload.ts' },
    outdir: 'dist/main',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['electron'],
    define: clientIdDefine(),
    sourcemap: true,
  });

await buildMain();

const electronBin = (await import('electron')).default;
// VS Code terminals export ELECTRON_RUN_AS_NODE, which would start Electron as plain Node.
const env = { ...process.env, VITE_DEV_SERVER_URL: url };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electronBin, ['.'], { stdio: 'inherit', env });

child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
