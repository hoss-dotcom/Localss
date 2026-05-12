"use strict";

// ============================================================
// PROXY INIT
// ============================================================
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all:  "/scram/scramjet.all.js",
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

let activeFrame = null;

async function openProxy(url, title) {
  await ensureProxy();
  const content = document.getElementById("overlay-content");
  if (content) {
    content.innerHTML = "";
    activeFrame = scramjet.createFrame();
    activeFrame.frame.style.cssText = "width:100%;height:100%;border:none;display:block;";
    content.appendChild(activeFrame.frame);
    activeFrame.go(url);
  }
  const titleEl = document.getElementById("overlay-title");
  // Don't show title — the addr bar shows the URL
  if (titleEl) titleEl.textContent = "";
  const addrInput = document.getElementById("addr-input");
  if (addrInput) addrInput.value = url;
  const ov = document.getElementById("proxy-overlay");
  if (ov) ov.classList.add("active");
}

// Close overlay
const _overlayClose = document.getElementById("overlay-close");
if (_overlayClose) _overlayClose.addEventListener("click", () => {
  const ov = document.getElementById("proxy-overlay");
  const oc = document.getElementById("overlay-content");
  if (ov) ov.classList.remove("active");
  if (oc) oc.innerHTML = "";
  activeFrame = null;
});

// ── Address bar (in-proxy search) ──────────────────────────
const ENGINES = {
  google: "https://www.google.com/search?q=",
  ddg:    "https://duckduckgo.com/?q=",
  bing:   "https://www.bing.com/search?q=",
};

function resolveUrl(raw, engine) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w-]+\.[\w.]{2,}(\/.*)?$/.test(raw)) return "https://" + raw;
  return (ENGINES[engine] || ENGINES.google) + encodeURIComponent(raw);
}

const addrBar = document.getElementById("addr-bar");
if (addrBar) {
  addrBar.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw    = (document.getElementById("addr-input")?.value || "").trim();
    const engine = document.getElementById("addr-engine")?.value || "google";
    if (!raw) return;
    openProxy(resolveUrl(raw, engine), raw);
  });
}

// ── Home search bar ─────────────────────────────────────────
const homeSearchForm = document.getElementById("home-search-form");
if (homeSearchForm) {
  homeSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw    = (document.getElementById("home-search-input")?.value || "").trim();
    const engine = document.getElementById("home-engine")?.value || "google";
    if (!raw) return;
    openProxy(resolveUrl(raw, engine), raw);
  });
}

// ============================================================
// NAV BUTTONS
// ============================================================
const _gamesBtn  = document.getElementById("games-btn");
const _moviesBtn = document.getElementById("movies-btn");
const _musicBtn  = document.getElementById("music-btn");

if (_gamesBtn) _gamesBtn.addEventListener("click", () => {
  // Persist fullscreen preference so games.html can restore it
  localStorage.setItem("fullscreen_pref", document.fullscreenElement ? "1" : "0");
  window.location.href = "/games.html";
});
if (_moviesBtn) _moviesBtn.addEventListener("click", () => openProxy("https://toustream.xyz/",  "🎬 Movies"));
if (_musicBtn)  _musicBtn.addEventListener("click",  () => openProxy("https://monochrome.tf",   "🎵 Music"));

// Devlog / Admin buttons
const _devlogBtn = document.getElementById("devlog-btn");
const _adminBtn  = document.getElementById("admin-btn");
if (_devlogBtn) _devlogBtn.addEventListener("click", () => { window.location.href = "/devlog.html"; });
if (_adminBtn)  _adminBtn.addEventListener("click",  () => { window.location.href = "/admin.html"; });

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,"0");
  const m = String(now.getMinutes()).padStart(2,"0");
  const s = String(now.getSeconds()).padStart(2,"0");
  const el = document.getElementById("clock-time");
  if (el) el.textContent = `${h}:${m}:${s}`;
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const de = document.getElementById("clock-date");
  if (de) de.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
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
  if (!widget) return;
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
      const wx  = await wxRes.json();
      const geo = await geoRes.json();
      const cw   = wx.current_weather;
      const info = WX[cw.weathercode] || { e:"🌡️", d:"Unknown" };
      const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || "Unknown";
      widget.innerHTML = `
        <div class="weather-icon">${info.e}</div>
        <div>
          <div class="weather-temp">${Math.round(cw.temperature)}°F</div>
          <div class="weather-desc">${info.d}</div>
          <div class="weather-loc">📍 ${city}</div>
        </div>`;
    } catch (_) {
      widget.innerHTML = '<span class="weather-loading">Weather unavailable</span>';
    }
  }, () => {
    if (widget) widget.innerHTML = '<span class="weather-loading">📍 Location denied</span>';
  });
}
fetchWeather();

