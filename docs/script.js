// Main JavaScript file for your PWA - Weather app with current conditions
document.addEventListener('DOMContentLoaded', function() {
    console.log('Weather PWA loaded successfully!');
    
    // Initialize the app
    initApp();
});

function initApp() {
    // Inject app skeleton HTML and styling
    buildSkeleton();

    // Add fade-in animation to main content
    const app = document.getElementById('app');
    if (app) {
        app.classList.add('fade-in');
    }
    
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }

    // Ask for Notification permission (optional)
    if ('Notification' in window && Notification.permission !== 'granted') {
        try {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        } catch (e) {
            console.log('Notifications not available:', e);
        }
    }

    // Attempt to load cached weather first
    loadCachedWeather();

    // If online, try to fetch current location weather
    if (navigator.onLine) {
        getLocationAndUpdate();
    } else {
        setStatus('Offline — showing saved conditions if available.');
    }
}

// Add your custom app functionality here

// Replace placeholder with your OpenWeatherMap API key (or wire to your server proxy)
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // <-- Insert API key here
const DEFAULT_CITY = 'New York';
const STORAGE_KEY = 'weather_pwa_last';

function buildSkeleton() {
    const content = `
        <div class="weather-container" id="weather-container" role="main">
            <header class="weather-header">
                <h1 class="app-title">Weather Now</h1>
                <div class="controls">
                    <input id="city-input" type="search" placeholder="Search city (e.g. London)" aria-label="City">
                    <button id="search-btn" class="btn">Search</button>
                    <button id="locate-btn" class="btn">Use My Location</button>
                    <button id="refresh-btn" class="btn">Refresh</button>
                </div>
            </header>

            <section class="current-card" id="current-card" aria-live="polite">
                <div class="location-row">
                    <h2 id="location-name">--</h2>
                    <small id="last-updated">--</small>
                </div>
                <div class="main-row">
                    <img id="weather-icon" class="weather-icon" src="" alt="" />
                    <div class="temp-block">
                        <div id="temperature" class="temperature">--°</div>
                        <div id="description" class="description">--</div>
                    </div>
                </div>
                <ul class="details">
                    <li>Humidity: <span id="humidity">--</span></li>
                    <li>Wind: <span id="wind">--</span></li>
                    <li>Pressure: <span id="pressure">--</span></li>
                    <li>Feels like: <span id="feels-like">--</span></li>
                </ul>
                <div id="status" class="status">Ready</div>
            </section>

            <footer class="app-footer">
                <small>Powered by OpenWeatherMap • Offline caching enabled</small>
            </footer>
        </div>
    `;
    updateAppContent(content);

    injectStyles();

    // Wire up controls
    const searchBtn = document.getElementById('search-btn');
    const locateBtn = document.getElementById('locate-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const cityInput = document.getElementById('city-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const city = (cityInput && cityInput.value) ? cityInput.value.trim() : '';
            if (city) {
                fetchWeatherByCity(city);
            } else {
                setStatus('Please enter a city name to search.');
            }
        });
    }

    if (cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            getLocationAndUpdate();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshCurrent();
        });
    }
}

