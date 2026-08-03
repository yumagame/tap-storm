import { Sfx } from './sfx.js';

const KEY = 'skill-raid-stage-v1';
const SKILLS = {
  slash: { name: 'SLASH', cd: 0.45, dmg: [12, 18], color: '#ff80c0' },
  bash: { name: 'BASH', cd: 1.5, dmg: [28, 40], color: '#ffd060' },
  heal: { name: 'HEAL', cd: 4.5, heal: [18, 28], color: '#60ffb0' },
  ult: { name: 'ULT', cd: 8, dmg: [70, 100], color: '#d070ff' },
};
const BOSSES = ['VOID HYDRA', 'IRON COLOSSUS', 'NIGHT SIREN', 'CHAOS ENGINE', 'ABYSS KING'];
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.76);
let W = 1, H = 1, dpr = 1, last = 0;
let run = false, stage = Math.max(1, +localStorage.getItem(KEY) || 1);
let playerHp = 100, playerMax = 100;
let boss, cds = {}, parts = [], shake = 0, bossAtkT = 0, hitFlash = 0, logT = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function log(msg, col = '#fff') {
  const el = document.getElementById('log');
  el.textContent = msg;
  el.style.color = col;
  el.classList.add('show');
  logT = 0.7;
}

function hud() {
  document.getElementById('php').textContent = Math.ceil(playerHp);
  document.getElementById('stage').textContent = stage;
  if (boss) {
    document.getElementById('bname').textContent = boss.name;
    document.getElementById('bhp').style.width = `${Math.max(0, (boss.hp / boss.max) * 100)}%`;
  }
  document.querySelectorAll('#skills button').forEach((btn) => {
    const id = btn.dataset.s;
    const def = SKILLS[id];
    const left = cds[id] || 0;
    btn.disabled = left > 0 || !run;
    const fill = btn.querySelector('.cd');
    fill.style.height = `${(left / def.cd) * 100}%`;
  });
}

function makeBoss() {
  const max = 220 + stage * 90;
  boss = {
    name: BOSSES[(stage - 1) % BOSSES.length],
    hp: max,
    max,
    x: W / 2,
    y: H * 0.38,
    r: Math.min(72, 50 + stage),
    pulse: 0,
  };
  bossAtkT = 1.6;
}

function start() {
  sfx.unlock();
  run = true;
  playerHp = 100; playerMax = 100;
  cds = { slash: 0, bash: 0, heal: 0, ult: 0 };
  parts = []; shake = 0; hitFlash = 0;
  makeBoss();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  hud();
  log('RAID START', '#d070ff');
  sfx.wave();
}

function end(win) {
  run = false;
  document.getElementById('hud').classList.add('hidden');
  if (win) {
    stage++;
    localStorage.setItem(KEY, String(stage));
    sfx.wave();
    document.getElementById('result-eye').textContent = 'RAID CLEAR';
    document.getElementById('result-eye').style.color = '#80ffc0';
  } else {
    sfx.over();
    document.getElementById('result-eye').textContent = 'WIPED';
    document.getElementById('result-eye').style.color = '#ff6080';
  }
  document.getElementById('rs').textContent = String(stage);
  document.getElementById('result').classList.remove('hidden');
}

function burst(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, age: 0, col });
  }
}

function useSkill(id) {
  if (!run || (cds[id] || 0) > 0) return;
  const def = SKILLS[id];
  cds[id] = def.cd;
  if (id === 'heal') {
    const h = def.heal[0] + Math.random() * (def.heal[1] - def.heal[0]);
    playerHp = Math.min(playerMax, playerHp + h);
    log(`HEAL +${Math.round(h)}`, '#60ffb0');
    sfx.wave();
  } else {
    let dmg = def.dmg[0] + Math.random() * (def.dmg[1] - def.dmg[0]);
    dmg *= 1 + (stage - 1) * 0.03;
    // crit
    if (Math.random() < 0.15) { dmg *= 1.6; log('CRIT!', '#ffd060'); }
    else log(def.name, def.color);
    boss.hp -= dmg;
    hitFlash = 0.12;
    shake = id === 'ult' ? 0.4 : 0.2;
    burst(boss.x + (Math.random() - .5) * 40, boss.y + (Math.random() - .5) * 30, id === 'ult' ? 30 : 12, def.color);
    if (id === 'ult') sfx.boom(); else sfx.hit(6);
    if (navigator.vibrate) navigator.vibrate(id === 'ult' ? [12, 20, 12] : 10);
    if (boss.hp <= 0) {
      burst(boss.x, boss.y, 40, '#f0a0ff');
      end(true);
      return;
    }
  }
  hud();
}

