const KEY = 'dodge-drop-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = 1, H = 1, dpr = 1;
let running = false, score = 0, best = Number(localStorage.getItem(KEY) || 0);
let lane = 1; // 0 1 2
let playerY = 0;
let obstacles = [];
let spawnT = 0;
let speed = 220;
let elapsed = 0;
let last = 0;
let flash = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  playerY = H * 0.82;
}
window.addEventListener('resize', resize);
resize();

function laneX(i) {
  const pad = 28;
  const usable = W - pad * 2;
  return pad + usable * ((i + 0.5) / 3);
}

function start() {
  running = true;
  score = 0;
  lane = 1;
  obstacles = [];
  spawnT = 0.4;
  speed = 240;
  elapsed = 0;
  flash = 0;
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
  // 1 or 2 lanes blocked
  const blocked = new Set();
  blocked.add(Math.floor(Math.random() * 3));
  if (Math.random() < 0.35 + Math.min(0.4, elapsed * 0.02)) {
    let b = Math.floor(Math.random() * 3);
    if (blocked.has(b)) b = (b + 1) % 3;
    blocked.add(b);
  }
  // never block all 3
  if (blocked.size >= 3) blocked.delete(0);
  for (const l of blocked) {
    obstacles.push({
      lane: l,
      y: -40,
      h: 36 + Math.random() * 20,
      w: (W / 3) * 0.72,
    });
  }
}

function update(dt) {
  if (!running) return;
  elapsed += dt;
  speed = 240 + elapsed * 12 + score * 0.8;
  spawnT -= dt;
  if (spawnT <= 0) {
    spawn();
    spawnT = Math.max(0.28, 0.85 - elapsed * 0.025);
  }
  for (const o of obstacles) o.y += speed * dt;
  obstacles = obstacles.filter((o) => o.y < H + 80);

  // collision
  const px = laneX(lane);
  const pr = 22;
  for (const o of obstacles) {
    if (o.lane !== lane) continue;
    const ox = laneX(o.lane);
    const half = o.w / 2;
    if (Math.abs(px - ox) < half + pr * 0.35 && Math.abs(playerY - (o.y + o.h / 2)) < pr + o.h / 2) {
      flash = 0.35;
      gameOver();
      return;
    }
  }

  // score by time / dodge
  score += Math.floor(dt * 40 + speed * dt * 0.05);
  document.getElementById('score').textContent = String(score);
  if (flash > 0) flash -= dt;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // lanes
  for (let i = 0; i < 3; i++) {
    const x = laneX(i);
    ctx.strokeStyle = 'rgba(255,140,60,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, H - 20);
    ctx.stroke();
  }
  // obstacles
  for (const o of obstacles) {
    const x = laneX(o.lane);
    const g = ctx.createLinearGradient(x, o.y, x, o.y + o.h);
    g.addColorStop(0, '#ff6a2e');
    g.addColorStop(1, '#a03010');
    ctx.fillStyle = g;
    roundRect(x - o.w / 2, o.y, o.w, o.h, 10);
    ctx.fill();
  }
  // player
  const px = laneX(lane);
  ctx.beginPath();
  ctx.fillStyle = '#ffe0a0';
  ctx.shadowColor = 'rgba(255,180,50,0.6)';
  ctx.shadowBlur = 16;
  ctx.arc(px, playerY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.fillStyle = '#ff8a3d';
  ctx.arc(px, playerY, 10, 0, Math.PI * 2);
  ctx.fill();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,40,20,${flash * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!running) return;
  e.preventDefault();
  const x = e.clientX - canvas.getBoundingClientRect().left;
  if (x < W / 2) lane = Math.max(0, lane - 1);
  else lane = Math.min(2, lane + 1);
}, { passive: false });

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
