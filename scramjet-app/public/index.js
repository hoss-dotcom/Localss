"use strict";

// ============================================================
// PROXY INIT
// ============================================================
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});
scramjet.init();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
let proxyReady = false;

async function ensureProxy() {
  if (proxyReady) return;
  try { await registerSW(); } catch (_) {}
  const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
    await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
  }
  proxyReady = true;
}

async function openProxy(url, title) {
  await ensureProxy();
  const content = document.getElementById("overlay-content");
  content.innerHTML = "";
  const frame = scramjet.createFrame();
  frame.frame.style.cssText = "width:100%;height:100%;border:none;display:block;";
  content.appendChild(frame.frame);
  frame.go(url);
  document.getElementById("overlay-title").textContent = title || url;
  document.getElementById("proxy-overlay").classList.add("active");
}

const _overlayClose = document.getElementById("overlay-close");
if (_overlayClose) _overlayClose.addEventListener("click", () => {
  const ov = document.getElementById("proxy-overlay");
  const oc = document.getElementById("overlay-content");
  if (ov) ov.classList.remove("active");
  if (oc) oc.innerHTML = "";
});

// ============================================================
// NAV BUTTONS
// ============================================================
const _gamesBtn = document.getElementById("games-btn");
const _moviesBtn = document.getElementById("movies-btn");
const _musicBtn  = document.getElementById("music-btn");
if (_gamesBtn)  _gamesBtn.addEventListener("click",  () => { window.location.href = "/games.html"; });
if (_moviesBtn) _moviesBtn.addEventListener("click", () => { openProxy("https://toustream.xyz/", "🎬 Movies"); });
if (_musicBtn)  _musicBtn.addEventListener("click",  () => { openProxy("https://monochrome.tf", "🎵 Music"); });

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("clock-time").textContent = `${h}:${m}:${s}`;
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now2 = new Date();
  document.getElementById("clock-date").textContent =
    `${days[now2.getDay()]}, ${months[now2.getMonth()]} ${now2.getDate()}`;
}
updateClock();
setInterval(updateClock, 1000);

// ============================================================
// WEATHER
// ============================================================
const WX = {
  0:  { e:"☀️",  d:"Clear sky" },
  1:  { e:"🌤️", d:"Mostly clear" },
  2:  { e:"⛅",  d:"Partly cloudy" },
  3:  { e:"☁️",  d:"Overcast" },
  45: { e:"🌫️", d:"Foggy" },
  48: { e:"🌫️", d:"Freezing fog" },
  51: { e:"🌦️", d:"Light drizzle" },
  53: { e:"🌦️", d:"Drizzle" },
  55: { e:"🌧️", d:"Heavy drizzle" },
  61: { e:"🌧️", d:"Light rain" },
  63: { e:"🌧️", d:"Rain" },
  65: { e:"🌧️", d:"Heavy rain" },
  71: { e:"🌨️", d:"Light snow" },
  73: { e:"🌨️", d:"Snow" },
  75: { e:"❄️",  d:"Heavy snow" },
  77: { e:"🌨️", d:"Snow grains" },
  80: { e:"🌦️", d:"Showers" },
  81: { e:"🌦️", d:"Heavy showers" },
  82: { e:"⛈️",  d:"Violent showers" },
  85: { e:"🌨️", d:"Snow showers" },
  86: { e:"❄️",  d:"Heavy snow shower" },
  95: { e:"⛈️",  d:"Thunderstorm" },
  96: { e:"⛈️",  d:"Thunderstorm+hail" },
  99: { e:"⛈️",  d:"Thunderstorm+hail" },
};