// ============================================================
// SNOW — pre-seeded across full screen for continuous coverage
// ============================================================
let snowEnabled = true;

function initSnow() {
  const canvas = document.getElementById("snow-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let flakes = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function mkFlake(startAnywhere) {
    return {
      x:          Math.random() * canvas.width,
      y:          startAnywhere ? Math.random() * canvas.height : -10,
      r:          Math.random() * 2.6 + 0.5,
      speed:      Math.random() * 0.85 + 0.25,
      opacity:    Math.random() * 0.7  + 0.15,
      swing:      Math.random() * 2.2  - 1.1,
      angle:      Math.random() * Math.PI * 2,
      angleSpeed: Math.random() * 0.02 + 0.004,
    };
  }

  // Pre-seed flakes across the entire screen so it looks continuous from load
  for (let i = 0; i < 280; i++) flakes.push(mkFlake(true));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (snowEnabled) {
      // Top up to 280 flakes — new ones always enter from the top
      while (flakes.length < 280) flakes.push(mkFlake(false));
      flakes = flakes.filter(f => f.y < canvas.height + 14);
      for (const f of flakes) {
        f.angle += f.angleSpeed;
        f.x     += Math.sin(f.angle) * f.swing;
        f.y     += f.speed;
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
const _fsBtn = document.getElementById("fullscreen-btn");
if (_fsBtn) _fsBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
document.addEventListener("fullscreenchange", () => {
  const isFs = !!document.fullscreenElement;
  localStorage.setItem("fullscreen_pref", isFs ? "1" : "0");
  const exp = document.getElementById("fs-expand");
  const shr = document.getElementById("fs-shrink");
  if (exp) exp.style.display = isFs ? "none" : "";
  if (shr) shr.style.display = isFs ? "" : "none";
});

// ============================================================
// SETTINGS
// ============================================================
const settingsPanel   = document.getElementById("settings-panel");
const settingsOverlay = document.getElementById("settings-overlay");

function openSettings()  {
  if (settingsPanel)   settingsPanel.classList.add("open");
  if (settingsOverlay) settingsOverlay.classList.add("active");
}
function closeSettings() {
  if (settingsPanel)   settingsPanel.classList.remove("open");
  if (settingsOverlay) settingsOverlay.classList.remove("active");
}

const _settingsBtn   = document.getElementById("settings-btn");
const _settingsClose = document.getElementById("settings-close");
if (_settingsBtn)   _settingsBtn.addEventListener("click", openSettings);
if (_settingsClose) _settingsClose.addEventListener("click", closeSettings);
if (settingsOverlay) settingsOverlay.addEventListener("click", closeSettings);

// Tab Cloak
let faviconEl = document.querySelector("link[rel='shortcut icon']");
if (!faviconEl) {
  faviconEl = document.createElement("link");
  faviconEl.rel = "icon";
  document.head.appendChild(faviconEl);
}

function applyCloak(title, icon) {
  if (title) { document.title = title; localStorage.setItem("cloak_title", title); }
  if (icon)  { faviconEl.href = icon;  localStorage.setItem("cloak_icon",  icon);  }
}

document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const ti = document.getElementById("tab-title-input");
    const ii = document.getElementById("tab-icon-input");
    if (ti) ti.value = btn.dataset.title;
    if (ii) ii.value = btn.dataset.icon;
    applyCloak(btn.dataset.title, btn.dataset.icon);
  });
});

