# Weather Now — PWA Weather App (Current Conditions)

Weather Now is a Progressive Web App (PWA) that shows current weather conditions for your location or any city you search. It's mobile-first, installable, and works offline by caching the most recently viewed forecast and app shell.

## Features

- ✅ Mobile-first responsive design optimized for quick condition checks
- ✅ Shows current conditions: temperature, feels-like, humidity, wind, pressure, visibility
- ✅ Weather icon + descriptive text and hourly snapshot
- ✅ Geolocation support: get conditions for your current position
- ✅ City search with autocomplete hinting (lightweight)
- ✅ Unit toggle: Celsius / Fahrenheit
- ✅ Offline support: service worker caches app shell and latest fetched weather for offline access
- ✅ Add to home screen (Installable) with manifest and icon set
- ✅ Tailwind CSS for clean, utility-first styling
- ✅ Deployed to GitHub Pages (docs folder)

## Files

- `index.html` - Main HTML file and UI structure
- `style.css` - Visual styling using Tailwind (plus a few custom rules)
- `script.js` - JavaScript: geolocation, API calls, UI updates, caching logic
- `manifest.json` - PWA manifest with icons, name, theme color, display mode
- `service-worker.js` - Offline functionality and caching strategies (app shell + runtime cache for API responses)
- `/icons` - App icons used in manifest and for install prompt (various sizes)
- `/docs` - Built site for GitHub Pages deployment

## How it works

- On load the app attempts to use the browser's Geolocation API. If permission is denied or unavailable, you can search by city.
- Current weather data is fetched from a weather API (e.g. OpenWeatherMap). The app displays temperature, weather summary, humidity, wind speed, local time, and a suitable background or icon.
- The service worker caches the app shell (HTML/CSS/JS/icons) and stores the last fetched weather JSON in the runtime cache or IndexedDB. If offline, the UI will show the cached last-known conditions and a clear "Offline" indicator.

## Setup / API Key

This app expects you to provide a weather API key (for example from OpenWeatherMap). Insert your key into `script.js` or into an environment mechanism before building/deploying.

Example (in `script.js` near the top):
const API_KEY = 'REPLACE_WITH_YOUR_OPENWEATHERMAP_API_KEY';

Notes:
- Keep your API key secure for production. For a simple static demo it's OK to embed locally, but for public apps consider a small proxy or serverless function.
- If you don't provide a key the app will still load but will show error states when trying to fetch current conditions.

## Usage

- Allow location when prompted to get immediate local weather.
- Search for city names using the search box at the top.
- Toggle units (C / F) using the unit control.
- Pull-to-refresh or click the refresh icon to re-fetch current data.
- If offline, the app indicates offline mode and shows the most recently cached conditions (timestamped).

## Deployment

This app is set up to be deployed to GitHub Pages using the `/docs` folder.

To build and deploy:
1. Ensure `index.html`, `style.css`, `script.js`, `manifest.json`, and `service-worker.js` are present in the repo root or build output.
2. Move the production-ready files into `/docs` or configure your build to output there.
3. Push to GitHub and enable GitHub Pages from the repository Settings → Pages → Build and deployment → Source: `gh-pages` or `docs` branch/folder.
4. Confirm your site at the provided GitHub Pages URL.

Note: Service workers only work on HTTPS or localhost. GitHub Pages serves over HTTPS.

## Local Development

To run this app locally:

1. Clone the repository:
   git clone <repo-url>
2. Add your weather API key to `script.js` (see Setup / API Key).
3. Serve with a local server (recommended so service worker and geolocation behave properly):
   python -m http.server 8000
4. Open http://localhost:8000 in your browser.
5. For testing installability, open DevTools → Application to inspect the manifest and service worker, and use the "Install" option to add the PWA.

Alternative local servers:
- npm: npx http-server
- serve: npm i -g serve && serve

## PWA Behavior & Caching Strategy

- App shell (HTML/CSS/JS/icons) - cached on service worker install (Cache First).
- Weather API responses - cached at runtime with a short TTL (e.g., 10–30 minutes). The last successful response is retained for offline use.
- On fetch failure (offline) the UI displays cached conditions with a clear "Offline — last updated" message and timestamp.
- The service worker updates in the background; when a new version is available the user gets an update notification (or micro UI hint) to refresh for latest assets.

## Accessibility & UX

- High contrast text over dynamic backgrounds
- Large, tappable controls and optimized touch targets
- Screen-reader friendly labels for search, refresh, and unit toggle
- Keyboard accessible search and controls

## Troubleshooting

- No location shown? Check browser permissions and ensure location services are enabled.
- Stale data while online? Use the refresh control to force a re-fetch. Service worker caches can be cleared from DevTools → Application → Clear Storage.
- API errors? Confirm your API key and check rate limits for your chosen weather provider.

## Extending the App

Ideas to expand the app:
- 7-day forecast with daily summaries
- Hourly timeline with precipitation probability
- Background sync to update data when connectivity returns
- Multiple saved locations and quick swipe to switch
- Weather alerts and severe weather notifications using Push API

## License

MIT — feel free to reuse and adapt for your own projects.

Enjoy checking the weather quickly, wherever you are — offline-friendly and installable.