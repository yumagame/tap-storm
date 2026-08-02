/**
 * TAP STORM — スマホ専用タップアクション
 * 光る玉が膨らむ前にタップ、連打でコンボ
 */

const BEST_KEY = 'tap-storm-best-v1';
const MAX_LIVES = 3;

function loadBest() {
  return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
}

function saveBest(n) {
  localStorage.setItem(BEST_KEY, String(n));
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class Game {
  constructor(canvas, ui, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.audio = audio;

    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.running = false;
    this.targets = [];
    this.particles = [];
    this.flash = 0;
    this.shake = 0;
    this.score = 0;
    this.best = loadBest();
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.elapsed = 0;
    this._raf = 0;
    this._last = 0;

    this._onPointer = this._onPointer.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  attach() {
    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointer, { passive: false });
    this._onResize();
    this.ui.setBest(this.best);
    this._loop(performance.now());
  }

  _onResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    this.running = true;
    this.targets = [];
    this.particles = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.spawnTimer = 0.35;
    this.waveTimer = 18;
    this.elapsed = 0;
    this.flash = 0;
    this.shake = 0;
    this.ui.showHud(true);
    this.ui.setScore(0);
    this.ui.setWave(1);
    this.ui.setCombo(0);
    this.ui.setLives(this.lives, MAX_LIVES);
    this.ui.setBest(this.best);
    this.audio.wave();
  }

  stopToResult() {
    this.running = false;
    const newBest = this.score > this.best;
    if (newBest) {
      this.best = this.score;
      saveBest(this.best);
    }
    this.audio.gameOver();
    this.ui.showResult({
      score: this.score,
      wave: this.wave,
      maxCombo: this.maxCombo,
      best: this.best,
      newBest,
    });
  }

  _difficulty() {
    const w = this.wave;
    return {
      spawnEvery: Math.max(0.32, 1.05 - w * 0.045),
      life: Math.max(0.85, 2.1 - w * 0.06),
      minR: Math.max(26, 40 - w * 0.6),
      maxR: Math.max(48, 70 - w * 0.8),
      multi: w >= 4 && Math.random() < Math.min(0.45, 0.12 + w * 0.03) ? 2 : 1,
      special: Math.random() < 0.12 + Math.min(0.12, w * 0.01),
    };
  }

  _spawn() {
    const d = this._difficulty();
    const count = d.multi;
    const pad = 48;
    const safeTop = 90;
    const safeBot = 70;

    for (let i = 0; i < count; i++) {
      const maxR = d.maxR;
      const x = rand(pad + maxR, this.w - pad - maxR);
      const y = rand(safeTop + maxR, this.h - safeBot - maxR);
      // avoid stacking too tightly
      let ok = true;
      for (const t of this.targets) {
        if (Math.hypot(t.x - x, t.y - y) < (t.maxR + maxR) * 0.75) {
          ok = false;
          break;
        }
      }
      if (!ok && this.targets.length > 0) continue;

      const special = d.special && i === 0;
      this.targets.push({
        x,
        y,
        r: d.minR * 0.55,
        minR: d.minR,
        maxR: special ? maxR * 1.15 : maxR,
        life: special ? d.life * 0.85 : d.life,
        age: 0,
        special,
        hue: special ? 42 : pick([160, 172, 188, 200]),
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  _onPointer(e) {
    if (!this.running) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // hit largest overlapping / closest center first
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      const dist = Math.hypot(t.x - x, t.y - y);
      const hitR = t.r + 14; // slightly generous finger radius
      if (dist <= hitR && dist < bestScore) {
        bestScore = dist;
        best = i;
      }
    }

    if (best == null) {
      // soft miss: only hurt combo, not life
      this.combo = 0;
      this.ui.setCombo(0);
      return;
    }

    const t = this.targets[best];
    this.targets.splice(best, 1);
    this._pop(t, true);
  }

  _pop(t, success) {
    if (!success) {
      this.audio.miss();
      this.combo = 0;
      this.ui.setCombo(0);
      this.lives -= 1;
      this.ui.setLives(this.lives, MAX_LIVES);
      this.shake = 0.35;
      this.flash = 0.25;
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      this._burst(t.x, t.y, t.hue, 10, true);
      if (this.lives <= 0) this.stopToResult();
      return;
    }

    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = 1 + Math.floor((this.combo - 1) / 3) * 0.5;
    const base = t.special ? 80 : 25;
    // faster tap (younger age ratio) = bonus
    const speedBonus = Math.round((1 - t.age / t.life) * 40);
    const pts = Math.round((base + speedBonus) * mult * (t.special ? 1.5 : 1));
    this.score += pts;
    this.ui.setScore(this.score);
    this.ui.setCombo(this.combo);
    this.audio.tap(this.combo);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(t.special ? [12, 20, 12] : 10);
    }
    this._burst(t.x, t.y, t.hue, t.special ? 22 : 14, false);
    this.flash = Math.min(0.2, this.flash + 0.08);
  }

  _burst(x, y, hue, n, bad) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(40, bad ? 120 : 220);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.55),
        age: 0,
        r: rand(2, 5),
        hue: bad ? 0 : hue,
        bad,
      });
    }
  }

  _update(dt) {
    // ambient idle on title still drawn lightly
    if (!this.running) {
      this._updateParticles(dt);
      return;
    }

    this.elapsed += dt;
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.wave += 1;
      this.waveTimer = Math.max(12, 18 - this.wave * 0.3);
      this.ui.setWave(this.wave);
      this.audio.wave();
      this.flash = 0.35;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawn();
      this.spawnTimer = this._difficulty().spawnEvery;
    }

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.age += dt;
      t.pulse += dt * 8;
      const p = Math.min(1, t.age / t.life);
      t.r = t.minR + (t.maxR - t.minR) * p;
      if (t.age >= t.life) {
        this.targets.splice(i, 1);
        this._pop(t, false);
      }
    }

    this._updateParticles(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      if (p.age >= p.life) this.particles.splice(i, 1);
    }
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    let ox = 0;
    let oy = 0;
    if (this.shake > 0) {
      ox = (Math.random() - 0.5) * 10 * this.shake;
      oy = (Math.random() - 0.5) * 10 * this.shake;
    }

    ctx.clearRect(0, 0, w, h);

    // soft vignette field
    ctx.save();
    ctx.translate(ox, oy);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.5, h * 0.75);
    g.addColorStop(0, 'rgba(30, 70, 90, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // subtle scanlines feel via grid dots
    ctx.fillStyle = 'rgba(100, 160, 180, 0.04)';
    for (let y = 0; y < h; y += 28) {
      for (let x = 0; x < w; x += 28) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    for (const t of this.targets) {
      this._drawTarget(t);
    }

    for (const p of this.particles) {
      const a = 1 - p.age / p.life;
      ctx.beginPath();
      ctx.fillStyle = p.bad
        ? `rgba(255, 70, 90, ${a})`
        : `hsla(${p.hue}, 90%, 60%, ${a})`;
      ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 230, 180, ${this.flash * 0.25})`;
      ctx.fillRect(-10, -10, w + 20, h + 20);
    }

    ctx.restore();
  }

  _drawTarget(t) {
    const ctx = this.ctx;
    const danger = t.age / t.life;
    const pulse = 1 + Math.sin(t.pulse) * 0.04;
    const r = t.r * pulse;

    // outer ring (time)
    ctx.beginPath();
    ctx.strokeStyle = t.special
      ? `hsla(42, 100%, 60%, ${0.35 + danger * 0.4})`
      : `hsla(${t.hue}, 80%, 55%, ${0.3 + danger * 0.45})`;
    ctx.lineWidth = 3;
    ctx.arc(t.x, t.y, t.maxR + 4, 0, Math.PI * 2);
    ctx.stroke();

    // arc countdown
    ctx.beginPath();
    ctx.strokeStyle = danger > 0.7 ? '#ff3d5a' : t.special ? '#ffc14d' : `hsl(${t.hue}, 90%, 60%)`;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.arc(t.x, t.y, t.maxR + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - danger));
    ctx.stroke();

    // core glow
    const glow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r * 1.35);
    if (t.special) {
      glow.addColorStop(0, 'rgba(255, 230, 140, 0.95)');
      glow.addColorStop(0.4, 'rgba(255, 160, 40, 0.55)');
      glow.addColorStop(1, 'rgba(255, 120, 0, 0)');
    } else {
      glow.addColorStop(0, `hsla(${t.hue}, 100%, 75%, 0.95)`);
      glow.addColorStop(0.45, `hsla(${t.hue}, 90%, 50%, 0.45)`);
      glow.addColorStop(1, `hsla(${t.hue}, 90%, 40%, 0)`);
    }
    ctx.beginPath();
    ctx.fillStyle = glow;
    ctx.arc(t.x, t.y, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // solid body
    ctx.beginPath();
    ctx.fillStyle = t.special ? '#ffcc55' : `hsl(${t.hue}, 85%, 55%)`;
    ctx.arc(t.x, t.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // highlight
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.arc(t.x - r * 0.15, t.y - r * 0.15, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  _loop(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000 || 0.016);
    this._last = now;
    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }
}
