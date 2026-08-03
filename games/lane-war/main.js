import { Sfx } from './sfx.js';

const KEY = 'lane-war-stage-v1';
const UNITS = {
  inf: { name: '歩兵', cost: 15, hp: 40, dmg: 7, speed: 55, r: 12, cd: 0.2, color: '#40e080' },
  tank: { name: '戦車', cost: 40, hp: 140, dmg: 16, speed: 32, r: 18, cd: 0.45, color: '#70a0c0' },
  elite: { name: '精鋭', cost: 70, hp: 90, dmg: 22, speed: 50, r: 14, cd: 0.6, color: '#ffd060' },
};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const sfx = new Sfx(0.7);
let W = 1, H = 1, dpr = 1, last = 0;
let run = false, stage = Math.max(1, +localStorage.getItem(KEY) || 1);
let gold = 0, gRate = 38, units = [], cd = { inf: 0, tank: 0, elite: 0 };
let pBase, eBase, enemyT = 0, shake = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2.5);
  W = r.width; H = r.height;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function laneY(l) {
  return H * 0.28 + l * (H * 0.16);
}

function start() {
  sfx.unlock();
  run = true;
  gold = 70 + stage * 5;
  gRate = 36 + stage * 1.2;
  units = [];
  cd = { inf: 0, tank: 0, elite: 0 };
  pBase = { hp: 500 + stage * 20, max: 500 + stage * 20, x: 28 };
  eBase = { hp: 420 + stage * 70, max: 420 + stage * 70, x: W - 28 };
  enemyT = 1.2;
  shake = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('stage-label').textContent = `STAGE ${stage}`;
  hud();
  sfx.wave();
}

function end(win) {
  run = false;
  document.getElementById('hud').classList.add('hidden');
  if (win) {
    stage++;
    localStorage.setItem(KEY, String(stage));
    sfx.wave();
    document.getElementById('result-eye').textContent = 'VICTORY';
    document.getElementById('result-eye').style.color = '#50f0a0';
  } else {
    sfx.over();
    document.getElementById('result-eye').textContent = 'DEFEAT';
    document.getElementById('result-eye').style.color = '#ff6050';
  }
  document.getElementById('rs').textContent = String(Math.max(1, stage - (win ? 0 : 0)));
  document.getElementById('result').classList.remove('hidden');
}

function hud() {
  document.getElementById('gold').textContent = Math.floor(gold);
  document.getElementById('ph').style.width = `${(pBase.hp / pBase.max) * 100}%`;
  document.getElementById('eh').style.width = `${(eBase.hp / eBase.max) * 100}%`;
  document.querySelectorAll('#deploy button').forEach((btn) => {
    const id = btn.dataset.u;
    const def = UNITS[id];
    btn.disabled = gold < def.cost || cd[id] > 0;
  });
}

function spawn(team, type, lane) {
  const def = UNITS[type];
  const u = {
    team, type, lane,
    x: team === 'p' ? 50 : W - 50,
    y: laneY(lane),
    hp: def.hp * (team === 'e' ? 1 + stage * 0.08 : 1),
    max: def.hp * (team === 'e' ? 1 + stage * 0.08 : 1),
    dmg: def.dmg * (team === 'e' ? 1 + stage * 0.05 : 1),
    speed: def.speed,
    r: def.r,
    atk: 0,
    color: team === 'p' ? def.color : '#ff7050',
  };
  units.push(u);
  if (team === 'p') sfx.hit(2);
}

function tryDeploy(type) {
  if (!run) return;
  const def = UNITS[type];
  if (gold < def.cost || cd[type] > 0) return;
  gold -= def.cost;
  cd[type] = def.cd;
  const lane = Math.floor(Math.random() * 3);
  spawn('p', type, lane);
  hud();
}

function update(dt) {
  if (!run) return;
  gold += gRate * dt;
  for (const k of Object.keys(cd)) if (cd[k] > 0) cd[k] -= dt;
  enemyT -= dt;
  if (enemyT <= 0) {
    const types = ['inf', 'inf', 'tank', 'elite'];
    const t = types[Math.min(types.length - 1, Math.floor(Math.random() * (2 + Math.min(2, stage / 2))))];
    // pick cheaper scaling
    let type = 'inf';
    if (stage >= 2 && Math.random() < 0.35) type = 'tank';
    if (stage >= 4 && Math.random() < 0.22) type = 'elite';
    if (t === 'tank' && stage >= 2) type = 'tank';
    spawn('e', type, Math.floor(Math.random() * 3));
    enemyT = Math.max(0.55, 1.6 - stage * 0.06);
    if (stage > 5 && Math.random() < 0.3) spawn('e', 'inf', Math.floor(Math.random() * 3));
  }

  for (const u of units) {
    if (u.atk > 0) u.atk -= dt;
    // find target same lane
    let target = null;
    let best = 1e9;
    for (const o of units) {
      if (o.team === u.team) continue;
      if (o.lane !== u.lane) continue;
      const d = Math.abs(o.x - u.x);
      if (d < best && d < u.r + o.r + 28) { best = d; target = o; }
    }
    const base = u.team === 'p' ? eBase : pBase;
    const baseX = base.x;
    const toBase = Math.abs(baseX - u.x);

    if (target) {
      if (u.atk <= 0) {
        u.atk = u.team === 'p' ? 0.55 : 0.6;
        target.hp -= u.dmg;
        if (Math.random() < 0.15) sfx.hit(1);
      }
    } else if (toBase < 40) {
      if (u.atk <= 0) {
        u.atk = 0.7;
        base.hp -= u.dmg;
        sfx.boom();
        shake = 0.15;
      }
    } else {
      const dir = u.team === 'p' ? 1 : -1;
      u.x += dir * u.speed * dt;
    }
  }

  units = units.filter((u) => u.hp > 0);
  if (shake > 0) shake -= dt;
  hud();

  if (eBase.hp <= 0) end(true);
  else if (pBase.hp <= 0) end(false);
}

function draw() {
  let ox = 0, oy = 0;
  if (shake > 0) { ox = (Math.random() - .5) * 8 * shake; oy = (Math.random() - .5) * 6 * shake; }
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(ox, oy);

  // lanes
  for (let l = 0; l < 3; l++) {
    const y = laneY(l);
    ctx.strokeStyle = 'rgba(80,200,140,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
  }
  // bases
  ctx.fillStyle = '#2a8050';
  roundRect(8, H * 0.22, 36, H * 0.45, 8); ctx.fill();
  ctx.fillStyle = '#803030';
  roundRect(W - 44, H * 0.22, 36, H * 0.45, 8); ctx.fill();

  for (const u of units) {
    ctx.beginPath();
    ctx.fillStyle = u.color;
    ctx.shadowColor = u.color; ctx.shadowBlur = 10;
    ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // hp
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(u.x - u.r, u.y - u.r - 7, u.r * 2, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(u.x - u.r, u.y - u.r - 7, u.r * 2 * (u.hp / u.max), 3);
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

document.querySelectorAll('#deploy button').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tryDeploy(btn.dataset.u);
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
  // keep base X updated on resize
  if (run && eBase) { eBase.x = W - 28; }
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
