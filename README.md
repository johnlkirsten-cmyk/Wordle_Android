# Wordle for Android

This is a standalone, dependency-free Progressive Web App (PWA). The original
Tkinter desktop project remains separate in `WORDLE`.

## Run locally

From this directory, start a local web server:

```powershell
python -m http.server 8000
```

Open <http://localhost:8000> in a browser on the computer. A web server is
needed because browsers do not load the offline word list or service worker
from a `file://` URL.

## Install on Android

1. Publish this folder to a static web host that serves it over HTTPS.
2. Open the hosted address in Chrome on Android.
3. Use Chrome's menu and choose **Install app** or **Add to Home screen**.
4. Open the app once while online. The service worker then caches the app and
   word list for offline play.

The game can also be opened over a local network for testing, but Android
requires a secure context (HTTPS) for home-screen installation and offline
service-worker support.

## Features

- Touch keyboard and physical keyboard input
- Word lengths available in the included list (4, 5, and 6 letters)
- Dark, light, and pastel themes; theme and length are saved on the device
- Six guesses, duplicate-letter-aware feedback, and offline caching
- A solution definition lookup using the free Dictionary API; this requires an
  internet connection, and some names or brands may not have dictionary entries
- No third-party libraries

## Run the game-logic tests

With Node.js installed:

```powershell
node --test tests/game-engine.test.mjs
```
