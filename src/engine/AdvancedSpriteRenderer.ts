import { FighterState, PhilosopherProfile } from './types';
import { GROUND_Y } from './DeterministicKernel';
import { SoundEngine } from './SoundEngine';

export interface SpriteFrameData {
  sheetX: number;
  sheetY: number;
  width: number;
  height: number;
}

export class AdvancedSpriteRenderer {
  private static spriteSheets: Map<string, HTMLImageElement> = new Map();

  public static preloadCharacterSheet(philosopherKey: string, imageUrl: string): void {
    const img = new Image();
    img.src = imageUrl;
    this.spriteSheets.set(philosopherKey, img);
  }

  /**
   * Renders an ultra-detailed HD arcade philosopher (~210px tall) with sacred floor sigils,
   * inverted marble floor reflection, Drive-style motion afterimages, multi-layered cloth drapery,
   * dynamic facial expressions, era-specific weapons, and live philosophical speech bubbles.
   */
  public static renderAnimatedFighter(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    profile: PhilosopherProfile,
    globalFrame: number,
    isP1: boolean
  ): void {
    const x = fighter.position.x;
    const y = fighter.position.y;
    const dir = fighter.facingRight ? 1 : -1;

    ctx.save();

    // 1. Subtle Inverted Polished Marble Floor Reflection
    if (y >= GROUND_Y - 45) {
      ctx.save();
      ctx.translate(x, GROUND_Y + (GROUND_Y - y) + 10);
      ctx.scale(dir, -0.28);
      ctx.globalAlpha = 0.15;
      this.drawCharacterBody(ctx, fighter, profile, globalFrame, isP1, true);
      ctx.restore();
    }

    // 2. Sacred Philosophical Floor Sigil (when Special/Super active or High Meter / Empowered)
    if (
      fighter.currentMove === 'SPECIAL' ||
      fighter.currentMove === 'SUPER' ||
      fighter.meter >= 100 ||
      fighter.superArmorFrames > 0 ||
      fighter.damageMultiplier > 1.25
    ) {
      this.drawSacredGroundSigil(ctx, x, GROUND_Y + 5, profile, globalFrame, fighter.meter >= 100);
    }

    // 3. Soft Volumetric Ground Contact Shadow
    const heightOffGround = Math.max(0, GROUND_Y - y);
    const shadowScale = Math.max(0.38, 1 - heightOffGround / 280);
    const shadowGrad = ctx.createRadialGradient(
      x,
      GROUND_Y + 5,
      6,
      x,
      GROUND_Y + 5,
      66 * shadowScale
    );
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, 66 * shadowScale, 15 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Multi-Spectrum Afterimage Ghost Trails during Specials / Heavy Attacks / Dashes
    const showAfterimages =
      fighter.currentMove === 'SPECIAL' ||
      fighter.currentMove === 'SUPER' ||
      (fighter.currentMove === 'HEAVY' && fighter.attackState === 'ACTIVE') ||
      Math.abs(fighter.velocity.x) > 4.2;

    if (showAfterimages) {
      for (let g = 3; g >= 1; g--) {
        ctx.save();
        const trailOffset = -dir * g * 16;
        ctx.translate(x + trailOffset, y);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 0.18 / g;
        ctx.shadowColor = profile.stagePalette.accentGlow;
        ctx.shadowBlur = 16;
        this.drawCharacterBody(ctx, fighter, profile, globalFrame - g * 2, isP1, true);
        ctx.restore();
      }
    }

    // 5. Main Masterpiece Character Pass
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    this.drawCharacterBody(ctx, fighter, profile, globalFrame, isP1, false);
    ctx.restore();

    // 6. Crisp Arcade Nameplate & Frame Tag Above Fighter
    const headTopY = y - (fighter.crouching ? 156 : 210);
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const moveTag =
      fighter.currentMove === 'LIGHT'
        ? 'PUNCH'
        : fighter.currentMove === 'HEAVY'
        ? 'KICK'
        : fighter.currentMove !== 'NONE'
        ? fighter.currentMove
        : fighter.attackState;

    ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
    ctx.strokeStyle = isP1 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(244, 63, 94, 0.7)';
    ctx.lineWidth = 1.5;
    const tagText = `${isP1 ? 'P1' : 'P2'} · ${moveTag}${
      fighter.frameTimer > 0 ? ` (${fighter.frameTimer}f)` : ''
    }`;
    const tagW = ctx.measureText(tagText).width + 18;
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, headTopY - 24, tagW, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isP1 ? '#7DD3FC' : '#FDA4AF';
    ctx.fillText(tagText, x, headTopY - 10);

    // 7. High-Impact Combo Counter Callout
    if (fighter.comboCount >= 2) {
      ctx.save();
      ctx.font = '700 19px "Cinzel", serif';
      ctx.fillStyle = '#FDE047';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 4.5;
      const comboLabel = `${fighter.comboCount}-HIT DIALECTIC COMBO!`;
      ctx.strokeText(comboLabel, x + dir * 24, headTopY - 34);
      ctx.fillText(comboLabel, x + dir * 24, headTopY - 34);
      ctx.restore();
    }

    // 8. Philosophical Status Banner Popup (e.g., APORIA!, CATEGORICAL IMPERATIVE, WILL TO POWER)
    if (fighter.statusBannerText && fighter.statusBannerFrames > 0) {
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const padWidth = ctx.measureText(fighter.statusBannerText).width + 24;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.94)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - padWidth / 2, headTopY - 60, padWidth, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(fighter.statusBannerText, x, headTopY - 44);
    }

