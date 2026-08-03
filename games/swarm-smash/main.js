import { Sfx } from '../../shared/sfx.js';

const KEY = 'swarm-smash-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.75);
let W = 1, H = 1, dpr = 1, cx = 0, cy = 0;
let run = false, score = 0, best = +localStorage.getItem(KEY) || 0;
let combo = 0, maxCombo = 0, lives = 3, wave = 1;
let bugs = [], parts = [], spawnT = 0, waveT = 0, elapsed = 0, last = 0, shake = 0, flash = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2; cy = H * 0.58;
}
window.addEventListener('resize', resize);
resize();

function livesUI() {
  const el = document.getElementById('lives');
  el.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('i');
    if (i >= lives) d.className = 'off';
    el.appendChild(d);
  }
}
function comboUI() {
  const el = document.getElementById('combo');
  if (combo < 2) { el.classList.remove('show'); return; }
  el.textContent = `×${combo}`;
  el.classList.add('show');
}
function hud() {
  document.getElementById('score').textContent = score;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = best;
  livesUI(); comboUI();
}

function start() {
  sfx.unlock();
  run = true; score = 0; combo = 0; maxCombo = 0; lives = 3; wave = 1;
  bugs = []; parts = []; spawnT = 0.15; waveT = 14; elapsed = 0; shake = 0; flash = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  hud(); sfx.wave();
}

function over() {
  run = false;
  if (score > best) { best = score; localStorage.setItem(KEY, String(best)); }
  sfx.over();
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = score;
}

function spawn() {
  const ang = Math.random() * Math.PI * 2;
  const dist = Math.max(W, H) * 0.62;
  const big = Math.random() < 0.12 + wave * 0.015;
  const xp = Math.random() < 0.08;
  const hp = big ? 3 + Math.floor(wave / 3) : xp ? 5 : 1;
  const speed = (90 + wave * 14 + Math.random() * 40) * (big ? 0.65 : 1) * (xp ? 0.55 : 1);
  bugs.push({
    x: cx + Math.cos(ang) * dist,
    y: cy + Math.sin(ang) * dist,
    r: big ? 28 : xp ? 22 : 16 + Math.random() * 6,
    hp, max: hp, big, xp,
    speed,
    wiggle: Math.random() * 10,
  });
}

function burst(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.25, age: 0, col });
  }
}

function hurt() {
  lives--; combo = 0; shake = 0.4; flash = 0.35; sfx.bad();
  if (navigator.vibrate) navigator.vibrate(40);
  hud();
  if (lives <= 0) over();
}

function update(dt) {
  if (!run) { for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; } parts = parts.filter(p => p.age < p.life); return; }
  elapsed += dt; waveT -= dt;
  if (waveT <= 0) { wave++; waveT = Math.max(9, 14 - wave * 0.3); sfx.wave(); flash = 0.25; hud(); }
  spawnT -= dt;
  if (spawnT <= 0) {
    const n = 1 + (wave >= 3 ? 1 : 0) + (wave >= 7 && Math.random() < 0.5 ? 1 : 0) + (wave >= 12 && Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) spawn();
    spawnT = Math.max(0.1, 0.48 - wave * 0.028 - elapsed * 0.004);
  }
  for (let i = bugs.length - 1; i >= 0; i--) {
    const b = bugs[i];
    b.wiggle += dt * 14;
    const dx = cx - b.x, dy = cy - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.x += (dx / d) * b.speed * dt + Math.cos(b.wiggle) * 12 * dt;
    b.y += (dy / d) * b.speed * dt + Math.sin(b.wiggle * 1.3) * 12 * dt;
    if (d < 34 + b.r * 0.4) {
      bugs.splice(i, 1);
      burst(b.x, b.y, 12, '#ff6655');
      hurt();
    }
  }
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
  parts = parts.filter(p => p.age < p.life);
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - 0.5) * 12 * shake; oy = (Math.random() - 0.5) * 12 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // core
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 48);
  g.addColorStop(0, '#fff0e8'); g.addColorStop(0.35, '#ff8866'); g.addColorStop(1, 'rgba(255,40,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd0c0'; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();

  for (const b of bugs) {
    const col = b.xp ? '#ffd060' : b.big ? '#ff3040' : '#ff6a40';
    ctx.beginPath();
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // legs
    ctx.strokeStyle = 'rgba(255,200,180,0.45)'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = b.wiggle + k * 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(a) * b.r * 1.5, b.y + Math.sin(a) * b.r * 1.5);
      ctx.stroke();
    }
    if (b.hp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x - b.r, b.y - b.r - 8, b.r * 2, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - b.r, b.y - b.r - 8, b.r * 2 * (b.hp / b.max), 4);
    }
  }
  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(255,40,20,${flash * 0.35})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
  ctx.restore();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let bestI = -1, bestD = 1e9;
  for (let i = 0; i < bugs.length; i++) {
    const b = bugs[i];
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < b.r + 22 && d < bestD) { bestD = d; bestI = i; }
  }
  if (bestI < 0) { combo = 0; comboUI(); return; }
  const b = bugs[bestI];
  b.hp -= 1;
  sfx.hit(combo);
  burst(b.x, b.y, 6, b.xp ? '#ffe080' : '#ff8866');
  if (navigator.vibrate) navigator.vibrate(8);
  if (b.hp <= 0) {
    bugs.splice(bestI, 1);
    combo++; maxCombo = Math.max(maxCombo, combo);
    const pts = Math.round((b.big ? 40 : b.xp ? 80 : 15) * (1 + Math.floor(combo / 4) * 0.5));
    score += pts;
    burst(b.x, b.y, b.big ? 22 : 12, b.xp ? '#ffd060' : '#ff5533');
    if (b.big) sfx.boom();
  }
  hud();
}, { passive: false });

document.getElementById('start').onclick = start;
document.getElementById('again').onclick = start;
document.getElementById('home').onclick = () => {
  document.getElementById('result').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
};

function loop(t) {
  const dt = Math.min(0.05, ((t - last) / 1000) || 0.016);
  last = t; update(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.getElementById('best').textContent = best;
