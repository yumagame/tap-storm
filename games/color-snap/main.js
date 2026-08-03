const KEY = 'color-snap-best-v1';
const COLORS = [
  { name: 'CYAN', hex: '#2ef0c0' },
  { name: 'ORANGE', hex: '#ff8a3d' },
  { name: 'PINK', hex: '#ff6aa8' },
  { name: 'BLUE', hex: '#5aa0ff' },
  { name: 'LIME', hex: '#a8ff4a' },
];

const orb = document.getElementById('orb');
const goal = document.getElementById('target-color');
const msg = document.getElementById('msg');
let running = false;
let score = 0;
let streak = 0;
let best = Number(localStorage.getItem(KEY) || 0);
let goalIdx = 0;
let orbIdx = 0;
let switchEvery = 0.55;
let switchT = 0;
let timeLeft = 30;
let last = 0;
let lock = false;

function setDisplays() {
  document.getElementById('score').textContent = String(score);
  document.getElementById('streak').textContent = String(streak);
  document.getElementById('best').textContent = String(best);
  goal.style.background = COLORS[goalIdx].hex;
  orb.style.background = COLORS[orbIdx].hex;
}

function start() {
  running = true;
  score = 0;
  streak = 0;
  goalIdx = Math.floor(Math.random() * COLORS.length);
  orbIdx = Math.floor(Math.random() * COLORS.length);
  switchEvery = 0.55;
  switchT = 0.2;
  timeLeft = 35;
  lock = false;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  msg.textContent = '色が一致したらタップ！';
  setDisplays();
}

function end() {
  running = false;
  if (score > best) {
    best = score;
    localStorage.setItem(KEY, String(best));
  }
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('rs').textContent = String(score);
}

function onTap() {
  if (!running || lock) return;
  orb.classList.add('pulse');
  setTimeout(() => orb.classList.remove('pulse'), 90);
  if (orbIdx === goalIdx) {
    streak += 1;
    const pts = 10 + streak * 3;
    score += pts;
    msg.textContent = `NICE +${pts}`;
    msg.style.color = '#7cffb0';
    // new goal, speed up a bit
    goalIdx = Math.floor(Math.random() * COLORS.length);
    switchEvery = Math.max(0.22, switchEvery - 0.025);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
  } else {
    streak = 0;
    score = Math.max(0, score - 8);
    msg.textContent = 'ミス…';
    msg.style.color = '#ff7a90';
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
  }
  setDisplays();
}

orb.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  onTap();
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
  if (running) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      end();
    } else {
      switchT -= dt;
      if (switchT <= 0) {
        let next = Math.floor(Math.random() * COLORS.length);
        if (next === orbIdx) next = (next + 1) % COLORS.length;
        // sometimes land on goal intentionally for fairness
        if (Math.random() < 0.28) next = goalIdx;
        orbIdx = next;
        orb.style.background = COLORS[orbIdx].hex;
        switchT = switchEvery * (0.75 + Math.random() * 0.5);
      }
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.getElementById('best').textContent = String(best);
