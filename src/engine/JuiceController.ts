export interface HitSparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  isStreak?: boolean;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  tiltY?: number;
}

export interface FloorCrater {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export interface SuperCutInBanner {
  philosopherName: string;
  moveTitle: string;
  quote: string;
  accentColor: string;
  framesRemaining: number;
  maxFrames: number;
  isRightSide: boolean;
}

export class JuiceController {
  private static hitstopFrames = 0;
  private static shakeDuration = 0;
  private static shakeMagnitude = 0;
  private static flashAlpha = 0;
  private static flashColor = '#F59E0B';
  private static particles: HitSparkParticle[] = [];
  private static rings: ShockwaveRing[] = [];
  private static craters: FloorCrater[] = [];
  private static cutInBanner: SuperCutInBanner | null = null;

  public static triggerHitstop(frames: number): void {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  public static getHitstopFrames(): number {
    return this.hitstopFrames;
  }

  public static consumeHitstopTick(): boolean {
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return true;
    }
    return false;
  }

  public static triggerScreenShake(duration: number, magnitude: number): void {
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  public static triggerImpactFlash(color = '#F59E0B', alpha = 0.24): void {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  public static triggerSuperCutIn(
    philosopherName: string,
    moveTitle: string,
    quote: string,
    accentColor = '#F59E0B',
    isRightSide = false
  ): void {
    this.cutInBanner = {
      philosopherName,
      moveTitle,
      quote,
      accentColor,
      framesRemaining: 55,
      maxFrames: 55,
      isRightSide,
    };
  }

  public static spawnFloorCrater(x: number, groundY: number, color = '#F59E0B', radius = 64): void {
    this.craters.push({
      x,
      y: groundY + 4,
      radius,
      color,
      alpha: 0.85,
    });
    if (this.craters.length > 8) {
      this.craters.shift();
    }
  }

  public static spawnHitSparks(
    x: number,
    y: number,
    heavy: boolean,
    color = '#F59E0B'
  ): void {
    const count = heavy ? 28 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.18;
      const speed = (heavy ? 9.5 : 6.0) + (i % 5) * 2.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: heavy ? 6.5 : 4.2,
        color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FDE047' : color,
        alpha: 1,
        maxLife: heavy ? 22 : 14,
        life: heavy ? 22 : 14,
        isStreak: i % 2 === 0,
      });
    }

    // Primary impact shockwave
    this.rings.push({
      x,
      y,
      radius: 10,
      maxRadius: heavy ? 115 : 65,
      color,
      alpha: 0.95,
      tiltY: 1,
    });

    // Secondary inner white core flash ring on heavy hits
    if (heavy) {
      this.rings.push({
        x,
        y,
        radius: 4,
        maxRadius: 72,
        color: '#FFFFFF',
        alpha: 0.9,
        tiltY: 0.55,
      });
    }
  }

  public static applyCameraTransform(ctx: CanvasRenderingContext2D, frameSeed: number): void {
    if (this.shakeDuration > 0) {
      const s1 = Math.sin(frameSeed * 2.1 + this.shakeDuration * 2.9);
      const s2 = Math.cos(frameSeed * 2.5 + this.shakeDuration * 1.9);
      const offsetX = s1 * this.shakeMagnitude;
      const offsetY = s2 * this.shakeMagnitude * 0.75;
      ctx.translate(offsetX, offsetY);
      this.shakeDuration--;
      this.shakeMagnitude *= 0.89;
    }
  }

  public static renderFloorDecals(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const c of this.craters) {
      c.alpha *= 0.985;
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;

      // Elliptical scorched floor ring
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.radius, c.radius * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Radial fracture lines on the marble stage
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI) / 3 + 0.3;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(ang) * 10, c.y + Math.sin(ang) * 2.5);
        ctx.lineTo(c.x + Math.cos(ang) * c.radius * 1.15, c.y + Math.sin(ang) * c.radius * 0.26);
        ctx.stroke();
      }
    }
    this.craters = this.craters.filter((c) => c.alpha > 0.04);
    ctx.restore();
  }

  public static renderImpactOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // 1. Full-screen subtle impact flash on Super / Heavy Counter
    if (this.flashAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      this.flashAlpha *= 0.78;
    }

    // 2. Expanding Shockwave Rings & Core Starbursts
    ctx.save();
    for (const ring of this.rings) {
      ring.radius += (ring.maxRadius - ring.radius) * 0.3;
      ring.alpha *= 0.83;
      ctx.strokeStyle = ring.color;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(
        ring.x,
        ring.y,
        ring.radius,
        ring.radius * (ring.tiltY || 1),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    this.rings = this.rings.filter((r) => r.alpha > 0.05);

    // 3. High-Velocity Directional Hit-Spark Streaks & Embers
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.36;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.isStreak) {
        ctx.lineWidth = p.size * 0.65;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.9, p.y - p.vy * 1.9);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.restore();

    // 4. Dramatic Arcade "SUPER / SPECIAL CUT-IN" Cinema Banner
    if (this.cutInBanner && this.cutInBanner.framesRemaining > 0) {
      const b = this.cutInBanner;
      b.framesRemaining--;
      const progress = 1 - b.framesRemaining / b.maxFrames;
      const alpha =
        b.framesRemaining < 10
          ? b.framesRemaining / 10
          : progress < 0.12
          ? progress / 0.12
          : 1;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const bannerY = 66;
      const bannerH = 56;

      // Diagonal speedline slash ribbon across upper arena
      const grad = ctx.createLinearGradient(0, bannerY, width, bannerY);
      if (!b.isRightSide) {
        grad.addColorStop(0, 'rgba(9, 13, 22, 0.96)');
        grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.92)');
        grad.addColorStop(1, 'rgba(9, 13, 22, 0)');
      } else {
        grad.addColorStop(0, 'rgba(9, 13, 22, 0)');
        grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.92)');
        grad.addColorStop(1, 'rgba(9, 13, 22, 0.96)');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, bannerY, width, bannerH);

      // Glowing top and bottom border rails
      ctx.strokeStyle = b.accentColor;
      ctx.shadowColor = b.accentColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(width, bannerY);
      ctx.moveTo(0, bannerY + bannerH);
      ctx.lineTo(width, bannerY + bannerH);
      ctx.stroke();

      // Speedlines inside banner
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.2;
      for (let s = 0; s < 10; s++) {
        const ly = bannerY + 6 + s * 5;
        const lx = ((s * 173 + b.framesRemaining * 28) % width);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + 140, ly);
        ctx.stroke();
      }

      // Text inside cut-in banner
      ctx.shadowBlur = 0;
      const textX = b.isRightSide ? width - 36 : 36;
      ctx.textAlign = b.isRightSide ? 'right' : 'left';

      ctx.fillStyle = b.accentColor;
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `${b.philosopherName.toUpperCase()} · ${b.moveTitle.toUpperCase()}`,
        textX,
        bannerY + 22
      );

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 16px "Cinzel", serif';
      ctx.fillText(`“${b.quote}”`, textX, bannerY + 44);

      ctx.restore();
    }
  }
}
