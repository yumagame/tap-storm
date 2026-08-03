import { Sfx } from '../../shared/sfx.js';

const KEY = 'orbit-bash-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.74);
let W = 1, H = 1, dpr = 1, cx = 0, cy = 0;
let run = false, score = 0, best = +localStorage.getItem(KEY) || 0;
let combo = 0, lives = 3, wave = 1;
let rocks = [], parts = [], spawnT = 0, waveT = 0, last = 0, shake = 0, flash = 0, angleBias = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2; cy = H * 0.52;
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
  rocks = []; parts = []; spawnT = 0.1; waveT = 13; shake = 0; flash = 0; angleBias = 0;
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
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 240;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, age: 0, col });
  }
}
function hurt() {
  lives--; combo = 0; shake = 0.4; flash = 0.35; sfx.bad();
  if (navigator.vibrate) navigator.vibrate(40);
  hud();
  if (lives <= 0) over();
}

function spawn() {
  angleBias += 0.7 + Math.random();
  const ang = angleBias + Math.random() * 0.8;
  const dist = Math.max(W, H) * 0.58;
  const hard = Math.random() < 0.18 + wave * 0.02;
  const elite = Math.random() < 0.06;
  const hp = elite ? 8 : hard ? 3 + Math.floor(wave / 4) : 1 + (wave > 5 && Math.random() < 0.3 ? 1 : 0);
  rocks.push({
    ang, dist,
    spin: (Math.random() < 0.5 ? -1 : 1) * (1.1 + wave * 0.08 + Math.random() * 0.6),
    sink: 55 + wave * 6 + Math.random() * 30,
    r: elite ? 34 : hard ? 26 : 15 + Math.random() * 8,
    hp, max: hp, hard, elite,
    rot: Math.random() * 10,
  });
}

function update(dt) {
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.age < p.life);
  if (!run) return;
  waveT -= dt;
  if (waveT <= 0) { wave++; waveT = Math.max(8, 13 - wave * 0.28); sfx.wave(); hud(); flash = 0.2; }
  spawnT -= dt;
  if (spawnT <= 0) {
    const n = 1 + (wave >= 3 ? 1 : 0) + (wave >= 8 && Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawn();
    spawnT = Math.max(0.12, 0.5 - wave * 0.03);
  }
  for (let i = rocks.length - 1; i >= 0; i--) {
    const o = rocks[i];
    o.ang += o.spin * dt;
    o.dist -= o.sink * dt;
    o.rot += dt * 3;
    o.x = cx + Math.cos(o.ang) * o.dist;
    o.y = cy + Math.sin(o.ang) * o.dist;
    if (o.dist < 36 + o.r * 0.3) {
      rocks.splice(i, 1);
      burst(o.x, o.y, 16, '#ff6688');
      hurt();
    }
  }
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;
}

function drawRock(o) {
  const col = o.elite ? '#ffd060' : o.hard ? '#a0b8ff' : '#6a90ff';
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rot);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rr = o.r * (i % 2 === 0 ? 1 : 0.72);
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.shadowColor = col; ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  if (o.hp > 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(o.x - o.r, o.y - o.r - 9, o.r * 2, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(o.x - o.r, o.y - o.r - 9, o.r * 2 * (o.hp / o.max), 4);
  }
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 11 * shake; oy = (Math.random() - .5) * 11 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // orbits
  ctx.strokeStyle = 'rgba(120,160,255,0.08)';
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath(); ctx.arc(cx, cy, 40 + i * 40, 0, Math.PI * 2); ctx.stroke();
  }
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#8ab0ff'); g.addColorStop(1, 'rgba(60,80,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8e4ff'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();

  for (const o of rocks) drawRock(o);
  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(100,140,255,${flash * 0.25})`; ctx.fillRect(-10,-10,W+20,H+20); }
  ctx.restore();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  let bestI = -1, bestD = 1e9;
  for (let i = 0; i < rocks.length; i++) {
    const o = rocks[i];
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < o.r + 20 && d < bestD) { bestD = d; bestI = i; }
  }
  if (bestI < 0) { combo = 0; comboUI(); return; }
  const o = rocks[bestI];
  o.hp -= 1;
  sfx.hit(combo);
  burst(o.x, o.y, 5, o.elite ? '#ffd060' : '#8ab0ff');
  if (navigator.vibrate) navigator.vibrate(8);
  if (o.hp <= 0) {
    rocks.splice(bestI, 1);
    combo++;
    const pts = Math.round((o.elite ? 120 : o.hard ? 45 : 18) * (1 + Math.floor(combo / 4) * 0.5));
    score += pts;
    burst(o.x, o.y, o.elite ? 28 : 14, o.elite ? '#ffd060' : '#6a90ff');
    if (o.elite || o.hard) sfx.boom();
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
