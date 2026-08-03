/** 共通 WebAudio SE */
export class Sfx {
  constructor(vol = 0.72) {
    this.ctx = null;
    this.master = null;
    this._p = null;
    this.vol = vol;
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return Promise.resolve(false);
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'running') return Promise.resolve(true);
    if (!this._p) {
      this._p = this.ctx.resume().then(() => {
        this._p = null;
        return this.ctx.state === 'running';
      }).catch(() => { this._p = null; return false; });
    }
    return this._p;
  }
  _run(fn) {
    this.unlock().then((ok) => { if (ok) try { fn(); } catch {} });
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
    o.start(t); o.stop(t + dur + 0.03);
  }
  hit(c = 1) {
    this._run(() => {
      const f = 360 + Math.min(c, 24) * 22;
      this._tone('triangle', f, f * 1.5, 0.06, 0.2);
      this._tone('square', f * 0.45, f * 0.25, 0.045, 0.08);
    });
  }
  boom() {
    this._run(() => {
      this._tone('sawtooth', 100, 35, 0.25, 0.28);
      this._tone('sine', 60, 30, 0.3, 0.18);
    });
  }
  bad() {
    this._run(() => this._tone('sawtooth', 180, 70, 0.2, 0.22));
  }
  wave() {
    this._run(() => [400, 520, 660].forEach((f, i) => this._tone('triangle', f, f * 1.1, 0.12, 0.12, i * 0.05)));
  }
  over() {
    this._run(() => {
      this._tone('sawtooth', 220, 70, 0.4, 0.22);
      this._tone('sine', 110, 40, 0.45, 0.16, 0.05);
    });
  }
}