    // 9. Live Philosophical Speech Callout Bubble (Spoken Philosophy During Fight!)
    const activeBubbles = SoundEngine.getActiveSpeechBubbles();
    const myBubble = activeBubbles.find((b) => b.fighterId === fighter.id);
    if (myBubble) {
      this.drawSpeechCalloutBubble(
        ctx,
        x,
        headTopY - (fighter.statusBannerFrames > 0 ? 92 : 64),
        myBubble.quote,
        isP1,
        profile.stagePalette.accentGlow
      );
    }

    ctx.restore();
  }

  private static drawSacredGroundSigil(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    profile: PhilosopherProfile,
    frame: number,
    isSuperReady: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.28);
    ctx.rotate(frame * 0.035);

    const color = isSuperReady ? '#FDE047' : profile.stagePalette.accentGlow;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.72;

    // Outer runic circle
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.stroke();

    // Inner inscribed sacred hexagram / square
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const px = Math.cos(ang) * 70;
      const py = Math.sin(ang) * 70;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  private static drawSpeechCalloutBubble(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    quote: string,
    isP1: boolean,
    accentColor: string
  ): void {
    ctx.save();
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    const displayQuote = quote.length > 68 ? `${quote.slice(0, 65)}...` : quote;
    const textW = ctx.measureText(`“${displayQuote}”`).width;
    const boxW = Math.min(420, Math.max(180, textW + 28));
    const boxH = 32;

    // Keep speech bubble inside horizontal canvas bounds (1200px wide)
    const clampedX = Math.max(boxW / 2 + 16, Math.min(1200 - boxW / 2 - 16, anchorX));
    const clampedY = Math.max(46, anchorY);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = isP1 ? '#38BDF8' : accentColor;
    ctx.shadowColor = isP1 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(245, 158, 11, 0.45)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(clampedX - boxW / 2, clampedY - boxH, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    // Speech pointer triangle
    ctx.shadowBlur = 0;
    ctx.beginPath();
    const pointerX = Math.max(clampedX - boxW / 2 + 16, Math.min(clampedX + boxW / 2 - 16, anchorX));
    ctx.moveTo(pointerX - 7, clampedY);
    ctx.lineTo(pointerX + 7, clampedY);
    ctx.lineTo(pointerX, clampedY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.fillText(`“${displayQuote}”`, clampedX, clampedY - 11);
    ctx.restore();
  }

  private static drawCharacterBody(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    profile: PhilosopherProfile,
    globalFrame: number,
    isP1: boolean,
    isSilhouettePass: boolean
  ): void {
    const { visual, stagePalette } = profile;
    const isHit = fighter.attackState === 'HITSTUN' || fighter.attackState === 'KNOCKDOWN';
    const isBlocking = fighter.blocking || fighter.attackState === 'BLOCKSTUN';
    const isPunch = fighter.currentMove === 'LIGHT';
    const isKick = fighter.currentMove === 'HEAVY';
    const isSpecial = fighter.currentMove === 'SPECIAL' || fighter.currentMove === 'SUPER';

    // 0. Volumetric Golden/Elemental Aura Pillars on Super Armor, High Multiplier, or Special
    if (
      !isSilhouettePass &&
      (fighter.superArmorFrames > 0 ||
        fighter.damageMultiplier > 1.2 ||
        fighter.meter >= 100 ||
        (isSpecial && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')))
    ) {
      ctx.save();
      const pulse = 1 + Math.sin(globalFrame * 0.25) * 0.08;
      const auraGrad = ctx.createRadialGradient(0, -105, 10, 0, -105, 105 * pulse);
      auraGrad.addColorStop(0, stagePalette.accentGlow);
      auraGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.26)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.ellipse(0, -105, 86 * pulse, 118 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rising golden aura sparks around fighter
      ctx.fillStyle = '#FDE047';
      for (let s = 0; s < 5; s++) {
        const sx = Math.sin(globalFrame * 0.14 + s * 1.4) * 44;
        const sy = -((globalFrame * 3.2 + s * 38) % 190);
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const crouchDrop = fighter.crouching ? 44 : 0;
    const breatheY =
      fighter.attackState === 'WALK'
        ? Math.sin(globalFrame * 0.38) * 6
        : Math.sin(globalFrame * 0.12) * 3.5;

    const leanAngle = isHit
      ? -0.25
      : fighter.attackState === 'ACTIVE' && isPunch
      ? 0.17
      : fighter.attackState === 'ACTIVE' && isKick
      ? -0.15
      : fighter.attackState === 'ACTIVE' && isSpecial
      ? 0.13
      : 0;

    ctx.rotate(leanAngle);

    const hipY = -76 + crouchDrop + breatheY * 0.5;
    const shoulderY = -154 + crouchDrop + breatheY;
    const headY = -182 + crouchDrop + breatheY;

    // Rim lighting for main pass
    if (!isSilhouettePass) {
      ctx.shadowColor = isP1 ? 'rgba(56, 189, 248, 0.42)' : 'rgba(244, 63, 94, 0.42)';
      ctx.shadowBlur = 12;
    }

    // 1. Dynamic Flowing Multi-Fold Cape & Inner Silk Mantle
    const capeWave = Math.sin(globalFrame * 0.18) * 14 - fighter.velocity.x * 2.2;
    const capeGrad = ctx.createLinearGradient(-55, shoulderY, -8, 0);
    capeGrad.addColorStop(0, visual.secondaryTrim);
    capeGrad.addColorStop(0.65, visual.primaryRobe);
    capeGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-22, shoulderY + 4);
    ctx.bezierCurveTo(
      -52 + capeWave * 0.6,
      shoulderY + 38,
      -68 + capeWave,
      hipY + 25,
      -52 + capeWave,
      -8
    );
    ctx.lineTo(-12, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Articulated Multi-Jointed Legs, Greaves & High-Impact Kick Animations
    const walkPhase = fighter.attackState === 'WALK' ? Math.sin(globalFrame * 0.38) * 24 : 0;

    // Back Leg (Thigh + Knee Guard + Shin + Era Boot)
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 19;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, hipY);
    ctx.lineTo(-20 - walkPhase * 0.6, -38);
    ctx.lineTo(-24 - walkPhase, -8);
    ctx.stroke();

    // Back Knee Greave
    ctx.fillStyle = visual.secondaryTrim;
    ctx.beginPath();
    ctx.arc(-20 - walkPhase * 0.6, -38, 7, 0, Math.PI * 2);
    ctx.fill();

    // Back Boot with Metallic Sole Trim
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-36 - walkPhase, -14, 30, 14, 5);
    ctx.fill();
    ctx.stroke();

    // Front Leg (Executes High Dragon / Crescent Kick on HEAVY move!)
    if (isKick && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')) {
      const kickExt = fighter.attackState === 'ACTIVE' ? 108 : 40;
      const kickHeight = fighter.attackState === 'ACTIVE' ? -112 : -70;

      // Multi-layered Blazing Crescent Kick Slash Arc
      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        ctx.save();
        const slashGrad = ctx.createLinearGradient(10, hipY - 90, 130, hipY + 20);
        slashGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        slashGrad.addColorStop(0.45, '#38BDF8');
        slashGrad.addColorStop(0.8, '#F59E0B');
        slashGrad.addColorStop(1, '#FEF08A');
        ctx.strokeStyle = slashGrad;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(16, hipY - 14, 100, -0.82, 0.42);
        ctx.stroke();

        // Inner white razor arc
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(16, hipY - 14, 104, -0.75, 0.35);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 19;
      ctx.beginPath();
      ctx.moveTo(12, hipY);
      ctx.lineTo(14 + kickExt * 0.52, kickHeight + 12);
      ctx.lineTo(16 + kickExt, kickHeight);
      ctx.stroke();

      // Glowing Striking Boot with Energy Burst
      ctx.fillStyle = fighter.attackState === 'ACTIVE' ? '#F59E0B' : '#334155';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(10 + kickExt, kickHeight - 15, 34, 24, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      // Standard Front Stance Leg
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 19;
      ctx.beginPath();
      ctx.moveTo(14, hipY);
      ctx.lineTo(20 + walkPhase * 0.6, -38);
      ctx.lineTo(22 + walkPhase, -8);
      ctx.stroke();

      // Front Knee Guard
      ctx.fillStyle = visual.secondaryTrim;
      ctx.beginPath();
      ctx.arc(20 + walkPhase * 0.6, -38, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = visual.secondaryTrim;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(10 + walkPhase, -14, 30, 14, 5);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Rear Guard Arm, Forearm Bracer & Hand
    ctx.strokeStyle = visual.primaryRobe;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-20, shoulderY + 12);
    ctx.lineTo(-36, shoulderY + 38);
    ctx.lineTo(-22, shoulderY + 52);
    ctx.stroke();
    ctx.fillStyle = visual.skinTone;
    ctx.beginPath();
    ctx.arc(-22, shoulderY + 52, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Sculpted Torso, Pleated Tunic Skirt, Shoulder Pauldrons & Ornate Belt
    const torsoGrad = ctx.createLinearGradient(-34, shoulderY, 34, hipY + 24);
    torsoGrad.addColorStop(0, isHit ? '#F87171' : visual.primaryRobe);
    torsoGrad.addColorStop(0.6, isHit ? '#DC2626' : visual.primaryRobe);
    torsoGrad.addColorStop(1, isHit ? '#7F1D1D' : '#0F172A');

    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-34, shoulderY, 68, 88 - crouchDrop * 0.35, 14);
    ctx.fill();
    ctx.stroke();

    // Lower Pleated Robe Hem / Skirt Over Upper Thighs
    ctx.fillStyle = visual.primaryRobe;
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, hipY - 4);
    ctx.lineTo(32, hipY - 4);
    ctx.lineTo(38, hipY + 24);
    ctx.lineTo(-38, hipY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pleated Cloth Folds & Philosophical Stole
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-18, shoulderY + 3);
    ctx.lineTo(14, hipY - 12);
    ctx.moveTo(16, shoulderY + 3);
    ctx.lineTo(-6, hipY - 12);
    ctx.stroke();

    // Sculpted Shoulder Pauldrons / Epaulettes
    ctx.fillStyle = visual.secondaryTrim;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(-28, shoulderY + 8, 13, 9, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(28, shoulderY + 8, 13, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ornate Waist Sash, Golden Medallion Buckle & Flowing Tassels
    ctx.fillStyle = visual.secondaryTrim;
    ctx.fillRect(-35, hipY - 13, 70, 12);
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(4, hipY - 7, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Detailed Sculpted Head, Dynamic Expressions, Beard & Era Headwear
    // Neck & Collar
    ctx.fillStyle = visual.skinTone;
    ctx.fillRect(-10, headY + 12, 20, 16);

    // Sculpted Head with Radial Skin Shading
    const headGrad = ctx.createRadialGradient(7, headY - 6, 4, 0, headY, 24);
    headGrad.addColorStop(0, '#FFE4C4');
    headGrad.addColorStop(0.68, visual.skinTone);
    headGrad.addColorStop(1, '#8C5A3C');

    ctx.beginPath();
    ctx.arc(0, headY, 23.5, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Back & Side Hair Volume
    ctx.fillStyle = visual.hairColor;
    ctx.beginPath();
    ctx.arc(-5, headY - 4, 22.5, Math.PI * 0.8, Math.PI * 1.98);
    ctx.fill();

    // Ear detail
    ctx.fillStyle = visual.skinTone;
    ctx.beginPath();
    ctx.arc(-4, headY + 1, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Eyes (Glowing during Special/Super!)
    const eyesGlowing = isSpecial || fighter.meter >= 100;
    ctx.fillStyle = eyesGlowing ? '#FEF08A' : '#FFFFFF';
    ctx.fillRect(6, headY - 6, 7, 4.5);
    ctx.fillRect(15, headY - 6, 6, 4.5);
    ctx.fillStyle = eyesGlowing ? '#F59E0B' : '#0F172A';
    ctx.fillRect(9, headY - 5, 3.5, 3.5);
    ctx.fillRect(17, headY - 5, 3.5, 3.5);

    // Dynamic Eyebrows
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    if (isHit) {
      ctx.moveTo(4, headY - 7);
      ctx.lineTo(12, headY - 10);
      ctx.moveTo(15, headY - 10);
      ctx.lineTo(22, headY - 7);
    } else {
      ctx.moveTo(4, headY - 10);
      ctx.lineTo(13, headY - 7);
      ctx.moveTo(15, headY - 7);
      ctx.lineTo(22, headY - 10);
    }
    ctx.stroke();

    // Nose profile bridge
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(14, headY - 5);
    ctx.lineTo(18.5, headY + 1);
    ctx.lineTo(13, headY + 2);
    ctx.stroke();

    // Dynamic Mouth Expression (Shouting Battle Cry / Philosophizing vs Stoic vs Wince)
    const isShouting =
      fighter.attackState === 'ACTIVE' ||
      isSpecial ||
      SoundEngine.getActiveSpeechBubbles().some((b) => b.fighterId === fighter.id);

    if (isShouting) {
      ctx.fillStyle = '#450A0A';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(13, headY + 9, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (isHit) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(9, headY + 7, 8, 3);
    } else {
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(9, headY + 8);
      ctx.lineTo(16, headY + 8);
      ctx.stroke();
    }

    // Spectacles for Nietzsche, Hegel, Sartre, Spinoza
    if (
      profile.key === 'NIETZSCHE' ||
      profile.key === 'HEGEL' ||
      profile.key === 'SARTRE'
    ) {
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, headY - 8, 8, 7);
      ctx.strokeRect(14, headY - 8, 8, 7);
    }

    // Textured Beards & Mustaches
    if (visual.beardStyle === 'full' || visual.beardStyle === 'long_white') {
      ctx.fillStyle = visual.beardStyle === 'long_white' ? '#F8FAFC' : visual.hairColor;
      ctx.beginPath();
      ctx.moveTo(-7, headY + 3);
      ctx.quadraticCurveTo(
        11,
        headY + (visual.beardStyle === 'long_white' ? 50 : 32),
        23,
        headY + 3
      );
      ctx.closePath();
      ctx.fill();
    } else if (visual.beardStyle === 'mustache') {
      ctx.fillStyle = visual.hairColor;
      ctx.beginPath();
      ctx.roundRect(4, headY + 3, 20, 8, 4);
      ctx.fill();
    } else if (visual.beardStyle === 'goatee') {
      ctx.fillStyle = visual.hairColor;
      ctx.fillRect(7, headY + 4, 13, 4);
      ctx.beginPath();
      ctx.moveTo(10, headY + 10);
      ctx.lineTo(19, headY + 10);
      ctx.lineTo(14.5, headY + 22);
      ctx.closePath();
      ctx.fill();
    }

    // Era Headwear
    this.renderLargeHeadwear(ctx, profile.key, visual.headwear, headY);

    // 6. Front Striking Arm, Signature Philosopher Weapon Prop & Attack Effects
    const armStartX = 14;
    const armStartY = shoulderY + 15;

    if (isPunch && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')) {
      const punchReach = fighter.attackState === 'ACTIVE' ? 96 : -14;

      // Upper & Forearm
      ctx.strokeStyle = visual.primaryRobe;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(armStartX, armStartY);
      ctx.lineTo(armStartX + punchReach, armStartY - 4);
      ctx.stroke();

      // Glowing Impact Fist & Shockwave Cone
      const fistGrad = ctx.createRadialGradient(
        armStartX + punchReach + 8,
        armStartY - 4,
        2,
        armStartX + punchReach + 8,
        armStartY - 4,
        22
      );
      fistGrad.addColorStop(0, '#FFFFFF');
      fistGrad.addColorStop(0.45, '#38BDF8');
      fistGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = fighter.attackState === 'ACTIVE' ? fistGrad : visual.skinTone;
      ctx.beginPath();
      ctx.arc(armStartX + punchReach + 8, armStartY - 4, 18, 0, Math.PI * 2);
      ctx.fill();

      // Sonic Boom Ring & Speed Streaks on Active Frame
      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(armStartX + 16, armStartY - 16);
        ctx.lineTo(armStartX + punchReach + 32, armStartY - 16);
        ctx.moveTo(armStartX + 24, armStartY + 8);
        ctx.lineTo(armStartX + punchReach + 32, armStartY + 8);
        ctx.stroke();

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(armStartX + punchReach - 6, armStartY - 4, 8, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (isSpecial && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')) {
      const specReach = fighter.attackState === 'ACTIVE' ? 142 : 26;
      ctx.strokeStyle = visual.secondaryTrim;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(armStartX, armStartY);
      ctx.lineTo(armStartX + specReach * 0.55, armStartY - 8);
      ctx.stroke();

      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        // Multi-Layer Philosophical Plasma Beam + Geometric Runes
        const beamGrad = ctx.createLinearGradient(armStartX + 20, 0, armStartX + specReach + 55, 0);
        beamGrad.addColorStop(0, '#FFFFFF');
        beamGrad.addColorStop(0.3, '#FDE047');
        beamGrad.addColorStop(0.65, stagePalette.accentGlow);
        beamGrad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.save();
        ctx.shadowColor = stagePalette.accentGlow;
        ctx.shadowBlur = 22;
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.roundRect(armStartX + 20, armStartY - 42, specReach + 34, 72, 22);
        ctx.fill();

        // Inner white energy core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.roundRect(armStartX + 24, armStartY - 18, specReach + 12, 24, 10);
        ctx.fill();

        // Orbiting sacred rings along the beam
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2.5;
        for (const rx of [48, 92, 134]) {
          ctx.beginPath();
          ctx.ellipse(armStartX + rx, armStartY - 6, 9, 38, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      // Idle / Walk / Guard Fighting Arm + Signature Philosophical Weapon/Prop
      const guardX = isBlocking ? 32 : 28;
      const guardY = isBlocking ? shoulderY + 2 : shoulderY + 28;
      ctx.strokeStyle = visual.primaryRobe;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(armStartX, armStartY);
      ctx.lineTo(guardX - 6, armStartY + 20);
      ctx.lineTo(guardX, guardY);
      ctx.stroke();

      // Golden wrist bracer
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guardX - 4, guardY - 4);
      ctx.lineTo(guardX, guardY);
      ctx.stroke();

      ctx.fillStyle = visual.skinTone;
      ctx.beginPath();
      ctx.arc(guardX, guardY, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Render Philosopher's Signature Prop/Weapon in Hand
      if (!isSilhouettePass) {
        this.renderPhilosopherProp(
          ctx,
          visual.accessory,
          guardX,
          guardY,
          stagePalette.accentGlow,
          globalFrame
        );
      }
    }

    // 7. Crystalline Hexagonal Aegis Barrier when Blocking
    if (isBlocking && !isSilhouettePass) {
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.26)';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(36, hipY - 24, 76, -Math.PI / 2.05, Math.PI / 2.05);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }

  private static renderPhilosopherProp(
    ctx: CanvasRenderingContext2D,
    accessory: PhilosopherProfile['visual']['accessory'],
    handX: number,
    handY: number,
    glowColor: string,
    frame: number
  ): void {
    ctx.save();
    ctx.translate(handX, handY);

    switch (accessory) {
      case 'staff':
      case 'bamboo': {
        ctx.strokeStyle = accessory === 'bamboo' ? '#10B981' : '#D97706';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(0, -60);
        ctx.lineTo(0, 58);
        ctx.stroke();
        ctx.fillStyle = '#FDE047';
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -62, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'dagger': {
        ctx.fillStyle = '#E2E8F0';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, -4);
        ctx.lineTo(38, -14);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'polyhedron':
      case 'dialectic_triad': {
        const floatY = Math.sin(frame * 0.12) * 7 - 20;
        ctx.strokeStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;
        ctx.strokeRect(10, floatY - 10, 20, 20);
        ctx.beginPath();
        ctx.arc(20, floatY, 14, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'hammer_gear':
      case 'gavel': {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(15, -26);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.5;
        ctx.fillRect(4, -34, 24, 13);
        ctx.strokeRect(4, -34, 24, 13);
        break;
      }
      case 'tome':
      case 'scroll': {
        ctx.fillStyle = '#FDE68A';
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 2;
        ctx.fillRect(4, -14, 20, 24);
        ctx.strokeRect(4, -14, 20, 24);
        break;
      }
      default: {
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(12, -8, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  private static renderLargeHeadwear(
    ctx: CanvasRenderingContext2D,
    philosopherKey: string,
    headwear: PhilosopherProfile['visual']['headwear'],
    headY: number
  ): void {
    if (philosopherKey === 'SOCRATES') {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-22, headY - 16, 44, 5);
    } else if (headwear === 'laurel') {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, headY - 4, 24, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (headwear === 'scholar_cap') {
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.fillRect(-19, headY - 35, 38, 16);
      ctx.strokeRect(-19, headY - 35, 38, 16);
      ctx.fillRect(-29, headY - 23, 58, 4);
    } else if (headwear === 'mitre') {
      ctx.fillStyle = '#78350F';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-21, headY - 16);
      ctx.lineTo(0, headY - 46);
      ctx.lineTo(21, headY - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (headwear === 'tricorn') {
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, headY - 16);
      ctx.lineTo(0, headY - 36);
      ctx.lineTo(30, headY - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (headwear === 'top_hat') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-19, headY - 44, 38, 25);
      ctx.fillRect(-27, headY - 20, 54, 5);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-19, headY - 24, 38, 4);
    } else if (headwear === 'wig') {
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(-8, headY - 2, 24, Math.PI * 0.6, Math.PI * 1.85);
      ctx.fill();
    } else if (
      headwear === 'beret' ||
      headwear === 'florentine_cap' ||
      headwear === 'rustic_cap'
    ) {
      ctx.fillStyle = headwear === 'florentine_cap' ? '#881337' : '#1E293B';
      ctx.beginPath();
      ctx.ellipse(0, headY - 21, 25, 9, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
