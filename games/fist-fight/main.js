import { Sfx } from './sfx.js';

const KEY = 'fist-fight-wins-v1';
const NAMES = ['SCRAPPER', 'IRON JAW', 'SHADOW', 'BRAWLER', 'KINGPIN'];
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.78);
let W = 1, H = 1, dpr = 1, last = 0;
let run = false, wins = +localStorage.getItem(KEY) || 0, round = 1;
let player, enemy, blockT = 0, spCharge = 0, hitFx = [], msgT = 0;
let enemyAtkCd = 0, playerStun = 0, enemyStun = 0, shake = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function flash(text, col = '#fff') {
  const m = document.getElementById('msg');
  m.textContent = text;
  m.style.color = col;
  m.classList.add('show');
  msgT = 0.55;
}

function fighter(isPlayer) {
  return {
    hp: 100, max: 100,
    x: isPlayer ? W * 0.32 : W * 0.68,
    y: H * 0.48,
    punch: 0,
    hurt: 0,
    guard: false,
    isPlayer,
  };
}

function start() {
  sfx.unlock();
  run = true;
  round = wins + 1;
  player = fighter(true);
  enemy = fighter(false);
  enemy.name = NAMES[(round - 1) % NAMES.length];
  // scale enemy with wins
  enemy.max = 100 + Math.min(80, wins * 12);
  enemy.hp = enemy.max;
  blockT = 0; spCharge = 0; enemyAtkCd = 1.2; playerStun = 0; enemyStun = 0;
  hitFx = []; shake = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('battle-ui').classList.remove('hidden');
  document.getElementById('enemy-name').textContent = enemy.name;
  document.getElementById('round').textContent = `R${round}`;
  document.getElementById('btn-special').disabled = true;
  hud();
  flash('FIGHT!', '#ffd060');
  sfx.wave();
}

function hud() {
  document.getElementById('php').style.width = `${(player.hp / player.max) * 100}%`;
  document.getElementById('ehp').style.width = `${(enemy.hp / enemy.max) * 100}%`;
  document.getElementById('btn-special').disabled = spCharge < 100;
}

function end(win) {
  run = false;
  document.getElementById('battle-ui').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  if (win) {
    wins++;
    localStorage.setItem(KEY, String(wins));
    sfx.wave();
    document.getElementById('result-eye').textContent = 'YOU WIN';
    document.getElementById('result-eye').style.color = '#50ff90';
  } else {
    sfx.over();
    document.getElementById('result-eye').textContent = 'YOU LOSE';
    document.getElementById('result-eye').style.color = '#ff6050';
  }
  document.getElementById('rs').textContent = String(wins);
  document.getElementById('result-sub').textContent = 'total wins';
  document.getElementById('result').classList.remove('hidden');
}

function damage(target, amount, guarded) {
  let dmg = amount;
  if (target.guard || (target.isPlayer && blockT > 0)) {
    dmg = Math.max(1, Math.round(amount * 0.25));
    flash('BLOCK', '#80c0ff');
  }
  target.hp = Math.max(0, target.hp - dmg);
  target.hurt = 0.2;
  shake = 0.25;
  if (target.isPlayer) playerStun = 0.08;
  else enemyStun = 0.12;
  hitFx.push({ x: target.x, y: target.y - 40, t: 0.4, text: `-${dmg}` });
  sfx.hit(Math.min(10, Math.round(amount / 4)));
  if (navigator.vibrate) navigator.vibrate(target.isPlayer ? 30 : 12);
  hud();
  if (player.hp <= 0) end(false);
  else if (enemy.hp <= 0) end(true);
}

function punch(who) {
  if (!run) return;
  if (who.isPlayer && playerStun > 0) return;
  if (!who.isPlayer && enemyStun > 0) return;
  who.punch = 0.18;
  const target = who.isPlayer ? enemy : player;
  // always connect at this range (arena is fixed)
  const base = who.isPlayer ? 9 + Math.random() * 4 : 7 + wins * 0.4 + Math.random() * 3;
  damage(target, base, target.guard);
  if (who.isPlayer) {
    spCharge = Math.min(100, spCharge + 12 + Math.random() * 6);
    document.getElementById('btn-special').disabled = spCharge < 100;
  }
  hud();
}

