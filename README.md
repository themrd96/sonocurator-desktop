# SonoCurator Desktop — Build Your Own .exe

This folder contains everything needed to build SonoCurator as a standalone Windows desktop app (`.exe`). No Node.js needed to **run** the app — only to **build** it once.

---

## Quick Start (One-Time Build)

### What You Need

1. **Node.js 18+** — Download from https://nodejs.org (pick the LTS version)
2. **ffmpeg** (optional but recommended) — Download from https://www.gyan.dev/ffmpeg/builds/
   - Get the "essentials" build, extract it, add the `bin` folder to your system PATH
   - Without ffmpeg, only WAV files can be analyzed (no MP3, FLAC, OGG, M4A)

### Build the .exe

**Option A: Double-click the build script**

1. Double-click `BUILD.bat`
2. Wait for it to finish (first build takes 2-5 minutes as it downloads Electron)
3. Your `.exe` will be in the `release/` folder

**Option B: Command line**

```cmd
cd sonocurator-desktop
npm install
npm run build
```

The portable `.exe` will appear in the `release/` folder:
```
release/SonoCurator-2.0.0-Portable.exe
```

---

## Running SonoCurator

Just double-click **SonoCurator-2.0.0-Portable.exe**. That's it.

- A splash screen appears while it starts up
- The app opens in its own window (like Spotify or Discord)
- No browser needed, no terminal needed, no Node.js needed

### Where's My Data?

Your tracks, database, and uploads are stored in:
```
C:\Users\<YourName>\AppData\Roaming\SonoCurator\data\
```

This means:
- Your data survives app updates
- You can back up the `data` folder to keep your library safe
- Deleting the `.exe` does NOT delete your tracks

---

## Want an Installer Instead?

If you prefer a proper Windows installer (with Start Menu shortcut, uninstaller, etc.):

```cmd
npm run build:installer
```

This creates `release/SonoCurator-2.0.0-Setup.exe` — a one-click installer.

---

## Troubleshooting

### "ffmpeg not found" warning on startup
Install ffmpeg and add it to PATH, or place `ffmpeg.exe` in your PATH. The app will still work for WAV files without it.

### App won't start / port error
Another instance of SonoCurator might be running. Check Task Manager for "SonoCurator" and close it.

### Build fails with native module errors
Make sure you have the Visual Studio Build Tools installed:
```cmd
npm install -g windows-build-tools
```
Or install "Desktop development with C++" workload from Visual Studio Installer.

---

## What's Inside

```
sonocurator-desktop/
├── electron-main.cjs    # Electron main process (launches server + window)
├── server-bundle/       # Pre-built backend + frontend
│   ├── index.cjs        # Express server (analysis engine, API, everything)
│   └── public/          # Frontend files (React app)
├── package.json         # Dependencies + build config
├── BUILD.bat            # One-click build script
└── README.md            # This file
```
