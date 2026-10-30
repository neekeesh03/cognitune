// Lagomo's own lofi. Generated live in the browser with the Web Audio API, so there are no licensing issues,
// no downloads and it never repeats exactly. Soft chords, a lazy swung beat, vinyl crackle and optional rain.
export type MoodId = "rainy" | "cafe" | "sunrise" | "rain";
export interface Mood { id: MoodId; name: string; hint: string; bpm: number; drums: boolean; rain: boolean; crackle: boolean; keys: boolean; bass: boolean; chords: number[][][]; scale: number[] }
const n = (...a: number[]) => a;
// MIDI chord voicings (jazzy 7ths and 9ths).
const MINOR_SET = [
  [n(50, 57, 60, 64, 65), n(55, 59, 62, 65, 69), n(48, 55, 59, 62, 64), n(45, 52, 55, 59, 61)],      // Dm9 G13 Cmaj9 A7b9
  [n(57, 60, 64, 67, 71), n(53, 57, 60, 64, 67), n(50, 57, 60, 64, 65), n(52, 56, 59, 62, 67)],      // Am9 Fmaj9 Dm9 E7
  [n(52, 59, 62, 66, 67), n(57, 60, 64, 67, 71), n(50, 57, 60, 65, 69), n(55, 59, 62, 65, 69)],      // Em9 Am9 Dm11 G13
];
const MAJOR_SET = [
  [n(48, 55, 59, 62, 64), n(45, 55, 59, 60, 64), n(50, 57, 60, 64, 65), n(55, 59, 62, 65, 69)],      // Cmaj9 Am9 Dm9 G13
  [n(53, 57, 60, 64, 67), n(52, 55, 59, 62, 66), n(50, 57, 60, 64, 65), n(55, 59, 62, 65, 69)],      // Fmaj9 Em9 Dm9 G13
];
export const MOODS: Mood[] = [
  { id: "rainy", name: "Rainy night", hint: "Slow, moody, rain on the window", bpm: 66, drums: true, rain: true, crackle: true, keys: true, bass: true, chords: MINOR_SET, scale: [62, 65, 67, 69, 72, 74, 77] },
  { id: "cafe", name: "Cozy cafe", hint: "Warm and a bit brighter", bpm: 78, drums: true, rain: false, crackle: true, keys: true, bass: true, chords: MAJOR_SET, scale: [60, 62, 64, 67, 69, 72, 74] },
  { id: "sunrise", name: "Soft sunrise", hint: "No drums, just gentle keys", bpm: 60, drums: false, rain: false, crackle: true, keys: true, bass: false, chords: MAJOR_SET, scale: [64, 67, 69, 71, 74, 76] },
  { id: "rain", name: "Just rain", hint: "Rain and nothing else", bpm: 60, drums: false, rain: true, crackle: false, keys: false, bass: false, chords: MINOR_SET, scale: [] },
];
const K_MOOD = "lagomo.lofi.mood", K_VOL = "lagomo.lofi.vol";
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

class Lofi {
  private ctx: AudioContext | null = null; private master!: GainNode; private bus!: GainNode; private timer = 0;
  private noise!: AudioBuffer; private rainGain: GainNode | null = null; private rainSrc: AudioBufferSourceNode | null = null; private crackSrc: AudioBufferSourceNode | null = null;
  private echo!: DelayNode; private step = 0; private nextT = 0; private mood: Mood = MOODS[0]; private prog: number[][] = []; private bar = 0;
  private subs = new Set<() => void>(); playing = false;
  volume = Math.min(1, Math.max(0, parseFloat(localStorage.getItem(K_VOL) || "0.5")));
  moodId: MoodId = (localStorage.getItem(K_MOOD) as MoodId) || "rainy";
  subscribe(f: () => void) { this.subs.add(f); return () => { this.subs.delete(f); }; }
  private emit() { this.subs.forEach(f => f()); }

