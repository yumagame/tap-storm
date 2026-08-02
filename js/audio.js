/** WebAudio シンセ — タップの手応え用 */
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._resume = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return Promise.resolve(false);
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'running') return Promise.resolve(true);
    if (!this._resume) {
      this._resume = this.ctx
        .resume()
        .then(() => {
          this._resume = null;
          return this.ctx.state === 'running';
        })
        .catch(() => {
          this._resume = null;
          return false;
        });
    }
    return this._resume;
  }

  _run(fn) {
    this.unlock().then((ok) => {
      if (ok && this.ctx?.state === 'running') fn();
    });
  }

  _tone(type, f0, f1, dur, gain, when = 0) {
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(Math.max(0.001, gain), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.02, dur));
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  tap(combo = 1) {
    this._run(() => {
      const f = 420 + Math.min(combo, 20) * 28;
      this._tone('triangle', f, f * 1.4, 0.07, 0.18);
      this._tone('square', f * 0.5, f * 0.3, 0.05, 0.08);
    });
  }

  boom() {
    this._run(() => {
      this._tone('sawtooth', 90, 35, 0.22, 0.22);
      this._tone('sine', 180, 60, 0.18, 0.12);
    });
  }

  miss() {
    this._run(() => {
      this._tone('sawtooth', 160, 70, 0.18, 0.2);
    });
  }

  wave() {
    this._run(() => {
      [330, 440, 550].forEach((f, i) => this._tone('triangle', f, f * 1.1, 0.14, 0.12, i * 0.06));
    });
  }

  gameOver() {
    this._run(() => {
      this._tone('sawtooth', 220, 80, 0.35, 0.2);
      this._tone('sine', 110, 45, 0.45, 0.15, 0.05);
    });
  }
}
