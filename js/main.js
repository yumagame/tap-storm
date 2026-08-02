import { Game } from './game.js';
import { Audio } from './audio.js';

const canvas = document.getElementById('game');
const titleScreen = document.getElementById('title-screen');
const resultScreen = document.getElementById('result-screen');
const hud = document.getElementById('hud');

const ui = {
  showHud(v) {
    hud.classList.toggle('hidden', !v);
  },
  setScore(n) {
    document.getElementById('score').textContent = String(n);
  },
  setWave(n) {
    document.getElementById('wave').textContent = String(n);
  },
  setBest(n) {
    document.getElementById('best').textContent = String(n);
  },
  setCombo(n) {
    const el = document.getElementById('combo');
    if (n <= 1) {
      el.classList.remove('show', 'big');
      el.textContent = '×1';
      return;
    }
    el.textContent = `×${n}`;
    el.classList.add('show');
    el.classList.toggle('big', n >= 8);
  },
  setLives(cur, max) {
    const root = document.getElementById('lives');
    root.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < cur ? '' : ' off');
      root.appendChild(pip);
    }
  },
  showResult({ score, wave, maxCombo, newBest }) {
    hud.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('result-eyebrow').textContent = newBest ? 'NEW BEST' : 'GAME OVER';
    document.getElementById('result-title').textContent = String(score);
    document.getElementById('result-sub').textContent = 'SCORE';
    document.getElementById('result-wave').textContent = String(wave);
    document.getElementById('result-combo').textContent = String(maxCombo);
  },
};

const audio = new Audio();
const game = new Game(canvas, ui, audio);
game.attach();

function play() {
  titleScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  audio.unlock();
  game.start();
}

document.getElementById('btn-start').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  play();
});
document.getElementById('btn-again').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  play();
});
document.getElementById('btn-home').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  resultScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  hud.classList.add('hidden');
  game.running = false;
  game.targets = [];
});

// スクロール・引っ張り返しを防止（iOS）
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.target === canvas || canvas.contains(e.target)) e.preventDefault();
  },
  { passive: false }
);