const _applyCloak = document.getElementById("apply-cloak");
if (_applyCloak) _applyCloak.addEventListener("click", () => {
  applyCloak(
    document.getElementById("tab-title-input")?.value,
    document.getElementById("tab-icon-input")?.value
  );
});

const _resetCloak = document.getElementById("reset-cloak");
if (_resetCloak) _resetCloak.addEventListener("click", () => {
  document.title = "Local";
  if (faviconEl) faviconEl.href = "/favicon.ico";
  localStorage.removeItem("cloak_title");
  localStorage.removeItem("cloak_icon");
  const ti = document.getElementById("tab-title-input");
  const ii = document.getElementById("tab-icon-input");
  if (ti) ti.value = "";
  if (ii) ii.value = "";
});

// Restore saved cloak
const _ct = localStorage.getItem("cloak_title");
const _ci = localStorage.getItem("cloak_icon");
if (_ct) { document.title = _ct; const ti = document.getElementById("tab-title-input"); if (ti) ti.value = _ct; }
if (_ci) { if (faviconEl) faviconEl.href = _ci; const ii = document.getElementById("tab-icon-input"); if (ii) ii.value = _ci; }

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
applyTheme(localStorage.getItem("theme") || "snow");

// Panic
const panicInput = document.getElementById("panic-url-input");
if (panicInput) {
  const _savedPanic = localStorage.getItem("panic_url");
  if (_savedPanic) panicInput.value = _savedPanic;
  panicInput.addEventListener("input", () => localStorage.setItem("panic_url", panicInput.value));
}

function doPanic() {
  const url = panicInput?.value || "https://classroom.google.com";
  window.location.href = url;
}

const _panicBtn = document.getElementById("panic-btn");
if (_panicBtn) _panicBtn.addEventListener("click", doPanic);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !settingsPanel?.classList.contains("open") &&
      !document.getElementById("proxy-overlay")?.classList.contains("active")) {
    doPanic();
  }
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements() {
  try {
    const data = await fetch("/api/announcements").then(r => r.json());
    if (!Array.isArray(data) || !data.length) return;

    const dismissed = new Set(
      JSON.parse(localStorage.getItem("dismissed_announces") || "[]")
    );
    const latest = data.find(a => !dismissed.has(a.id));
    if (!latest) return;

    const strip = document.getElementById("announce-strip");
    const text  = document.getElementById("announce-text");
    const icon  = document.getElementById("announce-icon");
    if (!strip || !text) return;

    const icons = { info:"📢", update:"✅", warning:"⚠️" };
    if (icon) icon.textContent = icons[latest.type] || "📢";
    text.textContent = latest.message;
    strip.dataset.id   = latest.id;
    strip.dataset.type = latest.type || "info";
    strip.style.display = "";
  } catch (_) {}
}

const _announceDismiss = document.getElementById("announce-dismiss");
if (_announceDismiss) {
  _announceDismiss.addEventListener("click", () => {
    const strip = document.getElementById("announce-strip");
    if (!strip) return;
    const id = Number(strip.dataset.id);
    const dismissed = new Set(JSON.parse(localStorage.getItem("dismissed_announces") || "[]"));
    dismissed.add(id);
    localStorage.setItem("dismissed_announces", JSON.stringify([...dismissed]));
    strip.style.display = "none";
  });
}

// ============================================================
// FLOATING TIPS
// ============================================================
// Floating tips
const tips = [
  "this is better then someone elses website",
  "games soon",
  "im the friggin goat boi -local",
  "bruh moment",
  "boi",
  "lowkey"
];

const tipsRow = document.getElementById("tips-row");
let tipIndex = 0;

function showFloatingTip() {
  if (!tipsRow) return;

  const tip = document.createElement("div");
  tip.className = "floating-tip";
  tip.textContent = tips[tipIndex];

  tipsRow.innerHTML = "";
  tipsRow.appendChild(tip);

  // trigger animation
  setTimeout(() => {
    tip.classList.add("show");
  }, 50);

  tipIndex = (tipIndex + 1) % tips.length;
}

showFloatingTip();
setInterval(showFloatingTip, 5000);

// ============================================================
// BOOT
// ============================================================
initSnow();
loadAnnouncements();
initTips();
