"use strict";

// ============================================================
// THEME RESTORE
// ============================================================
const THEMES = { snow:"theme-snow", forest:"theme-forest", sunset:"theme-sunset", space:"theme-space" };
const savedTheme = localStorage.getItem("theme") || "snow";
document.body.className = (THEMES[savedTheme] || "theme-snow") + " games-page";

// ============================================================
// PROXY
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
// SNOW
// ============================================================
let snowEnabled = savedTheme === "snow";

function initSnow() {
  const canvas = document.getElementById("snow-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let flakes = [];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener("resize", resize);

  function mkFlake() {
    return {
      x: Math.random() * canvas.width, y: -10,
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
// BACK BUTTON
// ============================================================
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "/";
});

// ============================================================
// RENDER GAMES
// ============================================================
function renderGames() {
  const grid = document.getElementById("games-grid");
  GAMES.forEach((game) => {
    const card = document.createElement("div");
    card.className = "game-card" + (game.url ? "" : " no-url");
    card.innerHTML = `
      <div class="game-icon">${game.icon}</div>
      <div class="game-name">${game.name}</div>
      ${game.url ? "" : '<div class="game-tag">Coming soon</div>'}
    `;
    if (game.url) {
      card.addEventListener("click", () => openProxy(game.url, `🎮 ${game.name}`));
    }
    grid.appendChild(card);
  });
}

// ============================================================
// BOOT
// ============================================================
initSnow();
renderGames();
