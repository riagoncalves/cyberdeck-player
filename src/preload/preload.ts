import { contextBridge, ipcRenderer } from 'electron';
import { REDIRECT_URI, type DeckApi } from '../shared/ipc';

const api: DeckApi = {
  platform: 'desktop',
  redirectUri: REDIRECT_URI,
  status: () => ipcRenderer.invoke('auth:status'),
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  token: () => ipcRenderer.invoke('auth:token'),
  drm: () => ipcRenderer.invoke('drm:status'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  playlistEmbed: (id) => ipcRenderer.invoke('spotify:playlist-embed', id),
  window: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
    close: () => ipcRenderer.send('win:close'),
  },
};

contextBridge.exposeInMainWorld('deck', api);
