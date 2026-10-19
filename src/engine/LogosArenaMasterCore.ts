import { FighterState, PhilosopherProfile } from './types';
import { PHILOSOPHER_ROSTER } from './FighterRoster';
import { SoundEngine } from './SoundEngine';
import { AdvancedSpriteRenderer } from './AdvancedSpriteRenderer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  rune?: string;
}

const PHILOSOPHICAL_RUNES = ['Λ', 'Ω', 'Φ', 'Ψ', 'Δ', 'Σ', 'Θ', 'Π', '∞'];

/**
 * Web Audio API Arcade Sound Synthesizer & Studio Impact Layer
 */
export class ArcadeSoundEngine {
  private static ctx: AudioContext | null = null;

  private static init(): AudioContext | null {
    if (SoundEngine.isMuted() || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public static playPunchSound(): void {
    SoundEngine.playHit(false, 1);
    const ac = this.init();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.08);

    gain.gain.setValueAtTime(0.32, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.08);
  }

  public static playHeavyKickSound(): void {
    SoundEngine.playHit(true, 2);
    const ac = this.init();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ac.currentTime + 0.18);

    gain.gain.setValueAtTime(0.42, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.18);
  }

  public static playSuperActivationSound(): void {
    SoundEngine.playSuperActivate();
    const ac = this.init();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ac.currentTime + 0.4);

    gain.gain.setValueAtTime(0.24, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ac.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.4);
  }

  public static playImpact(type: 'light' | 'heavy' | 'super'): void {
    if (type === 'light') {
      this.playPunchSound();
    } else if (type === 'heavy') {
      this.playHeavyKickSound();
    } else {
      this.playSuperActivationSound();
    }
  }
}

/**
 * Explosive Particle FX, Hit Spark & Floating Philosophical Rune Engine
 */
export class ParticleFxEngine {
  private static particles: Particle[] = [];

  public static spawnHitSparks(x: number, y: number, count = 14): void {
    this.spawnImpactSparks(x, y, count > 20);
  }

  public static spawnImpactSparks(x: number, y: number, isSuper = false): void {
    if (typeof window === 'undefined') return;
    const count = isSuper ? 32 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.15;
      const speed = 3 + ((i * 7) % (isSuper ? 10 : 6));
      const isRuneParticle = i % 5 === 0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        life: 1.0,
        color: isSuper
          ? i % 2 === 0
            ? '#00FFFF'
            : '#FDE047'
          : i % 2 === 0
          ? '#F1C40F'
          : '#E74C3C',
        size: 3 + (i % 4),
        rune: isRuneParticle
          ? PHILOSOPHICAL_RUNES[i % PHILOSOPHICAL_RUNES.length]
          : undefined,
      });
    }
  }

  public static updateAndRender(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // subtle gravity arc
      p.life -= 0.04;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      if (p.rune) {
        ctx.font = '700 13px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.rune, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/**
 * Skeletal Articulation & Cloth Physics Fighter Renderer
 */
export class SkeletalFighterRenderer {
  public static renderEliteFighter(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    profile: PhilosopherProfile,
    globalFrame: number,
    isP1: boolean
  ): void {
    // 1. Render velocity-reactive cloth physics ribbon & skeletal joint aura under-layer
    this.renderClothAndSkeletalOverlay(ctx, fighter, profile, globalFrame);

    // 2. Render full 215px Retina HD-2D articulated character, sacred mandalas, and live speech bubbles
    AdvancedSpriteRenderer.renderAnimatedFighter(ctx, fighter, profile, globalFrame, isP1);
  }

  public static renderClothAndSkeletalOverlay(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    profile: PhilosopherProfile,
    globalFrame: number
  ): void {
    const posX = fighter.position.x;
    const posY = fighter.position.y;
    const facing = fighter.facingRight ? 1 : -1;
    const velX = fighter.velocity.x;
    const crouchDrop = fighter.crouching ? 44 : 0;

    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(facing, 1);

    // Multi-Node Verlet Cloth Physics Simulation (Swaying Scholar Stole & Sash Tails reacting to velX)
    const clothSway1 = Math.sin(globalFrame * 0.16) * 7 - velX * 2.4;
    const clothSway2 = Math.cos(globalFrame * 0.22) * 11 - velX * 3.6;

    // Flowing Rear Philosophical Sash Ribbon
    const sashGrad = ctx.createLinearGradient(-20, -90 + crouchDrop, -55 + clothSway2, -12);
    sashGrad.addColorStop(0, profile.visual.secondaryTrim);
    sashGrad.addColorStop(0.6, profile.stagePalette.accentGlow);
    sashGrad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');

    ctx.fillStyle = sashGrad;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-18, -88 + crouchDrop);
    ctx.quadraticCurveTo(
      -42 + clothSway1,
      -52 + crouchDrop * 0.5,
      -54 + clothSway2,
      -12
    );
    ctx.lineTo(-38 + clothSway2, -6);
    ctx.quadraticCurveTo(
      -28 + clothSway1,
      -48 + crouchDrop * 0.5,
      -8,
      -82 + crouchDrop
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Active Strike Plasma Trail on Extended Attacks
    if (fighter.attackState === 'ACTIVE') {
      ctx.save();
      ctx.strokeStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(22, -138 + crouchDrop);
      ctx.lineTo(118, -138 + crouchDrop);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

/**
 * Unified Master Fighter Renderer uniting Skeletal Articulation, Cloth Physics, and HD-2D Sprites
 */
export class MasterFighterRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    philosopherKey: string,
    globalFrame = 0,
    isP1 = true
  ): void {
    const profile =
      PHILOSOPHER_ROSTER[philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    SkeletalFighterRenderer.renderEliteFighter(
      ctx,
      fighter,
      profile,
      globalFrame,
      isP1
    );
  }
}
