import { app, BrowserWindow, components, ipcMain, net, protocol, shell } from 'electron';
import { join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { accessToken, authStatus, login, logout } from './auth';
import { SPOTIFY_ID } from '../shared/ipc';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIR = join(__dirname, '..', 'renderer');

app.setName('Cyberdeck Player');
// Spotify's player script expects a regular Chromium browser.
app.userAgentFallback = app.userAgentFallback.replace(/\s?(Electron|cyberdeck-player|Cyberdeck Player)\/\S+/g, '');

// The built UI is served from app://deck/, a secure origin, which DRM playback requires.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://sdk.scdn.co",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://api.spotify.com https://*.spotify.com https://*.scdn.co wss://*.spotify.com",
  'frame-src https://sdk.scdn.co',
].join('; ');

let drmStatus = { ready: false, detail: 'Starting Widevine…' };

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    backgroundColor: '#07050d',
    title: 'Cyberdeck Player',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());

  // Links open in the system browser, never in the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(DEV_URL ?? 'app://deck/')) event.preventDefault();
  });

  win.loadURL(DEV_URL ?? 'app://deck/index.html');
};

const registerIpc = () => {
  ipcMain.handle('auth:status', () => authStatus());
  ipcMain.handle('spotify:playlist-embed', async (_e, id: string) => {
    if (!SPOTIFY_ID.test(String(id))) throw new Error('Invalid playlist ID.');
    const res = await net.fetch(`https://open.spotify.com/embed/playlist/${id}`);
    if (!res.ok) throw new Error(`Embed request failed (${res.status}).`);
    return res.text();
  });
  ipcMain.handle('auth:login', () => login());
  ipcMain.handle('auth:logout', () => logout());
  ipcMain.handle('auth:token', () => accessToken());
  ipcMain.handle('drm:status', () => drmStatus);
  ipcMain.handle('shell:open', (_e, url: string) => {
    if (/^https:\/\//.test(url)) return shell.openExternal(url);
  });
  ipcMain.on('win:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on('win:toggle-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
};

app.whenReady().then(async () => {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const file = normalize(join(RENDERER_DIR, decodeURIComponent(pathname)));
    if (!file.startsWith(RENDERER_DIR)) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    if (!file.endsWith('.html')) return response;
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(response.body, { status: response.status, headers });
  });

  registerIpc();

  // castlabs Electron downloads and verifies the Widevine CDM on first run.
  try {
    await components.whenReady();
    drmStatus = { ready: true, detail: 'Widevine ready' };
  } catch (err) {
    drmStatus = { ready: false, detail: `Widevine unavailable: ${(err as Error).message}` };
    console.error(drmStatus.detail, components.status());
  }

  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
