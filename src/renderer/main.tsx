import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/share-tech-mono/400.css';
import './styles.css';
import { Capacitor } from '@capacitor/core';
import { App } from './App';
import { androidDeck } from './platform/android';

// Desktop gets window.deck from the Electron preload; the Android app provides its own.
if (Capacitor.isNativePlatform()) window.deck = androidDeck;
document.documentElement.dataset.platform = window.deck.platform;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
