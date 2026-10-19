import {
  ActiveSpeechBubble,
  PHILOSOPHY_VOICE_BANK,
} from './PhilosophyVoiceBank';
import { PHILOSOPHER_ROSTER } from './FighterRoster';

export class SoundEngine {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static compressor: DynamicsCompressorNode | null = null;
  private static reverbNode: ConvolverNode | null = null;
  private static noiseBuffer: AudioBuffer | null = null;

  private static muted = false;
  private static voiceEnabled = true;
  private static musicEnabled = false;
  private static musicIntervalId: number | null = null;
  private static musicStep = 0;

  private static lastSpeechTimeMs = 0;
  private static lastSpeechPriority = 0;
  private static quoteCounters: Record<string, number> = {};
  private static activeSpeechBubbles: ActiveSpeechBubble[] = [];

  private static getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupMasterChain(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private static setupMasterChain(ctx: AudioContext): void {
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    this.compressor.knee.setValueAtTime(18, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.18, ctx.currentTime);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

    // Synthesize a warm stereo hall impulse response for acoustic depth
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.65);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.8);
        data[i] = (Math.random() * 2 - 1) * decay * 0.35;
      }
    }
    try {
      this.reverbNode = ctx.createConvolver();
      this.reverbNode.buffer = impulse;
    } catch {
      this.reverbNode = null;
    }

    // Pre-build a 1-second pink/white hybrid noise buffer for physical hit transients & air whooshes
    const noiseLen = sampleRate;
    this.noiseBuffer = ctx.createBuffer(1, noiseLen, sampleRate);
    const noiseData = this.noiseBuffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < noiseLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      noiseData[i] = (b0 + b1 + b2 + white * 0.35) * 0.7;
    }

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  private static connectToOutput(node: AudioNode, wetReverbAmount = 0.15): void {
    const ctx = this.ctx;
    if (!ctx || !this.compressor) return;
    node.connect(this.compressor);

    if (this.reverbNode && wetReverbAmount > 0) {
      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(wetReverbAmount, ctx.currentTime);
      node.connect(wetGain);
      wetGain.connect(this.reverbNode);
      this.reverbNode.connect(this.compressor);
    }
  }

  private static makeDistortionCurve(amount = 40): Float32Array<ArrayBuffer> {
    const k = amount;
    const nSamples = 256;
    const curve = new Float32Array(new ArrayBuffer(nSamples * 4));
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public static setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopMusic();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  public static isMuted(): boolean {
    return this.muted;
  }

  public static setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public static isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public static toggleMusic(): boolean {
    if (this.musicEnabled) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  public static isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public static startMusic(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.musicEnabled = true;
    if (this.musicIntervalId !== null) return;

    // 128 BPM driving dialectical bass & classical Dorian arpeggio pulse
    const scale = [110, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 196.0];
    this.musicIntervalId = window.setInterval(() => {
      if (this.muted || !this.musicEnabled) return;
      const c = this.getContext();
      if (!c) return;
      const now = c.currentTime;
      const step = this.musicStep % 8;
      this.musicStep++;

      // Deep pulsed bass note
      const bassOsc = c.createOscillator();
      const bassFilter = c.createBiquadFilter();
      const bassGain = c.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(scale[step] * 0.5, now);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(step % 2 === 0 ? 420 : 260, now);
      bassGain.gain.setValueAtTime(step % 2 === 0 ? 0.045 : 0.028, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      this.connectToOutput(bassGain, 0.1);
      bassOsc.start(now);
      bassOsc.stop(now + 0.2);

      // Subtle Dorian harp pluck on downbeats
      if (step % 2 === 0) {
        const pluckOsc = c.createOscillator();
        const pluckGain = c.createGain();
        pluckOsc.type = 'triangle';
        pluckOsc.frequency.setValueAtTime(scale[(step * 3) % scale.length] * 2, now);
        pluckGain.gain.setValueAtTime(0.025, now);
        pluckGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
        pluckOsc.connect(pluckGain);
        this.connectToOutput(pluckGain, 0.25);
        pluckOsc.start(now);
        pluckOsc.stop(now + 0.23);
      }
    }, 230);
  }

  public static stopMusic(): void {
    this.musicEnabled = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  /**
   * Martial arts cloth & air-cutting whoosh layered with low-end displacement
   */
  public static playSwing(isHeavyKick = false): void {
    const ctx = this.getContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const duration = isHeavyKick ? 0.15 : 0.1;

    // Layer 1: Bandpass-filtered noise air whip
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.4, now);
    filter.frequency.setValueAtTime(isHeavyKick ? 950 : 1450, now);
    filter.frequency.exponentialRampToValueAtTime(isHeavyKick ? 180 : 320, now + duration);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, now);
    nGain.gain.linearRampToValueAtTime(isHeavyKick ? 0.24 : 0.16, now + 0.02);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(nGain);
    this.connectToOutput(nGain, 0.12);
    noise.start(now);
    noise.stop(now + duration);

    // Layer 2: Low-frequency air pressure thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isHeavyKick ? 145 : 190, now);
    subOsc.frequency.exponentialRampToValueAtTime(48, now + duration);
    subGain.gain.setValueAtTime(isHeavyKick ? 0.14 : 0.08, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    subOsc.connect(subGain);
    this.connectToOutput(subGain, 0.05);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  /**
   * Visceral multi-layered martial arts impact (Sub-bass punch + transient leather/bone snap + harmonic saturation)
   */
  public static playHit(heavy = false, comboCount = 1): void {
    const ctx = this.getContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const comboPitchBoost = 1 + Math.min(8, comboCount - 1) * 0.045;

    // Layer 1: Deep Sub-Bass Chest Impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime((heavy ? 135 : 175) * comboPitchBoost, now);
    subOsc.frequency.exponentialRampToValueAtTime(heavy ? 28 : 42, now + (heavy ? 0.22 : 0.13));
    subGain.gain.setValueAtTime(heavy ? 0.42 : 0.26, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.22 : 0.13));
    subOsc.connect(subGain);
    this.connectToOutput(subGain, heavy ? 0.22 : 0.1);
    subOsc.start(now);
    subOsc.stop(now + (heavy ? 0.23 : 0.14));

    // Layer 2: Mid-Range Saturated Crunch
    const midOsc = ctx.createOscillator();
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(heavy ? 65 : 30);
    const midGain = ctx.createGain();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime((heavy ? 240 : 320) * comboPitchBoost, now);
    midOsc.frequency.exponentialRampToValueAtTime(55, now + (heavy ? 0.15 : 0.09));
    midGain.gain.setValueAtTime(heavy ? 0.18 : 0.11, now);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.15 : 0.09));
    midOsc.connect(shaper);
    shaper.connect(midGain);
    this.connectToOutput(midGain, 0.15);
    midOsc.start(now);
    midOsc.stop(now + (heavy ? 0.16 : 0.1));

    // Layer 3: Crispy High-Impact Snap Transient (Noise Burst)
    const snap = ctx.createBufferSource();
    snap.buffer = this.noiseBuffer;
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(heavy ? 1850 : 2400, now);
    snapFilter.Q.setValueAtTime(1.2, now);
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(heavy ? 0.35 : 0.22, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.09 : 0.055));
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    this.connectToOutput(snapGain, 0.18);
    snap.start(now);
    snap.stop(now + (heavy ? 0.095 : 0.06));
  }

  /**
   * Crystalline metallic/stone shield parry resonance
   */
  public static playBlock(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const partials = [780, 1170, 1820];
    partials.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.11);
      gain.gain.setValueAtTime(0.11 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      this.connectToOutput(gain, 0.25);
      osc.start(now);
      osc.stop(now + 0.12);
    });
  }

  /**
   * Dramatic Twin-Attack Dialectical Clash Shockwave
   */
  public static playClash(): void {
    const ctx = this.getContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Metallic Anvil Ring
    [587.33, 880, 1318.5, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.09 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.35);
      osc.connect(gain);
      this.connectToOutput(gain, 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    });

    this.playHit(true, 3);
  }

  /**
   * Era-Tuned Philosophical Special Activation Synth & Harmonic Sweep
   */
  public static playSpecial(philosopherKey?: string): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const profile = philosopherKey ? PHILOSOPHER_ROSTER[philosopherKey] : null;
    const era = profile?.era || 'Ancient Philosophy';

    let chord = [261.63, 329.63, 392.0, 523.25]; // Classical Major
    let waveType: OscillatorType = 'triangle';

    if (era === 'Ancient Philosophy') {
      chord = [220.0, 293.66, 329.63, 440.0, 587.33]; // Dorian Lyre Fifths
      waveType = 'triangle';
    } else if (era === 'Medieval & Renaissance') {
      chord = [196.0, 293.66, 392.0, 493.88, 587.33]; // Cathedral Organ
      waveType = 'sawtooth';
    } else if (era === 'Enlightenment') {
      chord = [261.63, 329.63, 392.0, 493.88, 659.25]; // Celestial Harpsichord
      waveType = 'sine';
    } else {
      chord = [146.83, 220.0, 293.66, 349.23, 440.0]; // Modern Dialectical Minor
      waveType = 'sawtooth';
    }

    // Power-up sub swell
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(75, now);
    sub.frequency.exponentialRampToValueAtTime(160, now + 0.24);
    subGain.gain.setValueAtTime(0.22, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    sub.connect(subGain);
    this.connectToOutput(subGain, 0.2);
    sub.start(now);
    sub.stop(now + 0.27);

    // Harmonic Arpeggio Sweep
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = waveType;
      osc.frequency.setValueAtTime(f, now + idx * 0.028);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now + idx * 0.028);
      gain.gain.setValueAtTime(0.09, now + idx * 0.028);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.028 + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      this.connectToOutput(gain, 0.32);
      osc.start(now + idx * 0.028);
      osc.stop(now + idx * 0.028 + 0.29);
    });
  }

  /**
   * Ultimate Treatise Super Activation (Time-Freeze Bass Drop + Gong + Choir Swell)
   */
  public static playSuperActivate(philosopherKey?: string): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dramatic Time-Stop Sub Drop
    const drop = ctx.createOscillator();
    const dropGain = ctx.createGain();
    drop.type = 'sine';
    drop.frequency.setValueAtTime(260, now);
    drop.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    dropGain.gain.setValueAtTime(0.45, now);
    dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    drop.connect(dropGain);
    this.connectToOutput(dropGain, 0.35);
    drop.start(now);
    drop.stop(now + 0.5);

    this.playSpecial(philosopherKey);
  }

  /**
   * Grand Temple Bronze Gong + Sub Boom for Round KO
   */
  public static playKO(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const gongPartials = [98.0, 146.83, 196.0, 233.08, 293.66, 392.0, 528.0];
    gongPartials.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.97, now + 1.1);
      gain.gain.setValueAtTime(0.14 / Math.sqrt(idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.1);
      osc.connect(gain);
      this.connectToOutput(gain, 0.45);
      osc.start(now);
      osc.stop(now + 1.15);
    });
  }

  /**
   * Triggers a philosopher's best philosophical quote both visually (as a live speech callout bubble)
   * and audibly (via custom-tuned Web Speech Synthesis with priority queuing).
   */
  public static triggerPhilosopherQuote(
    fighterId: string,
    philosopherKey: string,
    category: 'INTRO' | 'ATTACK' | 'SPECIAL' | 'SUPER' | 'VICTORY',
    forceInterrupt = false
  ): ActiveSpeechBubble | null {
    const bank = PHILOSOPHY_VOICE_BANK[philosopherKey] || PHILOSOPHY_VOICE_BANK.SOCRATES;
    const profile = PHILOSOPHER_ROSTER[philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;

    const priorityMap: Record<typeof category, number> = {
      ATTACK: 1,
      INTRO: 2,
      SPECIAL: 3,
      SUPER: 4,
      VICTORY: 5,
    };
    const priority = priorityMap[category];
    const nowMs = Date.now();

    // Prevent lower-priority quotes from spamming over an active high-priority philosophical declaration
    const minCooldownMs = category === 'ATTACK' ? 3600 : category === 'SPECIAL' ? 2200 : 800;
    if (
      !forceInterrupt &&
      nowMs - this.lastSpeechTimeMs < minCooldownMs &&
      priority <= this.lastSpeechPriority
    ) {
      return null;
    }

    let pool: string[] = bank.attackQuotes;
    if (category === 'INTRO') pool = [bank.introQuote];
    else if (category === 'SPECIAL' || category === 'SUPER') pool = bank.specialQuotes;
    else if (category === 'VICTORY') pool = bank.victoryQuotes;

    const counterKey = `${philosopherKey}_${category}`;
    const idx = this.quoteCounters[counterKey] || 0;
    this.quoteCounters[counterKey] = idx + 1;
    const selectedQuote = pool[idx % pool.length] || profile.signaturePhilosophy;

    this.lastSpeechTimeMs = nowMs;
    this.lastSpeechPriority = priority;

    const bubble: ActiveSpeechBubble = {
      fighterId,
      philosopherKey,
      philosopherName: profile.name,
      quote: selectedQuote,
      category,
      createdAtMs: nowMs,
      durationMs: category === 'SUPER' || category === 'VICTORY' ? 4200 : 3200,
    };

    // Keep at most 1 active bubble per fighter
    this.activeSpeechBubbles = [
      ...this.activeSpeechBubbles.filter((b) => b.fighterId !== fighterId),
      bubble,
    ];

    this.speakWithPhilosopherVoice(philosopherKey, selectedQuote, priority >= 3 || forceInterrupt);
    return bubble;
  }

  public static getActiveSpeechBubbles(): ActiveSpeechBubble[] {
    const now = Date.now();
    this.activeSpeechBubbles = this.activeSpeechBubbles.filter(
      (b) => now - b.createdAtMs < b.durationMs
    );
    return this.activeSpeechBubbles;
  }

  public static clearSpeechBubbles(): void {
    this.activeSpeechBubbles = [];
  }

  public static speakQuote(philosopherName: string, quote: string): void {
    // Find philosopher key by name if possible
    const entry = Object.values(PHILOSOPHER_ROSTER).find((p) => p.name === philosopherName);
    this.speakWithPhilosopherVoice(entry?.key || 'SOCRATES', quote, true);
  }

  private static speakWithPhilosopherVoice(
    philosopherKey: string,
    quote: string,
    interruptCurrent: boolean
  ): void {
    if (this.muted || !this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      const synth = window.speechSynthesis;
      if (synth.speaking && !interruptCurrent) {
        return;
      }
      if (interruptCurrent) {
        synth.cancel();
      }

      const bank = PHILOSOPHY_VOICE_BANK[philosopherKey] || PHILOSOPHY_VOICE_BANK.SOCRATES;
      const utterance = new SpeechSynthesisUtterance(quote);
      utterance.pitch = bank.pitch;
      utterance.rate = bank.rate;
      utterance.volume = 0.92;

      const voices = synth.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Daniel') ||
              v.name.includes('Google UK English Male') ||
              v.name.includes('Arthur') ||
              v.name.includes('Oliver') ||
              v.name.includes('Natural'))
        );
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      synth.speak(utterance);
    } catch {
      // Ignore restricted browser speech synthesis errors
    }
  }
}
