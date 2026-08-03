const KEY = 'stack-pulse-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = 1, H = 1, dpr = 1;
let running = false;
let best = Number(localStorage.getItem(KEY) || 0);
let stack = []; // {x,w,y}
let cur = null; // moving block
let dir = 1;
let speed = 180;
let baseY = 0;
let camY = 0;
let last = 0;
let locked = false;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  baseY = H * 0.72;
}
window.addEventListener('resize', resize);
resize();

function start() {
  running = true;
  locked = false;
  stack = [{ x: W * 0.5 - 70, w: 140, y: 0 }];
  camY = 0;
  speed = 180;
  newBlock();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('score').textContent = '0';
  document.getElementById('best').textContent = String(best);
}

function newBlock() {
  const prev = stack[stack.length - 1];
  const w = prev.w;
  cur = {
    x: Math.random() < 0.5 ? -w : W,
    w,
    y: stack.length,
  };
  dir = cur.x < 0 ? 1 : -1;
  speed = Math.min(420, 180 + stack.length * 12);
}

function place() {
  if (!running || !cur || locked) return;
  locked = true;
  const prev = stack[stack.length - 1];
  const left = Math.max(cur.x, prev.x);
  const right = Math.min(cur.x + cur.w, prev.x + prev.w);
  const overlap = right - left;
  if (overlap <= 12) {
    end();
    return;
  }
  cur.x = left;
  cur.w = overlap;
  stack.push({ x: cur.x, w: cur.w, y: cur.y });
  cur = null;
  document.getElementById('score').textContent = String(stack.length - 1);
  // camera up
  if (stack.length > 4) camY = (stack.length - 4) * 36;
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  setTimeout(() => {
    if (!running) return;
    newBlock();
    locked = false;
  }, 120);
}

function end() {
  running = false;
  cur = null;
  const height = Math.max(0, stack.length - 1);
  if (height > best) {
    best = height;
    localStorage.setItem(KEY, String(best));
  }
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = String(height);
}

function update(dt) {
  if (!running || !cur) return;
  cur.x += dir * speed * dt;
  if (cur.x <= 8) { cur.x = 8; dir = 1; }
  if (cur.x + cur.w >= W - 8) { cur.x = W - 8 - cur.w; dir = -1; }
}

function blockColor(i) {
  const h = 42 + (i * 12) % 40;
  return `hsl(${h}, 90%, ${52 + (i % 3) * 6}%)`;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(0, camY * 0.15);

  // guide
  const ground = baseY;
  for (let i = 0; i < stack.length; i++) {
    const b = stack[i];
    const y = ground - i * 36;
    ctx.fillStyle = blockColor(i);
    roundRect(b.x, y - 32, b.w, 32, 6);
    ctx.fill();
  }
  if (cur) {
    const y = ground - cur.y * 36;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#ffe080';
    roundRect(cur.x, y - 32, cur.w, 32, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
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
  e.preventDefault();
  place();
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