async function fetchWeather() {
  const widget = document.getElementById("weather-widget");
  if (!navigator.geolocation) {
    widget.innerHTML = '<span class="weather-loading">📍 No location</span>';
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    try {
      const [wxRes, geoRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`),
      ]);
      const wx = await wxRes.json();
      const geo = await geoRes.json();
      const cw = wx.current_weather;
      const info = WX[cw.weathercode] || { e:"🌡️", d:"Unknown" };
      const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || "Unknown";
      const temp = Math.round(cw.temperature);
      widget.innerHTML = `
        <div class="weather-icon">${info.e}</div>
        <div>
          <div class="weather-temp">${temp}°F</div>
          <div class="weather-desc">${info.d}</div>
          <div class="weather-loc">📍 ${city}</div>
        </div>`;
    } catch (_) {
      widget.innerHTML = '<span class="weather-loading">Weather unavailable</span>';
    }
  }, () => {
    widget.innerHTML = '<span class="weather-loading">📍 Location denied</span>';
  });
}
fetchWeather();

// ============================================================
// SNOW
// ============================================================
let snowEnabled = true;

function initSnow() {
  const canvas = document.getElementById("snow-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let flakes = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function mkFlake() {
    return {
      x: Math.random() * canvas.width,
      y: -10,
      r: Math.random() * 2.2 + 0.5,
      speed: Math.random() * 0.7 + 0.25,
      opacity: Math.random() * 0.65 + 0.15,
      swing: Math.random() * 1.8 - 0.9,
      angle: Math.random() * Math.PI * 2,
      angleSpeed: Math.random() * 0.018 + 0.004,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (snowEnabled) {
      while (flakes.length < 170) flakes.push(mkFlake());
      flakes = flakes.filter(f => f.y < canvas.height + 12);
      for (const f of flakes) {
        f.angle += f.angleSpeed;
        f.x += Math.sin(f.angle) * f.swing;
        f.y += f.speed;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,228,255,${f.opacity})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ============================================================
// FULLSCREEN
// ============================================================
document.getElementById("fullscreen-btn").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
document.addEventListener("fullscreenchange", () => {
  document.getElementById("fs-expand").style.display = document.fullscreenElement ? "none" : "";
  document.getElementById("fs-shrink").style.display = document.fullscreenElement ? "" : "none";
});

// ============================================================
// SETTINGS
// ============================================================
const settingsPanel = document.getElementById("settings-panel");
const settingsOverlay = document.getElementById("settings-overlay");

function openSettings()  { settingsPanel.classList.add("open"); settingsOverlay.classList.add("active"); }
function closeSettings() { settingsPanel.classList.remove("open"); settingsOverlay.classList.remove("active"); }

document.getElementById("settings-btn").addEventListener("click", openSettings);
document.getElementById("settings-close").addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

// Tab Cloak
let faviconEl = document.querySelector("link[rel='shortcut icon']");
if (!faviconEl) {
  faviconEl = document.createElement("link");
  faviconEl.rel = "icon";
  document.head.appendChild(faviconEl);
}

function applyCloak(title, icon) {
  if (title) { document.title = title; localStorage.setItem("cloak_title", title); }
  if (icon)  { faviconEl.href = icon;  localStorage.setItem("cloak_icon",  icon); }
}

document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("tab-title-input").value = btn.dataset.title;
    document.getElementById("tab-icon-input").value  = btn.dataset.icon;
    applyCloak(btn.dataset.title, btn.dataset.icon);
  });
});

document.getElementById("apply-cloak").addEventListener("click", () => {
  applyCloak(
    document.getElementById("tab-title-input").value,
    document.getElementById("tab-icon-input").value
  );
});

document.getElementById("reset-cloak").addEventListener("click", () => {
  document.title = "Local";
  faviconEl.href = "/favicon.ico";
  localStorage.removeItem("cloak_title");
  localStorage.removeItem("cloak_icon");
  document.getElementById("tab-title-input").value = "";
  document.getElementById("tab-icon-input").value  = "";
});

// Restore saved cloak
const _ct = localStorage.getItem("cloak_title");
const _ci = localStorage.getItem("cloak_icon");
if (_ct) { document.title = _ct; document.getElementById("tab-title-input").value = _ct; }
if (_ci) { faviconEl.href = _ci; document.getElementById("tab-icon-input").value  = _ci; }

// Themes
const THEMES = { snow:"theme-snow", forest:"theme-forest", sunset:"theme-sunset", space:"theme-space" };

function applyTheme(name) {
  document.body.className = THEMES[name] || "theme-snow";
  snowEnabled = name === "snow";
  localStorage.setItem("theme", name);
  document.querySelectorAll(".theme-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.theme === name);
  });
}

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});

// Restore saved theme
const _savedTheme = localStorage.getItem("theme") || "snow";
applyTheme(_savedTheme);

// Panic
const panicInput = document.getElementById("panic-url-input");
const _savedPanic = localStorage.getItem("panic_url");
if (_savedPanic) panicInput.value = _savedPanic;
panicInput.addEventListener("input", () => localStorage.setItem("panic_url", panicInput.value));

function doPanic() {
  window.location.href = panicInput.value || "https://classroom.google.com";
}

document.getElementById("panic-btn").addEventListener("click", doPanic);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !settingsPanel.classList.contains("open")) doPanic();
});

// ============================================================
// BOOT
// ============================================================
initSnow();
