const KEY = 'flick-out-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = 1, H = 1, dpr = 1, cx = 0, cy = 0;
let running = false, score = 0, best = Number(localStorage.getItem(KEY) || 0);
let threats = [];
let spawnT = 0;
let elapsed = 0;
let last = 0;
let drag = null; // {id, x0, y0}

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2; cy = H / 2;
}
window.addEventListener('resize', resize);
resize();

function start() {
  running = true;
  score = 0;
  threats = [];
  spawnT = 0.3;
  elapsed = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('score').textContent = '0';
  document.getElementById('best').textContent = String(best);
}

function gameOver() {
  running = false;
  if (score > best) {
    best = score;
    localStorage.setItem(KEY, String(best));
  }
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = String(score);
}

function spawn() {
  const ang = Math.random() * Math.PI * 2;
  const dist = Math.max(W, H) * 0.65;
  const x = cx + Math.cos(ang) * dist;
  const y = cy + Math.sin(ang) * dist;
  const speed = 90 + elapsed * 8 + Math.random() * 40;
  const dx = cx - x;
  const dy = cy - y;
  const len = Math.hypot(dx, dy) || 1;
  threats.push({
    id: Math.random().toString(36).slice(2),
    x, y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    r: 18 + Math.random() * 8,
    hit: false,
  });
}

function update(dt) {
  if (!running) return;
  elapsed += dt;
  spawnT -= dt;
  if (spawnT <= 0) {
    spawn();
    if (elapsed > 12 && Math.random() < 0.4) spawn();
    spawnT = Math.max(0.22, 0.9 - elapsed * 0.03);
  }
  const coreR = 28;
  for (const t of threats) {
    if (t.hit) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vx *= 0.99;
      t.vy *= 0.99;
      continue;
    }
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    if (Math.hypot(t.x - cx, t.y - cy) < coreR + t.r * 0.5) {
      gameOver();
      return;
    }
  }
  threats = threats.filter((t) => {
    if (t.hit && (t.x < -80 || t.x > W + 80 || t.y < -80 || t.y > H + 80)) return false;
    return true;
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // core
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40);
  g.addColorStop(0, '#fff0f6');
  g.addColorStop(0.4, '#ff7ab0');
  g.addColorStop(1, 'rgba(255,80,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#ffd0e4';
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  for (const t of threats) {
    ctx.beginPath();
    ctx.fillStyle = t.hit ? 'rgba(255,180,210,0.35)' : '#ff4d8a';
    ctx.shadowColor = 'rgba(255,80,140,0.55)';
    ctx.shadowBlur = t.hit ? 0 : 12;
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function pick(x, y) {
  let best = null;
  let bd = 40;
  for (const t of threats) {
    if (t.hit) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < t.r + 28 && d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!running) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const t = pick(x, y);
  if (!t) return;
  drag = { id: t.id, x0: x, y0: y, t0: performance.now() };
  canvas.setPointerCapture(e.pointerId);
}, { passive: false });

canvas.addEventListener('pointerup', (e) => {
  if (!running || !drag) return;
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const t = threats.find((o) => o.id === drag.id);
  const dx = x - drag.x0;
  const dy = y - drag.y0;
  const dist = Math.hypot(dx, dy);
  if (t && dist > 24) {
    const power = Math.min(900, 280 + dist * 6);
    const len = dist || 1;
    t.vx = (dx / len) * power;
    t.vy = (dy / len) * power;
    t.hit = true;
    score += 15 + Math.floor(dist / 8);
    document.getElementById('score').textContent = String(score);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  }
  drag = null;
});

document.getElementById('start').onclick = start;
document.getElementById('again').onclick = start;
document.getElementById('home').onclick = () => {
  document.getElementById('result').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
};

function loop(t) {
  const dt = Math.min(0.05, ((t - last) / 1000) || 0.016);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