  private init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC(); this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 5200; warm.Q.value = 0.4;
    this.bus = ctx.createGain(); this.bus.connect(warm); warm.connect(this.master); this.master.connect(ctx.destination);
    // tape echo for the melody
    this.echo = ctx.createDelay(1.5); const fb = ctx.createGain(); fb.gain.value = 0.38; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    this.echo.connect(lp); lp.connect(fb); fb.connect(this.echo); lp.connect(warm);
    const len = ctx.sampleRate * 4; this.noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = this.noise.getChannelData(0);
    let b0 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; d[i] = (w * 0.4 + b0 * 6) * 0.5; }
  }

  private noiseSrc(loop = true) { const s = this.ctx!.createBufferSource(); s.buffer = this.noise; s.loop = loop; return s; }
  private startAmbience() {
    const ctx = this.ctx!; this.stopAmbience();
    if (this.mood.rain) {
      const s = this.noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.3; const g = ctx.createGain(); g.gain.value = this.mood.drums || this.mood.keys ? 0.16 : 0.32;
      s.connect(bp); bp.connect(g); g.connect(this.master); s.start(); this.rainSrc = s; this.rainGain = g;
    }
    if (this.mood.crackle) {
      const len = ctx.sampleRate * 3; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * rnd(0.3, 1) : (Math.random() * 2 - 1) * 0.015;
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900; const g = ctx.createGain(); g.gain.value = 0.22;
      s.connect(hp); hp.connect(g); g.connect(this.master); s.start(); this.crackSrc = s;
    }
  }
  private stopAmbience() { try { this.rainSrc?.stop(); this.crackSrc?.stop(); } catch { /* already stopped */ } this.rainSrc = this.crackSrc = null; }

  private key(t: number, midi: number, dur: number, vel: number) {
    const ctx = this.ctx!; const f = mtof(midi); const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500 + vel * 900; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.075, t + 0.03); g.gain.exponentialRampToValueAtTime(vel * 0.03, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [["triangle", 0], ["sine", 6], ["triangle", -7]].forEach(([type, cents]) => { const o = ctx.createOscillator(); o.type = type as OscillatorType; o.frequency.value = f; o.detune.value = (cents as number) + rnd(-3, 3); o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    lp.connect(g); g.connect(this.bus);
  }
  private pluck(t: number, midi: number) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = mtof(midi); const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); o.connect(g); g.connect(this.bus); g.connect(this.echo); o.start(t); o.stop(t + 1.5);
  }
  private kick(t: number, v: number) { const ctx = this.ctx!; const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.55 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3); }
  private snare(t: number, v: number) { const ctx = this.ctx!; const s = this.noiseSrc(false); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 0.7; const g = ctx.createGain(); g.gain.setValueAtTime(0.32 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); s.connect(bp); bp.connect(g); g.connect(this.bus); s.start(t, rnd(0, 2)); s.stop(t + 0.22); }
  private hat(t: number, v: number) { const ctx = this.ctx!; const s = this.noiseSrc(false); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000; const g = ctx.createGain(); g.gain.setValueAtTime(0.13 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(hp); hp.connect(g); g.connect(this.bus); s.start(t, rnd(0, 2)); s.stop(t + 0.06); }
  private bassNote(t: number, midi: number, dur: number) { const ctx = this.ctx!; const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = mtof(midi); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05); }

  // 16 steps per bar; swung 16ths. Each tick schedules everything that falls inside the look-ahead window.
  private tick = () => {
    const ctx = this.ctx!; const m = this.mood; const spb = 60 / m.bpm; const s16 = spb / 4;
    while (this.nextT < ctx.currentTime + 0.25) {
      const st = this.step % 16; const swing = st % 2 === 1 ? s16 * 0.28 : 0; const t = this.nextT + swing;
      if (st === 0) { this.prog = m.chords[this.bar % m.chords.length]; if (st === 0 && this.step % 64 === 0) this.bar = Math.floor(Math.random() * m.chords.length); }
      const chordIdx = Math.floor((this.step % 64) / 16); const chord = this.prog[chordIdx] || this.prog[0];
      if (m.keys && chord) {
        if (st === 0) chord.forEach((p, i) => this.key(t + i * 0.025, p, spb * 3.6, rnd(0.7, 1)));
        if (st === 10 && Math.random() < 0.6) chord.slice(1, 4).forEach((p, i) => this.key(t + i * 0.02, p, spb * 1.4, rnd(0.4, 0.7)));
        if (m.scale.length && (st === 6 || st === 14) && Math.random() < 0.35) this.pluck(t, m.scale[Math.floor(Math.random() * m.scale.length)] + (Math.random() < 0.2 ? 12 : 0));
      }
      if (m.bass && chord) { if (st === 0) this.bassNote(t, chord[0] - 12, spb * 1.8); if (st === 10) this.bassNote(t, chord[0] - 12 + (Math.random() < 0.3 ? 7 : 0), spb * 1.2); }
      if (m.drums) {
        if (st === 0 || (st === 10 && Math.random() < 0.7) || (st === 7 && Math.random() < 0.25)) this.kick(t, rnd(0.8, 1));
        if (st === 4 || st === 12) this.snare(t, rnd(0.7, 1));
        if (st % 2 === 0) this.hat(t, st % 4 === 0 ? rnd(0.6, 0.9) : rnd(0.3, 0.55)); else if (Math.random() < 0.3) this.hat(t, rnd(0.15, 0.3));
      }
      this.step++; this.nextT += s16;
    }
  };

  async play(id?: MoodId) {
    if (id) { this.moodId = id; localStorage.setItem(K_MOOD, id); }
    this.init(); const ctx = this.ctx!; if (ctx.state === "suspended") ctx.resume().catch(() => {});
    this.mood = MOODS.find(x => x.id === this.moodId) || MOODS[0];
    this.echo.delayTime.value = (60 / this.mood.bpm) * 0.75;
    window.clearInterval(this.timer); this.stopAmbience(); this.startAmbience();
    this.step = 0; this.bar = Math.floor(Math.random() * this.mood.chords.length); this.prog = this.mood.chords[this.bar]; this.nextT = ctx.currentTime + 0.1;
    this.timer = window.setInterval(this.tick, 90); this.tick();
    this.master.gain.cancelScheduledValues(ctx.currentTime); this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.4);
    this.playing = true; this.emit();
  }
  stop() {
    if (!this.ctx || !this.playing) return; const ctx = this.ctx; window.clearInterval(this.timer);
    this.master.gain.cancelScheduledValues(ctx.currentTime); this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    window.setTimeout(() => { if (!this.playing) this.stopAmbience(); }, 1200); this.playing = false; this.emit();
  }
  setVolume(v: number) { this.volume = v; localStorage.setItem(K_VOL, String(v)); if (this.ctx && this.playing) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); this.emit(); }
}
export const lofi = new Lofi();
