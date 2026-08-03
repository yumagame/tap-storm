import { Sfx } from '../../shared/sfx.js';

const KEY = 'arena-brawl-best-v1';
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.74);
let W = 1, H = 1, dpr = 1, last = 0;
let run = false, kills = 0, best = +localStorage.getItem(KEY) || 0;
let combo = 0, lives = 3, wave = 1;
let player, foes = [], parts = [], spawnT = 0, waveT = 0, shake = 0, flash = 0, atkCd = 0;
let target = null; // move target

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
  document.getElementById('score').textContent = kills;
  document.getElementById('wave').textContent = wave;
  document.getElementById('best').textContent = best;
  livesUI(); comboUI();
}

function start() {
  sfx.unlock();
  run = true; kills = 0; combo = 0; lives = 3; wave = 1;
  player = { x: W / 2, y: H / 2, r: 16, hp: 100, inv: 0 };
  foes = []; parts = []; spawnT = 0.2; waveT = 14; atkCd = 0; target = null;
  shake = 0; flash = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  hud(); sfx.wave();
}

function over() {
  run = false;
  if (kills > best) { best = kills; localStorage.setItem(KEY, String(best)); }
  sfx.over();
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = kills;
}

function burst(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 200;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, age: 0, col });
  }
}

function spawn() {
  const ang = Math.random() * Math.PI * 2;
  const dist = Math.max(W, H) * 0.55;
  const tank = Math.random() < 0.15 + wave * 0.01;
  foes.push({
    x: W / 2 + Math.cos(ang) * dist,
    y: H / 2 + Math.sin(ang) * dist,
    r: tank ? 22 : 13 + Math.random() * 4,
    hp: tank ? 3 + Math.floor(wave / 3) : 1,
    max: tank ? 3 + Math.floor(wave / 3) : 1,
    speed: (tank ? 45 : 70 + wave * 4) + Math.random() * 20,
    tank,
    hitCd: 0,
  });
}

function hurt() {
  if (player.inv > 0) return;
  lives--; combo = 0; player.inv = 0.8; shake = 0.35; flash = 0.3;
  sfx.bad();
  if (navigator.vibrate) navigator.vibrate(40);
  hud();
  if (lives <= 0) over();
}

function update(dt) {
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter((p) => p.age < p.life);
  if (!run) return;
  waveT -= dt;
  if (waveT <= 0) { wave++; waveT = Math.max(9, 14 - wave * 0.25); sfx.wave(); hud(); flash = 0.2; }
  spawnT -= dt;
  if (spawnT <= 0) {
    const n = 1 + (wave >= 3 ? 1 : 0) + (wave >= 7 && Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawn();
    spawnT = Math.max(0.22, 0.85 - wave * 0.04);
  }
  if (player.inv > 0) player.inv -= dt;
  if (atkCd > 0) atkCd -= dt;
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;

  // move to target
  if (target) {
    const dx = target.x - player.x, dy = target.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) target = null;
    else {
      const sp = 220;
      player.x += (dx / d) * sp * dt;
      player.y += (dy / d) * sp * dt;
    }
  }
  player.x = Math.max(20, Math.min(W - 20, player.x));
  player.y = Math.max(70, Math.min(H - 40, player.y));

  for (const f of foes) {
    const dx = player.x - f.x, dy = player.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    f.x += (dx / d) * f.speed * dt;
    f.y += (dy / d) * f.speed * dt;
    if (f.hitCd > 0) f.hitCd -= dt;
    // collide attack
    if (d < player.r + f.r) {
      if (atkCd <= 0) {
        // player damages foe
        f.hp -= 1;
        atkCd = 0.16;
        burst(f.x, f.y, 6, '#60d0ff');
        sfx.hit(combo);
        if (navigator.vibrate) navigator.vibrate(8);
        if (f.hp <= 0) {
          f.dead = true;
          combo++;
          kills++;
          burst(f.x, f.y, f.tank ? 20 : 12, f.tank ? '#ffd060' : '#ff6060');
          if (f.tank) sfx.boom();
          hud();
        }
      }
      if (f.hitCd <= 0 && player.inv <= 0) {
        f.hitCd = 0.7;
        hurt();
      }
    }
  }
  foes = foes.filter((f) => !f.dead);
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 10 * shake; oy = (Math.random() - .5) * 10 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // arena boundary
  ctx.strokeStyle = 'rgba(100,180,220,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 60, W - 32, H - 100);

  if (target) {
    ctx.strokeStyle = 'rgba(100,200,255,0.35)';
    ctx.beginPath(); ctx.arc(target.x, target.y, 12, 0, Math.PI * 2); ctx.stroke();
  }

  for (const f of foes) {
    ctx.beginPath();
    ctx.fillStyle = f.tank ? '#ffb040' : '#ff5050';
    ctx.shadowColor = f.tank ? '#ffb040' : '#ff5050';
    ctx.shadowBlur = 12;
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (f.hp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(f.x - f.r, f.y - f.r - 8, f.r * 2, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(f.x - f.r, f.y - f.r - 8, f.r * 2 * (f.hp / f.max), 3);
    }
  }

  // player
  const blink = player.inv > 0 && Math.floor(player.inv * 20) % 2 === 0;
  if (!blink) {
    ctx.beginPath();
    ctx.fillStyle = '#60d0ff';
    ctx.shadowColor = '#60d0ff'; ctx.shadowBlur = 16;
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.fillStyle = '#e0f6ff';
    ctx.arc(player.x, player.y, 7, 0, Math.PI * 2); ctx.fill();
  }

  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(255,40,60,${flash * 0.28})`; ctx.fillRect(-10,-10,W+20,H+20); }
  ctx.restore();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  target = { x: e.clientX - r.left, y: e.clientY - r.top };
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
