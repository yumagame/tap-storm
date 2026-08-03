import { Sfx } from '../../shared/sfx.js';

const KEY = 'boss-mash-best-v1';
const NAMES = ['VOID TITAN', 'HEX QUEEN', 'ROAR KNIGHT', 'PULSE DRAGON', 'NIGHT GEAR'];
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.76);
let W = 1, H = 1, dpr = 1;
let run = false, score = 0, best = +localStorage.getItem(KEY) || 0;
let combo = 0, lives = 3, stage = 1;
let boss = null, adds = [], parts = [], spawnT = 0, last = 0, shake = 0, flash = 0, dpsBoost = 1;

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
function bossUI() {
  if (!boss) return;
  document.getElementById('bossname').textContent = boss.name;
  document.getElementById('bhp').style.width = `${Math.max(0, (boss.hp / boss.max) * 100)}%`;
}
function hud() {
  document.getElementById('score').textContent = score;
  document.getElementById('wave').textContent = stage;
  document.getElementById('best').textContent = best;
  livesUI(); comboUI(); bossUI();
}

function makeBoss() {
  const max = 80 + stage * 55 + stage * stage * 8;
  boss = {
    name: NAMES[(stage - 1) % NAMES.length] + (stage > 5 ? ` ${stage}` : ''),
    x: W / 2,
    y: H * 0.36,
    r: Math.min(70, 48 + stage * 2),
    hp: max,
    max,
    pulse: 0,
    hitFlash: 0,
  };
  document.getElementById('bossname').classList.remove('hidden');
  document.getElementById('bossbar').classList.remove('hidden');
  bossUI();
}

function start() {
  sfx.unlock();
  run = true; score = 0; combo = 0; lives = 3; stage = 1; dpsBoost = 1;
  adds = []; parts = []; spawnT = 0.25; shake = 0; flash = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  makeBoss();
  hud(); sfx.wave();
}

function over() {
  run = false;
  if (score > best) { best = score; localStorage.setItem(KEY, String(best)); }
  sfx.over();
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('bossname').classList.add('hidden');
  document.getElementById('bossbar').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = score;
}

function burst(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 260;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, age: 0, col });
  }
}

function hurt() {
  lives--; combo = Math.max(0, combo - 3); dpsBoost = 1;
  shake = 0.4; flash = 0.35; sfx.bad();
  if (navigator.vibrate) navigator.vibrate(40);
  hud();
  if (lives <= 0) over();
}

function spawnAdd() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -20; }
  else if (side === 1) { x = W + 20; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }
  adds.push({
    x, y,
    r: 14 + Math.random() * 6,
    speed: 100 + stage * 12 + Math.random() * 40,
    hp: 1 + (stage > 4 && Math.random() < 0.25 ? 1 : 0),
  });
}