function injectStyles() {
    // Minimal styling tailored for the weather app (injected via JS for single-file customization)
    const css = `
        :root{
            --bg:#f0f4f8;
            --card:#ffffff;
            --accent:#2b8cff;
            --muted:#6b7280;
            --success:#16a34a;
        }
        body{
            margin:0;
            font-family:system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial;
            background:linear-gradient(180deg,var(--bg),#e6f0ff);
            color:#0f172a;
            -webkit-font-smoothing:antialiased;
            -moz-osx-font-smoothing:grayscale;
        }
        .fade-in{
            animation:fadeIn 500ms ease both;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .weather-container{
            max-width:720px;
            margin:28px auto;
            padding:18px;
        }
        .weather-header{
            display:flex;
            flex-direction:column;
            gap:12px;
            align-items:flex-start;
        }
        .app-title{
            margin:0;
            font-size:20px;
            letter-spacing:0.2px;
        }
        .controls{
            display:flex;
            gap:8px;
            width:100%;
        }
        .controls input[type="search"]{
            flex:1;
            padding:8px 10px;
            border-radius:8px;
            border:1px solid #d1d5db;
            outline:none;
        }
        .btn{
            padding:8px 10px;
            border:none;
            background:var(--accent);
            color:#fff;
            border-radius:8px;
            cursor:pointer;
            font-weight:600;
        }
        .btn[disabled]{ opacity:0.6; cursor:default; }
        .current-card{
            margin-top:14px;
            background:var(--card);
            border-radius:12px;
            padding:16px;
            box-shadow:0 6px 18px rgba(10,20,40,0.06);
        }
        .location-row{
            display:flex;
            justify-content:space-between;
            align-items:center;
        }
        .location-row h2{ margin:0; font-size:18px; }
        .main-row{
            display:flex;
            align-items:center;
            gap:14px;
            margin-top:10px;
        }
        .weather-icon{
            width:96px;
            height:96px;
            object-fit:contain;
        }
        .temperature{
            font-size:44px;
            font-weight:700;
        }
        .description{
            color:var(--muted);
            font-size:14px;
            text-transform:capitalize;
        }
        .details{
            list-style:none;
            padding:0;
            margin:12px 0 0 0;
            display:flex;
            gap:12px;
            flex-wrap:wrap;
            color:var(--muted);
        }
        .details li{
            background:#f8fafc;
            padding:8px 10px;
            border-radius:8px;
            font-size:13px;
        }
        .status{
            margin-top:12px;
            color:var(--muted);
            font-size:13px;
        }
        .app-footer{
            margin-top:12px;
            text-align:center;
            color:var(--muted);
        }
        /* Dynamic theme hints */
        .theme-clear { background: linear-gradient(180deg,#e6f7ff,#fff); }
        .theme-clouds { background: linear-gradient(180deg,#f3f4f6,#ffffff); }
        .theme-rain { background: linear-gradient(180deg,#eaf2ff,#f0f7ff); }
        .theme-thunder { background: linear-gradient(180deg,#fff7ed,#fff1e6); }
        @media (max-width:520px){
            .weather-container{ padding:12px; margin:12px; }
            .weather-icon{ width:72px; height:72px; }
            .temperature{ font-size:34px; }
            .controls{ flex-direction:column; gap:8px; }
        }
    `;
    const style = document.createElement('style');
    style.setAttribute('id', 'weather-pwa-styles');
    style.textContent = css;
    document.head.appendChild(style);
}

function updateAppContent(content) {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = content;
    } else {
        // If there's no #app container, create a full-page container
        const container = document.createElement('div');
        container.id = 'app';
        container.innerHTML = content;
        document.body.appendChild(container);
    }
}

function setStatus(message) {
    const status = document.getElementById('status');
    if (status) status.textContent = message;
    console.log('[Status]', message);
}

// Attempt to get geolocation and fetch weather
function getLocationAndUpdate() {
    setStatus('Locating...');
    if (!navigator.geolocation) {
        setStatus('Geolocation not supported in this browser.');
        // fallback to default city
        fetchWeatherByCity(DEFAULT_CITY);
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon);
    }, error => {
        console.warn('Geolocation error:', error);
        setStatus('Unable to access location. Using last saved or default city.');
        // fallback: try fetch cached or default city
        const cached = getCachedWeather();
        if (cached) {
            renderWeather(cached, 'cache');
            setStatus('Showing cached conditions.');
        } else {
            fetchWeatherByCity(DEFAULT_CITY);
        }
    }, {
        maximumAge: 1000 * 60 * 5,
        timeout: 10000
    });
}

function refreshCurrent() {
    setStatus('Refreshing...');
    // If we have a last successful location saved, try that first
    const cached = getCachedWeather();
    if (navigator.onLine) {
        if (cached && cached.coord && typeof cached.coord.lat === 'number') {
            fetchWeatherByCoords(cached.coord.lat, cached.coord.lon);
        } else {
            getLocationAndUpdate();
        }
    } else {
        setStatus('Cannot refresh while offline.');
    }
}

function fetchWeatherByCoords(lat, lon) {
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
        setStatus('No API key set — please configure API_KEY in script.js');
        const cached = getCachedWeather();
        if (cached) renderWeather(cached, 'cache');
        return;
    }

    setStatus('Fetching current conditions for your location...');
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
            return response.json();
        })
        .then(data => {
            renderWeather(data, 'network');
            cacheWeather(data);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            setStatus('Unable to fetch current weather. Showing cached data if available.');
            const cached = getCachedWeather();
            if (cached) renderWeather(cached, 'cache');
        });
}

function fetchWeatherByCity(city) {
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
        setStatus('No API key set — please configure API_KEY in script.js');
        const cached = getCachedWeather();
        if (cached) renderWeather(cached, 'cache');
        return;
    }

    setStatus('Searching ' + city + '...');
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('City not found or network error');
            return response.json();
        })
        .then(data => {
            renderWeather(data, 'network');
            cacheWeather(data);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            setStatus('Unable to fetch weather for "' + city + '".');
        });
}

