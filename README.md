# Cyberdeck Player

A cyberpunk player for your Spotify account, for Linux desktops (Electron) and Android (Capacitor), built with React and TypeScript in the style of [Cyberdeck UI](https://github.com/riagoncalves/cyberdeck-ui).

It has its own interface. Spotify is the music source: you sign in with your account, and the app uses the Spotify Web API and the Web Playback SDK.

## Features

- **Home:** your top artists, what you have on repeat, and recently played.
- **Search** across songs, artists, albums, playlists, podcasts and episodes, as you type.
- **Library:** Liked Songs, your playlists, saved albums, followed artists, and your podcasts and saved episodes.
- **Album, artist, playlist and podcast pages**, plus your playback queue.
- **Player:** play/pause, next/previous, seek, shuffle, repeat, volume, and like or unlike the current song.
- **Plays inside the app.** It shows up as the Spotify Connect device "Cyberdeck Player". It can also take over playback on any other device, such as the official app or your phone.
- **Keyboard (desktop):** `Space` play/pause, `Ctrl+K` search, `Alt+←/→` back and forward.
- **Phone layout:** bottom tabs, a mini player with a full-screen "now playing" view, and a media notification with lock-screen controls on Android.

## Requirements

- **Spotify Premium.** Spotify only allows playback control through its API for Premium accounts, and developer apps need a Premium owner.
- **A Spotify developer app.** It's free; see setup below.
- **Node.js 22+** and npm.
- **For Android:** the Android SDK (platform 36) and JDK 21, plus a phone with USB debugging on.

## Setup

1. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and **create an app**.
2. Add these **redirect URIs**, exactly. The first is for desktop, the second for Android:
   ```
   http://127.0.0.1:43821/callback
   cyberdeck-player://callback
   ```
3. Under "Which API/SDKs are you planning to use?", tick **Web API** and **Web Playback SDK**. Save.
4. Copy `.env.example` to `.env` and set `SPOTIFY_CLIENT_ID` to the app's **Client ID**. It's compiled into the builds; the build fails without it.
5. Install, allow the Chromium sandbox (Ubuntu 23.10+ only, once), and run:
   ```bash
   npm install
   sudo ./scripts/setup-apparmor.sh
   npm run dev
   ```
   Ubuntu blocks Chromium's sandbox for binaries without an AppArmor profile, so Electron exits with "Zygote process exited prematurely". The script adds a profile for this project's Electron binary only, like Ubuntu's own profiles for Chrome and VS Code.
6. Click **Connect Spotify** and approve access in your browser.

The app uses PKCE, so it never needs a client secret. On desktop, the session tokens are stored in `~/.config/Cyberdeck Player/`, encrypted with your system keyring when one is available. On Android they stay in the app's private storage, which is excluded from backups.

## Android

```bash
npm run android:install
```

This builds the UI, syncs it into the Capacitor project in `android/`, builds a debug APK, and installs it on the connected phone with `adb`. The app supports Android 10 and later.

On a short landscape touchscreen, such as a car head unit (about 1024×600) or a phone turned sideways, it switches to a car layout. That layout has a navigation rail on the left and a permanent "now playing" panel with large controls on the right. The UI is compiled for Chrome 69+, so it runs on head units with an old System WebView. If the device has no browser, Spotify sign-in opens inside the app.

The Android app is the same UI inside a WebView. A small native plugin (`android/app/src/main/java/dev/riagoncalves/cyberdeck/`) handles the sign-in redirect, the back gesture, and a foreground media service. The service keeps playback going with the screen off and shows the media notification. Debug builds allow WebView debugging over USB (`chrome://inspect`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs Vite with hot reload and starts Electron against it |
| `npm run build` | Builds the UI to `dist/renderer` and main/preload to `dist/main` |
| `npm start` | Builds, then runs the production build |
| `npm run dist` | Builds the Ubuntu/Debian package `release/cyberdeck-player_<version>_amd64.deb`; install it with `sudo apt install ./release/cyberdeck-player_*.deb` |
| `npm run android:build` | Builds the Android debug APK |
| `npm run android:install` | Builds the APK and installs it on the connected phone |
| `npm run typecheck` | Type-checks the UI and the main process |

## How in-app playback works

Spotify streams are DRM-protected. On desktop, stock Electron can't decrypt them, so this project uses [castlabs Electron](https://github.com/castlabs/electron-releases), a drop-in Electron build that includes the Widevine CDM. It downloads Widevine on first launch, which takes a few seconds. On Android, the system WebView provides Widevine.

The Web Playback SDK then registers the app as a Spotify Connect device. The device menu in the player bar shows whether in-app audio is online. If it isn't, you can still use the app as a remote for another device.

## Spotify API limits

Since February 2026, Spotify apps in Development Mode have a reduced API. This app only uses endpoints that still exist. As a result:

- **Playlists you don't own:** the Web API no longer lists their songs. The app falls back to the playlist's public embed widget (`open.spotify.com/embed`). That works for public playlists only, lists the first 100 songs, and has no album art or artist links. It's unofficial and may break if Spotify changes the page.
- **Search** returns at most 10 results per type.
- **No artist top tracks, new releases or browse categories:** Spotify removed them.
- **Up to 5 users:** a Development Mode app allows the owner plus a few test users added in the dashboard.

## Project structure

```
src/
├── main/        Electron main process: window, Widevine, app:// protocol, PKCE sign-in, token storage
├── preload/     The desktop `window.deck` bridge (context-isolated)
├── shared/      Types and constants shared by all sides
└── renderer/    React UI
    ├── platform/      The Android `window.deck` bridge
    ├── spotify.ts     Web API client
    ├── player.tsx     Playback state, Web Playback SDK device and remote control
    ├── components/    Title bar, sidebar, player bar, mobile player and tabs, track and episode lists
    └── views/         Home, Search, Liked Songs, Albums, Podcasts, Queue, Library, playlist/album/artist/show pages
android/         Capacitor Android project
```

## License

MIT
