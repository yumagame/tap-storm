import { Sfx } from '../../shared/sfx.js';

const KEY = 'risk-tap-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.75);
let W = 1, H = 1, dpr = 1;
let run = false, score = 0, best = +localStorage.getItem(KEY) || 0;
let combo = 0, lives = 3, wave = 1;
let orbs = [], parts = [], spawnT = 0, waveT = 0, last = 0, shake = 0, flash = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  el.textContent = `×${combo}`; el.classList.add('show');
}
function hud() {
  document.getElementById('score').textContent = score;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = best;
  livesUI(); comboUI();
}

function start() {
  sfx.unlock();
  run = true; score = 0; combo = 0; lives = 3; wave = 1;
  orbs = []; parts = []; spawnT = 0.12; waveT = 12; shake = 0; flash = 0;
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

function burst(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 200;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, age: 0, col });
  }
}

function hurt(msgShake = true) {
  lives--; combo = 0;
  if (msgShake) { shake = 0.35; flash = 0.3; }
  sfx.bad();
  if (navigator.vibrate) navigator.vibrate(45);
  hud();
  if (lives <= 0) over();
}

function spawn() {
  // kind: good | gold | bad
  let kind = 'good';
  const r = Math.random();
  if (r < 0.22 + Math.min(0.18, wave * 0.015)) kind = 'bad';
  else if (r < 0.22 + 0.12) kind = 'gold';
  const maxR = kind === 'gold' ? 58 : 48 + Math.random() * 12;
  const life = kind === 'bad' ? Math.max(0.9, 1.6 - wave * 0.04) : Math.max(0.75, 1.55 - wave * 0.05);
  const pad = maxR + 20;
  // packing attempts
  let x = 0, y = 0, ok = false;
  for (let t = 0; t < 14; t++) {
    x = pad + Math.random() * (W - pad * 2);
    y = 100 + Math.random() * (H - 180);
    ok = true;
    for (const o of orbs) {
      if (Math.hypot(o.x - x, o.y - y) < (o.maxR + maxR) * 0.55) { ok = false; break; }
    }
    if (ok) break;
  }
  if (!ok && orbs.length > 8) return;
  orbs.push({
    x, y, kind,
    r: maxR * 0.45,
    minR: maxR * 0.45,
    maxR,
    age: 0,
    life,
    pulse: Math.random() * 10,
  });
}

function update(dt) {
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.age < p.life);
  if (!run) return;
  waveT -= dt;
  if (waveT <= 0) { wave++; waveT = Math.max(8, 12 - wave * 0.25); sfx.wave(); hud(); }
  spawnT -= dt;
  if (spawnT <= 0) {
    const n = 1 + (wave >= 2 ? 1 : 0) + (wave >= 6 && Math.random() < 0.55 ? 1 : 0) + (wave >= 10 && Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) spawn();
    spawnT = Math.max(0.1, 0.42 - wave * 0.025);
  }
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.age += dt; o.pulse += dt * 9;
    const p = Math.min(1, o.age / o.life);
    o.r = o.minR + (o.maxR - o.minR) * p;
    if (o.age >= o.life) {
      orbs.splice(i, 1);
      if (o.kind === 'good' || o.kind === 'gold') {
        // missed good = hurt
        burst(o.x, o.y, 14, '#ff5544');
        hurt();
      } else {
        // missed bad = safe disappear
        burst(o.x, o.y, 8, '#666');
      }
    }
  }
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 10 * shake; oy = (Math.random() - .5) * 10 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // field dots
  ctx.fillStyle = 'rgba(80,160,120,0.05)';
  for (let y = 0; y < H; y += 26) for (let x = 0; x < W; x += 26) ctx.fillRect(x, y, 1.5, 1.5);

  for (const o of orbs) {
    const p = o.age / o.life;
    const col = o.kind === 'bad' ? '#ff3d5a' : o.kind === 'gold' ? '#ffcc44' : '#2ef0a0';
    // countdown ring
    ctx.beginPath();
    ctx.strokeStyle = p > 0.7 ? '#ff3d5a' : col;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.arc(o.x, o.y, o.maxR + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p));
    ctx.stroke();
    const pl = 1 + Math.sin(o.pulse) * 0.04;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 1.3 * pl);
    g.addColorStop(0, o.kind === 'bad' ? 'rgba(255,120,140,0.95)' : o.kind === 'gold' ? 'rgba(255,240,160,0.95)' : 'rgba(160,255,210,0.95)');
    g.addColorStop(0.5, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.fillStyle = g; ctx.arc(o.x, o.y, o.r * 1.25 * pl, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = col; ctx.arc(o.x, o.y, o.r * 0.5 * pl, 0, Math.PI * 2); ctx.fill();
    // icon
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = `bold ${Math.floor(o.r * 0.55)}px Orbitron,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(o.kind === 'bad' ? '×' : o.kind === 'gold' ? '★' : '●', o.x, o.y + 1);
  }
  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(255,40,60,${flash * 0.3})`; ctx.fillRect(-10, -10, W + 20, H + 20); }
  ctx.restore();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let bestI = -1, bestD = 1e9;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    const d = Math.hypot(o.x - x, o.y - y);
    if (d <= o.r + 16 && d < bestD) { bestD = d; bestI = i; }
  }
  if (bestI < 0) return;
  const o = orbs[bestI];
  orbs.splice(bestI, 1);
  if (o.kind === 'bad') {
    burst(o.x, o.y, 18, '#ff3d5a');
    hurt();
    return;
  }
  combo++;
  const base = o.kind === 'gold' ? 90 : 30;
  const speedB = Math.round((1 - o.age / o.life) * 50);
  score += Math.round((base + speedB) * (1 + Math.floor(combo / 3) * 0.4));
  sfx.hit(combo);
  burst(o.x, o.y, o.kind === 'gold' ? 24 : 14, o.kind === 'gold' ? '#ffcc44' : '#2ef0a0');
  if (navigator.vibrate) navigator.vibrate(o.kind === 'gold' ? [10, 20, 10] : 8);
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