function update(dt) {
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.age < p.life);
  if (!run || !boss) return;
  boss.pulse += dt * 5;
  if (boss.hitFlash > 0) boss.hitFlash -= dt;
  spawnT -= dt;
  if (spawnT <= 0) {
    const n = 1 + (stage >= 3 ? 1 : 0) + (stage >= 6 && Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnAdd();
    spawnT = Math.max(0.18, 0.7 - stage * 0.04);
  }
  // adds rush player zone (bottom area represents vulnerability) — actually rush boss? Better: rush bottom hotspot that is "you"
  // design: adds rush toward center bottom "shield" - for simplicity they rush boss location from outside then if near player pocket damage
  // simpler: adds rush toward bottom center safe zone (player)
  const px = W / 2, py = H * 0.82;
  for (let i = adds.length - 1; i >= 0; i--) {
    const a = adds[i];
    const dx = px - a.x, dy = py - a.y;
    const d = Math.hypot(dx, dy) || 1;
    a.x += (dx / d) * a.speed * dt;
    a.y += (dy / d) * a.speed * dt;
    if (d < 28 + a.r) {
      adds.splice(i, 1);
      burst(a.x, a.y, 10, '#ff60a0');
      hurt();
    }
  }
  // slow score drip while alive
  score += Math.floor(dt * 5 * stage);
  document.getElementById('score').textContent = score;
  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 12 * shake; oy = (Math.random() - .5) * 12 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);

  // player zone
  const px = W / 2, py = H * 0.82;
  ctx.beginPath();
  ctx.fillStyle = 'rgba(224,96,255,0.12)';
  ctx.arc(px, py, 36, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#f0c0ff';
  ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();

  if (boss) {
    const pulse = 1 + Math.sin(boss.pulse) * 0.04 + (boss.hitFlash > 0 ? 0.06 : 0);
    const g = ctx.createRadialGradient(boss.x, boss.y, 10, boss.x, boss.y, boss.r * 1.4 * pulse);
    g.addColorStop(0, boss.hitFlash > 0 ? '#ffffff' : '#ffd0ff');
    g.addColorStop(0.4, '#e060ff');
    g.addColorStop(1, 'rgba(120,20,180,0)');
    ctx.beginPath(); ctx.fillStyle = g; ctx.arc(boss.x, boss.y, boss.r * 1.35 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = boss.hitFlash > 0 ? '#fff' : '#c040ff';
    ctx.shadowColor = '#e060ff'; ctx.shadowBlur = 22;
    ctx.arc(boss.x, boss.y, boss.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // eye
    ctx.fillStyle = '#1a0820';
    ctx.beginPath(); ctx.arc(boss.x - boss.r * 0.28, boss.y - boss.r * 0.1, boss.r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(boss.x + boss.r * 0.28, boss.y - boss.r * 0.1, boss.r * 0.12, 0, Math.PI * 2); ctx.fill();
  }

  for (const a of adds) {
    ctx.beginPath();
    ctx.fillStyle = '#ff60a8';
    ctx.shadowColor = '#ff60a8'; ctx.shadowBlur = 10;
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(255,40,120,${flash * 0.3})`; ctx.fillRect(-10,-10,W+20,H+20); }
  ctx.restore();
}

function nextStage() {
  stage++;
  dpsBoost = 1;
  combo = Math.min(combo, 5);
  adds = [];
  score += 200 * stage;
  makeBoss();
  sfx.wave();
  flash = 0.35;
  hud();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!run) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;

  // adds first (priority)
  let bi = -1, bd = 1e9;
  for (let i = 0; i < adds.length; i++) {
    const a = adds[i];
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < a.r + 20 && d < bd) { bd = d; bi = i; }
  }
  if (bi >= 0) {
    const a = adds[bi];
    a.hp -= 1;
    burst(a.x, a.y, 6, '#ff90c0');
    sfx.hit(combo);
    if (a.hp <= 0) {
      adds.splice(bi, 1);
      combo++;
      dpsBoost = Math.min(3.5, dpsBoost + 0.08);
      score += Math.round(25 * (1 + combo * 0.1));
      burst(a.x, a.y, 12, '#ff60a8');
    }
    if (navigator.vibrate) navigator.vibrate(8);
    hud();
    return;
  }

  if (boss && Math.hypot(boss.x - x, boss.y - y) < boss.r + 28) {
    const dmg = Math.round((4 + stage) * dpsBoost * (1 + Math.min(2, combo * 0.05)));
    boss.hp -= dmg;
    boss.hitFlash = 0.08;
    combo++;
    dpsBoost = Math.min(3.5, dpsBoost + 0.025);
    score += Math.round(dmg * 2);
    sfx.hit(combo);
    burst(x, y, 8, '#e060ff');
    if (navigator.vibrate) navigator.vibrate(6);
    if (boss.hp <= 0) {
      burst(boss.x, boss.y, 40, '#f0a0ff');
      sfx.boom();
      score += 500 + stage * 150;
      nextStage();
    }
    hud();
  } else {
    combo = Math.max(0, combo - 1);
    comboUI();
  }
}, { passive: false });

document.getElementById('start').onclick = start;
document.getElementById('again').onclick = start;
document.getElementById('home').onclick = () => {
  document.getElementById('result').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
  document.getElementById('bossname').classList.add('hidden');
  document.getElementById('bossbar').classList.add('hidden');
};

function loop(t) {
  const dt = Math.min(0.05, ((t - last) / 1000) || 0.016);
  last = t; update(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.getElementById('best').textContent = best;