function special() {
  if (!run || spCharge < 100 || playerStun > 0) return;
  spCharge = 0;
  player.punch = 0.28;
  damage(enemy, 28 + wins * 1.5, false);
  flash('SPECIAL!', '#ffd060');
  sfx.boom();
  document.getElementById('btn-special').disabled = true;
  hud();
}

function update(dt) {
  if (msgT > 0) {
    msgT -= dt;
    if (msgT <= 0) document.getElementById('msg').classList.remove('show');
  }
  if (!run) return;
  if (blockT > 0) blockT -= dt;
  player.guard = blockT > 0;
  if (player.punch > 0) player.punch -= dt;
  if (enemy.punch > 0) enemy.punch -= dt;
  if (player.hurt > 0) player.hurt -= dt;
  if (enemy.hurt > 0) enemy.hurt -= dt;
  if (playerStun > 0) playerStun -= dt;
  if (enemyStun > 0) enemyStun -= dt;
  if (shake > 0) shake -= dt;

  // AI
  enemyAtkCd -= dt;
  if (enemyAtkCd <= 0 && enemyStun <= 0) {
    const roll = Math.random();
    if (roll < 0.18) {
      enemy.guard = true;
      setTimeout(() => { if (enemy) enemy.guard = false; }, 350);
      enemyAtkCd = 0.55;
    } else {
      enemy.guard = false;
      punch(enemy);
      enemyAtkCd = Math.max(0.45, 1.05 - wins * 0.04) + Math.random() * 0.35;
    }
  }

  for (const f of hitFx) f.t -= dt;
  hitFx = hitFx.filter((f) => f.t > 0);

  // passive SP regen while blocking? small
  if (blockT > 0) {
    spCharge = Math.min(100, spCharge + dt * 18);
    document.getElementById('btn-special').disabled = spCharge < 100;
  }
}

function body(f, col) {
  const lean = f.punch > 0 ? (f.isPlayer ? 18 : -18) : f.hurt > 0 ? (f.isPlayer ? -8 : 8) : 0;
  const x = f.x + lean;
  const y = f.y;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(f.x, H * 0.72, 36, 10, 0, 0, Math.PI * 2); ctx.fill();
  // torso
  ctx.fillStyle = f.hurt > 0 ? '#fff' : col;
  roundRect(x - 28, y - 50, 56, 70, 12); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(x, y - 70, 24, 0, Math.PI * 2); ctx.fill();
  // fist
  if (f.punch > 0) {
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath();
    ctx.arc(x + (f.isPlayer ? 48 : -48), y - 20, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // guard arms
  if (f.guard || (f.isPlayer && blockT > 0)) {
    ctx.fillStyle = '#c0d0e0';
    roundRect(x - 34, y - 40, 18, 40, 8); ctx.fill();
    roundRect(x + 16, y - 40, 18, 40, 8); ctx.fill();
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

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 10 * shake; oy = (Math.random() - .5) * 8 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);
  // ring floor
  ctx.fillStyle = 'rgba(80,30,30,0.35)';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.72, W * 0.38, 48, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,180,120,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.72, W * 0.38, 48, 0, 0, Math.PI * 2); ctx.stroke();

  if (player) body(player, '#4080ff');
  if (enemy) body(enemy, '#ff5040');

  ctx.fillStyle = '#ffe0a0';
  ctx.font = 'bold 18px Orbitron,sans-serif';
  ctx.textAlign = 'center';
  for (const f of hitFx) {
    ctx.globalAlpha = Math.max(0, f.t / 0.4);
    ctx.fillText(f.text, f.x, f.y - (0.4 - f.t) * 30);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

document.getElementById('btn-punch').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!run) return;
  punch(player);
});
document.getElementById('btn-block').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!run) return;
  blockT = 0.45;
  sfx.hit(1);
});
document.getElementById('btn-special').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  special();
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