function renderWeather(data, sourceLabel = '') {
    if (!data || typeof data !== 'object') return;
    const nameEl = document.getElementById('location-name');
    const tempEl = document.getElementById('temperature');
    const descEl = document.getElementById('description');
    const iconEl = document.getElementById('weather-icon');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind');
    const pressureEl = document.getElementById('pressure');
    const feelsEl = document.getElementById('feels-like');
    const lastEl = document.getElementById('last-updated');

    const cityName = data.name || (data.sys && data.sys.country ? `${data.sys.country}` : 'Unknown location');
    const temp = data.main && typeof data.main.temp !== 'undefined' ? Math.round(data.main.temp) : '--';
    const description = data.weather && data.weather[0] && data.weather[0].description ? data.weather[0].description : '--';
    const humidity = data.main && typeof data.main.humidity !== 'undefined' ? `${data.main.humidity}%` : '--';
    const wind = data.wind && typeof data.wind.speed !== 'undefined' ? `${data.wind.speed} m/s` : '--';
    const pressure = data.main && typeof data.main.pressure !== 'undefined' ? `${data.main.pressure} hPa` : '--';
    const feelsLike = data.main && typeof data.main.feels_like !== 'undefined' ? `${Math.round(data.main.feels_like)}°` : '--';
    const iconCode = data.weather && data.weather[0] && data.weather[0].icon ? data.weather[0].icon : null;
    const weatherId = data.weather && data.weather[0] && data.weather[0].id ? data.weather[0].id : 800;

    if (nameEl) nameEl.textContent = cityName;
    if (tempEl) tempEl.textContent = `${temp}°`;
    if (descEl) descEl.textContent = description;
    if (humidityEl) humidityEl.textContent = humidity;
    if (windEl) windEl.textContent = wind;
    if (pressureEl) pressureEl.textContent = pressure;
    if (feelsEl) feelsEl.textContent = feelsLike;
    if (lastEl) lastEl.textContent = `Updated ${formatTime(new Date())} ${sourceLabel ? '· ' + sourceLabel : ''}`;

    if (iconEl) {
        if (iconCode) {
            iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            iconEl.alt = description;
        } else {
            iconEl.src = '';
            iconEl.alt = '';
        }
    }

    setStatus('Current conditions loaded.');

    // Set theme class on container to hint visual state
    const container = document.getElementById('weather-container');
    if (container) {
        container.classList.remove('theme-clear', 'theme-clouds', 'theme-rain', 'theme-thunder');
        if (weatherId >= 200 && weatherId < 300) {
            container.classList.add('theme-thunder');
            triggerWeatherNotification(`Thunderstorm in ${cityName}`, description);
        } else if (weatherId >= 300 && weatherId < 600) {
            container.classList.add('theme-rain');
            maybeNotifyRain(weatherId, cityName, description);
        } else if (weatherId >= 600 && weatherId < 700) {
            container.classList.add('theme-clouds');
        } else if (weatherId === 800) {
            container.classList.add('theme-clear');
        } else if (weatherId > 800) {
            container.classList.add('theme-clouds');
        }

        // small scroll/focus for accessibility on update
        container.setAttribute('tabindex', '-1');
        container.focus({ preventScroll: true });
    }
}

function maybeNotifyRain(id, city, desc) {
    // Notify on heavier rain/drizzle
    if (id >= 500 && id < 600) {
        triggerWeatherNotification(`Rain in ${city}`, desc);
    }
}

function triggerWeatherNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title || 'Weather Now', {
                body: message || 'Current conditions updated',
                icon: '/icons/icon-192.png'
            });
        } catch (e) {
            console.warn('Notification failed:', e);
        }
    }
}

// Cache to localStorage for offline viewing
function cacheWeather(data) {
    try {
        const payload = {
            data,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        console.log('Weather cached locally.');
    } catch (e) {
        console.warn('Failed to cache weather:', e);
    }
}

function getCachedWeather() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) return parsed.data;
        return null;
    } catch (e) {
        console.warn('Failed to read cached weather:', e);
        return null;
    }
}

function loadCachedWeather() {
    const cached = getCachedWeather();
    if (cached) {
        renderWeather(cached, 'cache');
        setStatus('Loaded saved conditions.');
    }
}

function formatTime(d) {
    if (!(d instanceof Date)) d = new Date(d);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m} ${ampm}`;
}

// Example function to show a generic notification
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification('Weather Now', { body: message });
        } catch (e) {
            console.warn('Notification display failed:', e);
        }
    }
}