function update(dt) {
  if (logT > 0) {
    logT -= dt;
    if (logT <= 0) document.getElementById('log').classList.remove('show');
  }
  for (const p of parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter((p) => p.age < p.life);
  if (!run) return;
  for (const k of Object.keys(cds)) if (cds[k] > 0) cds[k] = Math.max(0, cds[k] - dt);
  if (boss) boss.pulse += dt * 4;
  if (hitFlash > 0) hitFlash -= dt;
  if (shake > 0) shake -= dt;

  bossAtkT -= dt;
  if (bossAtkT <= 0 && boss) {
    // boss pattern
    const pattern = Math.random();
    let dmg = 8 + stage * 1.8;
    if (pattern < 0.25) {
      dmg *= 1.8;
      log('BOSS SMASH', '#ff6070');
      sfx.boom();
    } else if (pattern < 0.5) {
      dmg *= 0.7;
      // double hit soon
      bossAtkT = 0.35;
      log('COMBO HIT', '#ff90a0');
      sfx.bad();
    } else {
      log('BOSS ATTACK', '#ff80a0');
      sfx.bad();
    }
    playerHp -= dmg;
    shake = 0.3;
    if (navigator.vibrate) navigator.vibrate(35);
    if (playerHp <= 0) {
      playerHp = 0;
      end(false);
      return;
    }
    if (bossAtkT <= 0) bossAtkT = Math.max(0.9, 2.1 - stage * 0.06) + Math.random() * 0.5;
  }
  hud();
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 12 * shake; oy = (Math.random() - .5) * 10 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);

  // ground
  ctx.fillStyle = 'rgba(80,40,100,0.25)';
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.62, W * 0.32, 40, 0, 0, Math.PI * 2); ctx.fill();

  // player avatar bottom
  ctx.beginPath();
  ctx.fillStyle = '#80c0ff';
  ctx.arc(W / 2, H * 0.7, 18, 0, Math.PI * 2); ctx.fill();

  if (boss) {
    const p = 1 + Math.sin(boss.pulse) * 0.04 + (hitFlash > 0 ? 0.08 : 0);
    const g = ctx.createRadialGradient(boss.x, boss.y, 8, boss.x, boss.y, boss.r * 1.4 * p);
    g.addColorStop(0, hitFlash > 0 ? '#fff' : '#f0d0ff');
    g.addColorStop(0.45, '#c050ff');
    g.addColorStop(1, 'rgba(80,20,120,0)');
    ctx.beginPath(); ctx.fillStyle = g; ctx.arc(boss.x, boss.y, boss.r * 1.3 * p, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = hitFlash > 0 ? '#fff' : '#a030e0';
    ctx.shadowColor = '#d070ff'; ctx.shadowBlur = 24;
    ctx.arc(boss.x, boss.y, boss.r * p, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // horns
    ctx.fillStyle = '#301040';
    ctx.beginPath();
    ctx.moveTo(boss.x - boss.r * 0.6, boss.y - boss.r * 0.4);
    ctx.lineTo(boss.x - boss.r * 1.1, boss.y - boss.r * 1.1);
    ctx.lineTo(boss.x - boss.r * 0.2, boss.y - boss.r * 0.55);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.r * 0.6, boss.y - boss.r * 0.4);
    ctx.lineTo(boss.x + boss.r * 1.1, boss.y - boss.r * 1.1);
    ctx.lineTo(boss.x + boss.r * 0.2, boss.y - boss.r * 0.55);
    ctx.fill();
  }

  for (const p of parts) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5 * a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

document.querySelectorAll('#skills button').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    useSkill(btn.dataset.s);
  });
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
  if (boss) { boss.x = W / 2; boss.y = H * 0.38; }
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
