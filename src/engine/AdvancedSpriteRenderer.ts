import { FighterState, PhilosopherProfile } from './types';
import { GROUND_Y } from './DeterministicKernel';
import { SoundEngine } from './SoundEngine';

export interface SpriteFrameData {
  sheetX: number;
  sheetY: number;
  width: number;
  height: number;
}

const GREEK_RUNES = ['Λ', 'Ω', 'Φ', 'Ψ', 'Δ', 'Σ', 'Θ', 'Π'];

export class AdvancedSpriteRenderer {
  private static spriteSheets: Map<string, HTMLImageElement> = new Map();

  public static preloadCharacterSheet(philosopherKey: string, imageUrl: string): void {
    const img = new Image();
    img.src = imageUrl;
    this.spriteSheets.set(philosopherKey, img);
  }

  /**
   * Renders an ultra-detailed HD-2D arcade philosopher (~215px tall) with sacred mandalas,
   * inverted marble floor reflection, Drive-style motion afterimages, sculpted 3D-shaded
   * anatomical limbs, pleated robes with gold embroidery, dynamic facial expressions,
   * crackling helical special beams, and live on-canvas philosophical speech bubbles.
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

    // 1. Real-Time Radial Floor Light Pool Cast by Fighter
    const floorGlow = ctx.createRadialGradient(x, GROUND_Y + 6, 4, x, GROUND_Y + 6, 95);
    floorGlow.addColorStop(
      0,
      isP1 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(244, 63, 94, 0.25)'
    );
    floorGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.1)');
    floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 6, 95, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Inverted Polished Marble Floor Reflection
    if (y >= GROUND_Y - 50) {
      ctx.save();
      ctx.translate(x, GROUND_Y + (GROUND_Y - y) + 10);
      ctx.scale(dir, -0.3);
      ctx.globalAlpha = 0.16;
      this.drawCharacterBody(ctx, fighter, profile, globalFrame, isP1, true);
      ctx.restore();
    }

    // 3. Sacred Philosophical Floor Sigil (when Special/Super active or Empowered / Max Meter)
    if (
      fighter.currentMove === 'SPECIAL' ||
      fighter.currentMove === 'SUPER' ||
      fighter.meter >= 100 ||
      fighter.superArmorFrames > 0 ||
      fighter.damageMultiplier > 1.2
    ) {
      this.drawSacredGroundSigil(ctx, x, GROUND_Y + 5, profile, globalFrame, fighter.meter >= 100);
    }

    // 4. Soft Volumetric Ground Contact Shadow
    const heightOffGround = Math.max(0, GROUND_Y - y);
    const shadowScale = Math.max(0.38, 1 - heightOffGround / 280);
    const shadowGrad = ctx.createRadialGradient(
      x,
      GROUND_Y + 5,
      6,
      x,
      GROUND_Y + 5,
      70 * shadowScale
    );
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.84)');
    shadowGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.42)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 5, 70 * shadowScale, 16 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Multi-Spectrum Drive Afterimage Ghost Trails during Specials / Heavy Attacks / Dashes
    const showAfterimages =
      fighter.currentMove === 'SPECIAL' ||
      fighter.currentMove === 'SUPER' ||
      (fighter.currentMove === 'HEAVY' && fighter.attackState === 'ACTIVE') ||
      Math.abs(fighter.velocity.x) > 4.2;

    if (showAfterimages) {
      for (let g = 3; g >= 1; g--) {
        ctx.save();
        const trailOffset = -dir * g * 18;
        ctx.translate(x + trailOffset, y);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 0.2 / g;
        ctx.shadowColor = isP1 ? '#38BDF8' : profile.stagePalette.accentGlow;
        ctx.shadowBlur = 18;
        this.drawCharacterBody(ctx, fighter, profile, globalFrame - g * 2, isP1, true);
        ctx.restore();
      }
    }

    // 6. Main Masterpiece Character Pass
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    this.drawCharacterBody(ctx, fighter, profile, globalFrame, isP1, false);
    ctx.restore();

    // 7. Crisp Arcade Nameplate & Frame Tag Above Fighter
    const headTopY = y - (fighter.crouching ? 158 : 212);
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

    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.strokeStyle = isP1 ? 'rgba(56, 189, 248, 0.78)' : 'rgba(244, 63, 94, 0.78)';
    ctx.lineWidth = 1.5;
    const tagText = `${isP1 ? 'P1' : 'P2'} · ${profile.name.toUpperCase()} · ${moveTag}${
      fighter.frameTimer > 0 ? ` (${fighter.frameTimer}f)` : ''
    }`;
    const tagW = ctx.measureText(tagText).width + 18;
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, headTopY - 24, tagW, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isP1 ? '#7DD3FC' : '#FDA4AF';
    ctx.fillText(tagText, x, headTopY - 10);

    // 8. High-Impact Combo Counter Callout
    if (fighter.comboCount >= 2) {
      ctx.save();
      ctx.font = '700 20px "Cinzel", serif';
      ctx.fillStyle = '#FDE047';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 5;
      const comboLabel = `${fighter.comboCount}-HIT DIALECTIC COMBO!`;
      ctx.strokeText(comboLabel, x + dir * 24, headTopY - 34);
      ctx.fillText(comboLabel, x + dir * 24, headTopY - 34);
      ctx.restore();
    }

    // 9. Philosophical Status Banner Popup (e.g., APORIA!, CATEGORICAL IMPERATIVE, WILL TO POWER)
    if (fighter.statusBannerText && fighter.statusBannerFrames > 0) {
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const padWidth = ctx.measureText(fighter.statusBannerText).width + 26;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.95)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - padWidth / 2, headTopY - 60, padWidth, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(fighter.statusBannerText, x, headTopY - 44);
    }

    // 10. Live Philosophical Speech Callout Bubble (Spoken Philosophy During Fight!)
    const activeBubbles = SoundEngine.getActiveSpeechBubbles();
    const myBubble = activeBubbles.find((b) => b.fighterId === fighter.id);
    if (myBubble) {
      this.drawSpeechCalloutBubble(
        ctx,
        x,
        headTopY - (fighter.statusBannerFrames > 0 ? 94 : 64),
        profile.name,
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
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.78;

    // Outer double runic circle
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.stroke();

    // Inner inscribed sacred hexagram
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const px = Math.cos(ang) * 68;
      const py = Math.sin(ang) * 68;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  public static renderSpeechOverlayForFighter(
    ctx: CanvasRenderingContext2D,
    fighter: FighterState,
    profile: PhilosopherProfile,
    isP1: boolean
  ): void {
    const x = fighter.position.x;
    const y = fighter.position.y;
    const headTopY = fighter.crouching ? y - 165 : y - 220;

    ctx.save();
    ctx.textAlign = 'center';

    if (fighter.statusBannerText && fighter.statusBannerFrames > 0) {
      ctx.font = '700 12px "JetBrains Mono", monospace';
      const padWidth = ctx.measureText(fighter.statusBannerText).width + 26;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.95)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - padWidth / 2, headTopY - 60, padWidth, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE68A';
      ctx.fillText(fighter.statusBannerText, x, headTopY - 44);
    }

    const activeBubbles = SoundEngine.getActiveSpeechBubbles();
    const myBubble = activeBubbles.find((b) => b.fighterId === fighter.id);
    if (myBubble) {
      this.drawSpeechCalloutBubble(
        ctx,
        x,
        headTopY - (fighter.statusBannerFrames > 0 ? 94 : 64),
        profile.name,
        myBubble.quote,
        isP1,
        profile.stagePalette.accentGlow
      );
    }

    ctx.restore();
  }

  public static drawSpeechCalloutBubble(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    philosopherName: string,
    quote: string,
    isP1: boolean,
    accentColor: string
  ): void {
    ctx.save();
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    const displayQuote = quote.length > 72 ? `${quote.slice(0, 69)}...` : quote;
    const fullLine = `“${displayQuote}”`;
    const textW = ctx.measureText(fullLine).width;
    const boxW = Math.min(450, Math.max(210, textW + 32));
    const boxH = 44;

    const clampedX = Math.max(boxW / 2 + 16, Math.min(1200 - boxW / 2 - 16, anchorX));
    const clampedY = Math.max(54, anchorY);

    const bgGrad = ctx.createLinearGradient(
      clampedX - boxW / 2,
      clampedY - boxH,
      clampedX + boxW / 2,
      clampedY
    );
    bgGrad.addColorStop(0, 'rgba(9, 13, 22, 0.96)');
    bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');

    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = isP1 ? '#38BDF8' : accentColor;
    ctx.shadowColor = isP1 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(clampedX - boxW / 2, clampedY - boxH, boxW, boxH, 9);
    ctx.fill();
    ctx.stroke();

    // Pointer tail
    ctx.shadowBlur = 0;
    ctx.beginPath();
    const pointerX = Math.max(
      clampedX - boxW / 2 + 18,
      Math.min(clampedX + boxW / 2 - 18, anchorX)
    );
    ctx.moveTo(pointerX - 8, clampedY);
    ctx.lineTo(pointerX + 8, clampedY);
    ctx.lineTo(pointerX, clampedY + 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Speaker header tag
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isP1 ? '#38BDF8' : '#FBBF24';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${philosopherName.toUpperCase()} DECLARES:`,
      clampedX,
      clampedY - boxH + 14
    );

    // Quote text
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(fullLine, clampedX, clampedY - 9);
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

    // 0. Sacred Geometric Mandala & Volumetric Aura Pillars on Special / Super / High Multiplier
    if (
      !isSilhouettePass &&
      (fighter.superArmorFrames > 0 ||
        fighter.damageMultiplier > 1.2 ||
        fighter.meter >= 100 ||
        (isSpecial && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')))
    ) {
      ctx.save();
      const pulse = 1 + Math.sin(globalFrame * 0.25) * 0.08;
      const auraGrad = ctx.createRadialGradient(0, -108, 10, 0, -108, 112 * pulse);
      auraGrad.addColorStop(0, stagePalette.accentGlow);
      auraGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.28)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.ellipse(0, -108, 92 * pulse, 124 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Sacred Mandala Ring with Greek Philosophical Runes behind torso during Special/Super
      if (isSpecial) {
        ctx.save();
        ctx.translate(0, -118);
        ctx.rotate(globalFrame * 0.045);
        ctx.strokeStyle = '#FDE047';
        ctx.shadowColor = stagePalette.accentGlow;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 74, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '700 12px "Cinzel", serif';
        ctx.fillStyle = '#FEF08A';
        ctx.textAlign = 'center';
        for (let r = 0; r < 8; r++) {
          const ang = (r * Math.PI) / 4;
          const rx = Math.cos(ang) * 62;
          const ry = Math.sin(ang) * 62;
          ctx.fillText(GREEK_RUNES[r % GREEK_RUNES.length], rx, ry + 4);
        }
        ctx.restore();
      }

      // Rising golden aura embers
      ctx.fillStyle = '#FDE047';
      for (let s = 0; s < 6; s++) {
        const sx = Math.sin(globalFrame * 0.14 + s * 1.3) * 46;
        const sy = -((globalFrame * 3.4 + s * 34) % 195);
        ctx.beginPath();
        ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
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
      ? 0.18
      : fighter.attackState === 'ACTIVE' && isKick
      ? -0.15
      : fighter.attackState === 'ACTIVE' && isSpecial
      ? 0.14
      : 0;

    ctx.rotate(leanAngle);

    const hipY = -78 + crouchDrop + breatheY * 0.5;
    const shoulderY = -156 + crouchDrop + breatheY;
    const headY = -184 + crouchDrop + breatheY;

    // Rim lighting for main pass
    if (!isSilhouettePass) {
      ctx.shadowColor = isP1 ? 'rgba(56, 189, 248, 0.48)' : 'rgba(244, 63, 94, 0.48)';
      ctx.shadowBlur = 14;
    }

    // 1. Dynamic Flowing Multi-Fold Cape & Inner Silk Mantle
    const capeWave = Math.sin(globalFrame * 0.18) * 15 - fighter.velocity.x * 2.4;
    const capeGrad = ctx.createLinearGradient(-60, shoulderY, -8, 0);
    capeGrad.addColorStop(0, visual.secondaryTrim);
    capeGrad.addColorStop(0.55, visual.primaryRobe);
    capeGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, shoulderY + 4);
    ctx.bezierCurveTo(
      -56 + capeWave * 0.6,
      shoulderY + 38,
      -74 + capeWave,
      hipY + 26,
      -56 + capeWave,
      -8
    );
    ctx.lineTo(-12, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Sculpted 3D-Shaded Legs, Armored Knee Greaves & High-Impact Kick Animations
    const walkPhase = fighter.attackState === 'WALK' ? Math.sin(globalFrame * 0.38) * 24 : 0;

    // Back Leg (Thigh + Knee Greave + Shin + Era Boot)
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, hipY);
    ctx.lineTo(-20 - walkPhase * 0.6, -38);
    ctx.lineTo(-24 - walkPhase, -8);
    ctx.stroke();

    // Back Knee Greave
    ctx.fillStyle = visual.secondaryTrim;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-20 - walkPhase * 0.6, -38, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Back Boot with Metallic Sole & Lacing
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-36 - walkPhase, -15, 31, 15, 5);
    ctx.fill();
    ctx.stroke();

    // Front Leg (Executes High Dragon / Crescent Kick on HEAVY move!)
    if (isKick && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')) {
      const kickExt = fighter.attackState === 'ACTIVE' ? 112 : 42;
      const kickHeight = fighter.attackState === 'ACTIVE' ? -114 : -72;

      // Multi-layered Blazing Crescent Kick Slash Arc
      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        ctx.save();
        const slashGrad = ctx.createLinearGradient(10, hipY - 95, 135, hipY + 20);
        slashGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        slashGrad.addColorStop(0.4, '#38BDF8');
        slashGrad.addColorStop(0.75, '#F59E0B');
        slashGrad.addColorStop(1, '#FEF08A');
        ctx.strokeStyle = slashGrad;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(16, hipY - 14, 104, -0.84, 0.44);
        ctx.stroke();

        // Inner white-hot razor arc
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(16, hipY - 14, 108, -0.76, 0.36);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 20;
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
      ctx.roundRect(10 + kickExt, kickHeight - 15, 35, 25, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      // Standard Front Stance Leg
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(14, hipY);
      ctx.lineTo(20 + walkPhase * 0.6, -38);
      ctx.lineTo(22 + walkPhase, -8);
      ctx.stroke();

      // Front Knee Greave
      ctx.fillStyle = visual.secondaryTrim;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(20 + walkPhase * 0.6, -38, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = visual.secondaryTrim;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(10 + walkPhase, -15, 31, 15, 5);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Rear Guard Arm, Forearm Bracer & Hand
    ctx.strokeStyle = visual.primaryRobe;
    ctx.lineWidth = 17;
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
    const torsoGrad = ctx.createLinearGradient(-35, shoulderY, 35, hipY + 24);
    torsoGrad.addColorStop(0, isHit ? '#F87171' : visual.primaryRobe);
    torsoGrad.addColorStop(0.6, isHit ? '#DC2626' : visual.primaryRobe);
    torsoGrad.addColorStop(1, isHit ? '#7F1D1D' : '#0F172A');

    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-35, shoulderY, 70, 90 - crouchDrop * 0.35, 14);
    ctx.fill();
    ctx.stroke();

    // Lower Pleated Robe Hem / Tunic Skirt Over Upper Thighs
    ctx.fillStyle = visual.primaryRobe;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-33, hipY - 4);
    ctx.lineTo(33, hipY - 4);
    ctx.lineTo(40, hipY + 25);
    ctx.lineTo(-40, hipY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertical Pleat Fold Lines on Skirt
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.5;
    for (const px of [-20, -7, 7, 20]) {
      ctx.beginPath();
      ctx.moveTo(px, hipY - 2);
      ctx.lineTo(px * 1.15, hipY + 23);
      ctx.stroke();
    }

    // Pleated Cloth Folds & Philosophical Stole on Chest
    ctx.strokeStyle = visual.secondaryTrim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-19, shoulderY + 3);
    ctx.lineTo(14, hipY - 12);
    ctx.moveTo(17, shoulderY + 3);
    ctx.lineTo(-6, hipY - 12);
    ctx.stroke();

    // Sculpted Shoulder Pauldrons / Epaulettes
    ctx.fillStyle = visual.secondaryTrim;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-29, shoulderY + 8, 14, 9.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(29, shoulderY + 8, 14, 9.5, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ornate Waist Sash & Golden Medallion Buckle
    ctx.fillStyle = visual.secondaryTrim;
    ctx.fillRect(-36, hipY - 13, 72, 12);
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(4, hipY - 7, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Detailed Sculpted Head, Dynamic Expressions, Beard & Era Headwear
    ctx.fillStyle = visual.skinTone;
    ctx.fillRect(-10, headY + 12, 20, 16);

    const headGrad = ctx.createRadialGradient(7, headY - 6, 4, 0, headY, 24.5);
    headGrad.addColorStop(0, '#FFE8CE');
    headGrad.addColorStop(0.68, visual.skinTone);
    headGrad.addColorStop(1, '#7C4D32');

    ctx.beginPath();
    ctx.arc(0, headY, 24, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Back & Side Hair Volume
    ctx.fillStyle = visual.hairColor;
    ctx.beginPath();
    ctx.arc(-5, headY - 4, 23, Math.PI * 0.8, Math.PI * 1.98);
    ctx.fill();

    // Ear detail
    ctx.fillStyle = visual.skinTone;
    ctx.beginPath();
    ctx.arc(-4, headY + 1, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Eyes with Sclera, Iris & Specular Catchlights
    const eyesGlowing = isSpecial || fighter.meter >= 100;
    ctx.fillStyle = eyesGlowing ? '#FEF08A' : '#FFFFFF';
    ctx.fillRect(6, headY - 6, 7.5, 4.8);
    ctx.fillRect(15, headY - 6, 6.5, 4.8);
    ctx.fillStyle = eyesGlowing ? '#F59E0B' : '#0F172A';
    ctx.fillRect(9, headY - 5, 3.6, 3.6);
    ctx.fillRect(17, headY - 5, 3.6, 3.6);
    // White specular catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(10.5, headY - 4.5, 1.4, 1.4);
    ctx.fillRect(18.5, headY - 4.5, 1.4, 1.4);

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
    ctx.strokeStyle = 'rgba(0,0,0,0.48)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(14, headY - 5);
    ctx.lineTo(19, headY + 1);
    ctx.lineTo(13, headY + 2);
    ctx.stroke();

    // Dynamic Mouth Expression
    const isShouting =
      fighter.attackState === 'ACTIVE' ||
      isSpecial ||
      SoundEngine.getActiveSpeechBubbles().some((b) => b.fighterId === fighter.id);

    if (isShouting) {
      ctx.fillStyle = '#450A0A';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(13, headY + 9, 4.8, 3.4, 0, 0, Math.PI * 2);
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

    // Gold Spectacles for Nietzsche, Hegel, Sartre
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
        headY + (visual.beardStyle === 'long_white' ? 52 : 33),
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
      const punchReach = fighter.attackState === 'ACTIVE' ? 98 : -14;

      ctx.strokeStyle = visual.primaryRobe;
      ctx.lineWidth = 18;
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
        24
      );
      fistGrad.addColorStop(0, '#FFFFFF');
      fistGrad.addColorStop(0.45, '#38BDF8');
      fistGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = fighter.attackState === 'ACTIVE' ? fistGrad : visual.skinTone;
      ctx.beginPath();
      ctx.arc(armStartX + punchReach + 8, armStartY - 4, 19, 0, Math.PI * 2);
      ctx.fill();

      // Sonic Boom Ring & Speed Streaks on Active Frame
      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(armStartX + 16, armStartY - 16);
        ctx.lineTo(armStartX + punchReach + 34, armStartY - 16);
        ctx.moveTo(armStartX + 24, armStartY + 8);
        ctx.lineTo(armStartX + punchReach + 34, armStartY + 8);
        ctx.stroke();

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(armStartX + punchReach - 6, armStartY - 4, 9, 26, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (isSpecial && (fighter.attackState === 'STARTUP' || fighter.attackState === 'ACTIVE')) {
      const specReach = fighter.attackState === 'ACTIVE' ? 148 : 26;
      ctx.strokeStyle = visual.secondaryTrim;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(armStartX, armStartY);
      ctx.lineTo(armStartX + specReach * 0.55, armStartY - 8);
      ctx.stroke();

      if (fighter.attackState === 'ACTIVE' && !isSilhouettePass) {
        // Multi-Layer Philosophical Plasma Beam + Helical Lightning + Geometric Runes
        const beamGrad = ctx.createLinearGradient(armStartX + 20, 0, armStartX + specReach + 60, 0);
        beamGrad.addColorStop(0, '#FFFFFF');
        beamGrad.addColorStop(0.28, '#FDE047');
        beamGrad.addColorStop(0.65, stagePalette.accentGlow);
        beamGrad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.save();
        ctx.shadowColor = stagePalette.accentGlow;
        ctx.shadowBlur = 24;
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.roundRect(armStartX + 20, armStartY - 44, specReach + 38, 76, 22);
        ctx.fill();

        // Inner white energy core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect(armStartX + 24, armStartY - 19, specReach + 16, 26, 10);
        ctx.fill();

        // Helical Lightning Bolt spiraling along the beam
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let lx = 0; lx <= specReach + 20; lx += 14) {
          const ly = armStartY - 6 + Math.sin(lx * 0.12 + globalFrame * 0.6) * 24;
          if (lx === 0) ctx.moveTo(armStartX + 24 + lx, ly);
          else ctx.lineTo(armStartX + 24 + lx, ly);
        }
        ctx.stroke();

        // Orbiting sacred rings along the beam
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2.5;
        for (const rx of [48, 94, 140]) {
          ctx.beginPath();
          ctx.ellipse(armStartX + rx, armStartY - 6, 9, 40, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      // Idle / Walk / Guard Fighting Arm + Signature Philosophical Weapon/Prop
      const guardX = isBlocking ? 32 : 28;
      const guardY = isBlocking ? shoulderY + 2 : shoulderY + 28;
      ctx.strokeStyle = visual.primaryRobe;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(armStartX, armStartY);
      ctx.lineTo(guardX - 6, armStartY + 20);
      ctx.lineTo(guardX, guardY);
      ctx.stroke();

      // Golden wrist bracer
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3.5;
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
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(36, hipY - 24, 78, -Math.PI / 2.05, Math.PI / 2.05);
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
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, -64);
        ctx.lineTo(0, 58);
        ctx.stroke();
        ctx.fillStyle = '#FDE047';
        ctx.shadowColor = '#FDE047';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -66, 8.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'dagger': {
        ctx.fillStyle = '#E2E8F0';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, -4);
        ctx.lineTo(40, -14);
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
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(10, floatY - 10, 20, 20);
        ctx.beginPath();
        ctx.arc(20, floatY, 14, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'hammer_gear':
      case 'gavel': {
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(15, -26);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.8;
        ctx.fillRect(4, -35, 25, 14);
        ctx.strokeRect(4, -35, 25, 14);
        break;
      }
      case 'tome':
      case 'scroll': {
        ctx.fillStyle = '#FDE68A';
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 2;
        ctx.fillRect(4, -14, 21, 25);
        ctx.strokeRect(4, -14, 21, 25);
        break;
      }
      default: {
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.arc(12, -8, 7.5, 0, Math.PI * 2);
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
