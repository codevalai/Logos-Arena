import React, { useEffect, useRef } from 'react';
import { FighterState, GameMatchState, PhilosopherProfile } from '../engine/types';
import { PHILOSOPHER_ROSTER } from '../engine/FighterRoster';
import { GROUND_Y } from '../engine/DeterministicKernel';
import { JuiceController } from '../engine/JuiceController';
import { MasterFighterRenderer, ParticleFxEngine } from '../engine/LogosArenaMasterCore';
import { LogosArena3DScene } from '../engine/LogosArena3DEngine';
import { AdvancedSpriteRenderer } from '../engine/AdvancedSpriteRenderer';

export type ArenaRenderMode = '3D_WEBGL' | '2D_HD_ATLAS';

interface ArenaCanvasProps {
  matchState: GameMatchState;
  stageOwnerKey: string;
  showHitboxes: boolean;
  renderMode?: ArenaRenderMode;
}

const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 520;

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  matchState,
  stageOwnerKey,
  showHitboxes,
  renderMode = '3D_WEBGL',
}) => {
  const webglMountRef = useRef<HTMLDivElement | null>(null);
  const scene3DRef = useRef<LogosArena3DScene | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Three.js 3D WebGL Renderer once in isolated ref container
  useEffect(() => {
    if (renderMode !== '3D_WEBGL') {
      if (scene3DRef.current) {
        scene3DRef.current.dispose();
        scene3DRef.current = null;
      }
      return;
    }
    const mount = webglMountRef.current;
    if (!mount) return;

    const scene3D = new LogosArena3DScene(mount, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    scene3DRef.current = scene3D;

    return () => {
      scene3D.dispose();
      scene3DRef.current = null;
    };
  }, [renderMode]);

  useEffect(() => {
    // 1. Update 3D WebGL Scene if active
    if (renderMode === '3D_WEBGL' && scene3DRef.current) {
      scene3DRef.current.syncAndRender(matchState, stageOwnerKey);
    }

    // 2. Update 2D Canvas (Full Scene in 2D_HD_ATLAS mode, or Transparent HUD/Speech-Bubble/Cut-In Overlay in 3D_WEBGL mode)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const targetW = LOGICAL_WIDTH * dpr;
    const targetH = LOGICAL_HEIGHT * dpr;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const stageProfile = PHILOSOPHER_ROSTER[stageOwnerKey] || PHILOSOPHER_ROSTER.SOCRATES;
    const f1Profile =
      PHILOSOPHER_ROSTER[matchState.fighter1.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    const f2Profile =
      PHILOSOPHER_ROSTER[matchState.fighter2.philosopherKey] || PHILOSOPHER_ROSTER.NIETZSCHE;

    if (renderMode === '3D_WEBGL') {
      draw3DOverlayHUD(
        ctx,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        matchState,
        f1Profile,
        f2Profile,
        showHitboxes
      );
    } else {
      drawArenaScene(
        ctx,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        matchState,
        stageProfile,
        f1Profile,
        f2Profile,
        showHitboxes
      );
    }

    ctx.restore();
  }, [matchState, stageOwnerKey, showHitboxes, renderMode]);

  return (
    <div className="relative w-full aspect-[1200/520] bg-[#070A14] rounded-xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* Isolated Three.js WebGL Mount Container */}
      <div
        ref={webglMountRef}
        className={`absolute inset-0 w-full h-full ${
          renderMode === '3D_WEBGL' ? 'block' : 'hidden'
        }`}
      />

      {/* 2D Retina Canvas (Transparent HUD/Speech/Cut-In Overlay in 3D Mode, or Full HD-2D Scene) */}
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        className={`relative z-10 w-full h-full block pointer-events-none select-none ${
          renderMode === '3D_WEBGL' ? 'bg-transparent' : 'bg-[#090D16]'
        }`}
      />
    </div>
  );
};

function draw3DOverlayHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GameMatchState,
  f1Profile: PhilosopherProfile,
  f2Profile: PhilosopherProfile,
  showHitboxes: boolean
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  JuiceController.applyCameraTransform(ctx, state.frameNumber);

  // 1. Active Philosophical Stage Zones (Locke Territory, Plato Forms, Wittgenstein Silence, Marx Hazard)
  for (const zone of state.activeZones) {
    ctx.save();
    if (zone.type === 'LOCKE_TERRITORY') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = '#FDE68A';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('LOCKE SOVEREIGN PROPERTY ZONE', zone.x + 12, zone.y - 8);
    } else if (zone.type === 'PLATO_FORM') {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = '#BAE6FD';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('PLATONIC FORM', zone.x + 18, zone.y - 8);
    } else if (zone.type === 'WITTGENSTEIN_SILENCE') {
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('PROPOSITION 7: SILENCE ZONE', zone.x + 8, zone.y - 8);
    } else if (zone.type === 'MARX_HAZARD') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = '#FCA5A5';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('SURPLUS VALUE REDISTRIBUTION', zone.x + 8, zone.y - 8);
    }
    ctx.restore();
  }

  // 2. Live Spoken Philosophical Speech Bubbles above 3D Characters
  AdvancedSpriteRenderer.renderSpeechOverlayForFighter(ctx, state.fighter1, f1Profile, true);
  AdvancedSpriteRenderer.renderSpeechOverlayForFighter(ctx, state.fighter2, f2Profile, false);

  // 3. Optional Frame-Data Hitbox / Hurtbox Inspector
  if (showHitboxes) {
    drawDebugBoxes(ctx, state.fighter1);
    drawDebugBoxes(ctx, state.fighter2);
  }

  // 4. 2D Rune Particles, Super Cinema Cut-In Banners & Impact Overlays
  ParticleFxEngine.updateAndRender(ctx);
  JuiceController.renderImpactOverlays(ctx, width, height);

  // 5. Floating Hit Damage & Clash Callouts
  for (const effect of state.clashEffects) {
    ctx.save();
    const alpha = Math.min(1, effect.framesRemaining / 12);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 4.5;
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const textY = effect.y - 22 - (20 - effect.framesRemaining) * 1.6;
    ctx.strokeText(effect.label, effect.x, textY);
    ctx.fillText(effect.label, effect.x, textY);
    ctx.restore();
  }

  ctx.restore();
}

function drawArenaScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GameMatchState,
  stage: PhilosopherProfile,
  f1Profile: PhilosopherProfile,
  f2Profile: PhilosopherProfile,
  showHitboxes: boolean
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply Street Fighter / Mortal Kombat Screen-Shake Camera Transform
  JuiceController.applyCameraTransform(ctx, state.frameNumber);

  const { stagePalette } = stage;

  // 1. Multi-Stop Atmospheric Sky / Chamber Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, stagePalette.skyTop);
  skyGrad.addColorStop(0.62, stagePalette.skyBottom);
  skyGrad.addColorStop(1, '#090D16');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, GROUND_Y);

  // 2. Parallax Starfield, Volumetric God-Rays, Drifting Clouds & Weather Particles
  drawAtmosphericLighting(ctx, width, GROUND_Y, stage, state.frameNumber);

  // 3. Era-Authentic Masterpiece Architectural Backdrop, Monuments & Spectator Gallery
  drawStageArchitecture(ctx, width, GROUND_Y, stage, state.frameNumber);

  // 4. Polished Reflective 3D Perspective Checkered Marble Stage Floor
  const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, height);
  floorGrad.addColorStop(0, stagePalette.floorTop);
  floorGrad.addColorStop(0.48, stagePalette.floorBottom);
  floorGrad.addColorStop(1, '#050810');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);

  // 3D Perspective Checkered Marble Quads
  const rowOffsets = [0, 16, 36, 62, 92];
  for (let r = 0; r < rowOffsets.length - 1; r++) {
    const y1 = GROUND_Y + rowOffsets[r];
    const y2 = GROUND_Y + rowOffsets[r + 1];
    const t1 = (y1 - GROUND_Y) / (height - GROUND_Y);
    const t2 = (y2 - GROUND_Y) / (height - GROUND_Y);

    for (let c = 0; c < 12; c++) {
      if ((r + c) % 2 === 0) {
        const xTopL = c * 100;
        const xTopR = (c + 1) * 100;
        const xBotL = (c - 6) * 162 + width / 2;
        const xBotR = (c + 1 - 6) * 162 + width / 2;

        const qx1L = xTopL + (xBotL - xTopL) * t1;
        const qx1R = xTopR + (xBotR - xTopR) * t1;
        const qx2R = xTopR + (xBotR - xTopR) * t2;
        const qx2L = xTopL + (xBotL - xTopL) * t2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
        ctx.beginPath();
        ctx.moveTo(qx1L, y1);
        ctx.lineTo(qx1R, y1);
        ctx.lineTo(qx2R, y2);
        ctx.lineTo(qx2L, y2);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Perspective Floor Grid Lines
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= 12; i++) {
    const xTop = i * 100;
    const xBot = (i - 6) * 162 + width / 2;
    ctx.beginPath();
    ctx.moveTo(xTop, GROUND_Y);
    ctx.lineTo(xBot, height);
    ctx.stroke();
  }

  // Center Arena Sacred Inlaid Marble Medallion Seal
  ctx.save();
  ctx.translate(width / 2, GROUND_Y + 38);
  ctx.scale(1, 0.24);
  ctx.strokeStyle = stagePalette.accentGlow;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 155, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Glowing Arena Horizon Rail
  ctx.save();
  ctx.shadowColor = stagePalette.accentGlow;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = stagePalette.accentGlow;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(width, GROUND_Y);
  ctx.stroke();
  ctx.restore();

  // Render Floor Fracture Craters & Scorch Decals from Heavy Impacts
  JuiceController.renderFloorDecals(ctx);

  // Flanking Animated Bronze Fire Braziers
  drawBronzeBrazier(ctx, 88, GROUND_Y, state.frameNumber, stagePalette.accentGlow);
  drawBronzeBrazier(ctx, width - 88, GROUND_Y, state.frameNumber + 17, stagePalette.accentGlow);

  // Dramatic "SUPER FREEZE" Background Dimming when either Fighter unleashes a Special or Super
  const isSuperOrSpecActive =
    ((state.fighter1.currentMove === 'SUPER' || state.fighter1.currentMove === 'SPECIAL') &&
      (state.fighter1.attackState === 'STARTUP' || state.fighter1.attackState === 'ACTIVE')) ||
    ((state.fighter2.currentMove === 'SUPER' || state.fighter2.currentMove === 'SPECIAL') &&
      (state.fighter2.attackState === 'STARTUP' || state.fighter2.attackState === 'ACTIVE'));

  if (isSuperOrSpecActive) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.42)';
    ctx.fillRect(0, 0, width, height);
  }

  // 5. Draw Active Philosophical Stage Zones (Locke Territory, Plato Forms, Wittgenstein Silence, Marx Hazard)
  for (const zone of state.activeZones) {
    ctx.save();
    if (zone.type === 'LOCKE_TERRITORY') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.strokeStyle = '#F59E0B';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = '#FDE68A';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('LOCKE SOVEREIGN PROPERTY ZONE', zone.x + 12, zone.y - 8);
    } else if (zone.type === 'PLATO_FORM') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.strokeStyle = '#38BDF8';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const cx = zone.x + zone.width / 2;
      const cy = zone.y + zone.height / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + state.frameNumber * 0.025;
        const px = cx + Math.cos(angle) * 64;
        const py = cy + Math.sin(angle) * 64;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('PLATONIC FORM', zone.x + 18, zone.y - 8);
    } else if (zone.type === 'WITTGENSTEIN_SILENCE') {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('PROPOSITION 7: SILENCE ZONE', zone.x + 8, zone.y - 8);
    } else if (zone.type === 'MARX_HAZARD') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.strokeStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.fillStyle = '#FCA5A5';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText('SURPLUS VALUE REDISTRIBUTION', zone.x + 8, zone.y - 8);
    }
    ctx.restore();
  }

  // 6. Render Both High-Definition Arcade Fighters via MasterFighterRenderer (Skeletal + Cloth Physics + HD-2D)
  MasterFighterRenderer.render(
    ctx,
    state.fighter1,
    f1Profile.key,
    state.frameNumber,
    true
  );
  MasterFighterRenderer.render(
    ctx,
    state.fighter2,
    f2Profile.key,
    state.frameNumber,
    false
  );

  // 7. Optional Frame-Data Hitbox / Hurtbox Inspector Overlay
  if (showHitboxes) {
    drawDebugBoxes(ctx, state.fighter1);
    drawDebugBoxes(ctx, state.fighter2);
  }

  // 8. Render Shockwave Rings, Hit Sparks, Rune Particles, Impact Flashes & Super Cut-In Banners
  ParticleFxEngine.updateAndRender(ctx);
  JuiceController.renderImpactOverlays(ctx, width, height);

  // 9. Draw Floating Hit Damage & Clash Callouts
  for (const effect of state.clashEffects) {
    ctx.save();
    const alpha = Math.min(1, effect.framesRemaining / 12);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 4.5;
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const textY = effect.y - 22 - (20 - effect.framesRemaining) * 1.6;
    ctx.strokeText(effect.label, effect.x, textY);
    ctx.fillText(effect.label, effect.x, textY);
    ctx.restore();
  }

  // 10. Subtle Cinematic Edge Vignette for Depth & Contrast
  const vigGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.36,
    width / 2,
    height / 2,
    width * 0.62
  );
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(5, 8, 15, 0.44)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function drawBronzeBrazier(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  frame: number,
  glowColor: string
) {
  ctx.save();

  const flameFlicker = Math.sin(frame * 0.35) * 6;
  const fireGrad = ctx.createRadialGradient(x, groundY - 68, 4, x, groundY - 68, 68 + flameFlicker);
  fireGrad.addColorStop(0, 'rgba(254, 240, 138, 0.58)');
  fireGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.26)');
  fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fireGrad;
  ctx.beginPath();
  ctx.arc(x, groundY - 68, 68 + flameFlicker, 0, Math.PI * 2);
  ctx.fill();

  // Bronze tripod pedestal & bowl
  ctx.fillStyle = '#451A03';
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.8;
  ctx.fillRect(x - 10, groundY - 46, 20, 46);
  ctx.beginPath();
  ctx.moveTo(x - 24, groundY - 58);
  ctx.lineTo(x + 24, groundY - 58);
  ctx.lineTo(x + 14, groundY - 44);
  ctx.lineTo(x - 14, groundY - 44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Animated Dancing Flame Tongues
  const tongues = [-9, 0, 9];
  tongues.forEach((ox, idx) => {
    const h = 25 + Math.sin(frame * 0.42 + idx * 1.7) * 8;
    const sway = Math.cos(frame * 0.28 + idx) * 5;
    ctx.fillStyle = idx === 1 ? '#FEF08A' : '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(x + ox - 7, groundY - 58);
    ctx.quadraticCurveTo(x + ox + sway, groundY - 58 - h, x + ox + 7, groundY - 58);
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

function drawAtmosphericLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  stage: PhilosopherProfile,
  frame: number
) {
  ctx.save();
  const { stagePalette } = stage;

  // Starfield / Celestial Constellation Dots in Upper Sky
  ctx.fillStyle = '#F8FAFC';
  for (let s = 0; s < 28; s++) {
    const sx = (s * 137) % width;
    const sy = (s * 43) % (groundY * 0.55);
    const twinkle = 0.25 + 0.35 * Math.abs(Math.sin(frame * 0.05 + s));
    ctx.globalAlpha = twinkle;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Volumetric Diagonal Light Beams (God Rays)
  const rayGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.65, groundY);
  rayGrad.addColorStop(0, stagePalette.accentGlow);
  rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rayGrad;
  ctx.globalAlpha = 0.1;
  for (const rx of [180, 480, 780]) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 120, 0);
    ctx.lineTo(rx + 270, groundY);
    ctx.lineTo(rx + 95, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // Floating Ambient Particles (Golden dust motes / cherry blossoms / snow embers)
  ctx.fillStyle = stagePalette.accentGlow;
  ctx.globalAlpha = 0.58;
  for (let i = 0; i < 24; i++) {
    const px = ((i * 89 + frame * (0.65 + (i % 3) * 0.3)) % (width - 60)) + 30;
    const py = ((i * 47 + Math.sin(frame * 0.04 + i) * 32) % (groundY - 50)) + 25;
    const radius = (i % 3) + 1.5;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawStageArchitecture(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  stage: PhilosopherProfile,
  frame: number
) {
  const { stagePalette } = stage;
  ctx.save();

  // Celestial Rose Window / Sun Halo Centerpiece
  const orbGrad = ctx.createRadialGradient(width / 2, 150, 12, width / 2, 150, 160);
  orbGrad.addColorStop(0, stagePalette.accentGlow);
  orbGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.16)');
  orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(width / 2, 150, 160, 0, Math.PI * 2);
  ctx.fill();

  // Rotating Celestial Astrolabe / Rose Window Geometry Behind Centerpiece
  ctx.save();
  ctx.translate(width / 2, 150);
  ctx.rotate(frame * 0.004);
  ctx.strokeStyle = stagePalette.accentGlow;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 116, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 82, 0, Math.PI * 2);
  ctx.stroke();
  for (let r = 0; r < 12; r++) {
    const ang = (r * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 42, Math.sin(ang) * 42);
    ctx.lineTo(Math.cos(ang) * 116, Math.sin(ang) * 116);
    ctx.stroke();
  }
  ctx.restore();

  if (
    stagePalette.architectureStyle === 'greek_agora' ||
    stagePalette.architectureStyle === 'greek_academy' ||
    stagePalette.architectureStyle === 'greek_lyceum' ||
    stagePalette.architectureStyle === 'parliament' ||
    stagePalette.architectureStyle === 'berlin_lecture'
  ) {
    // Distant Acropolis / Temple Pediment Silhouette
    ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
    ctx.strokeStyle = stagePalette.architectureSecondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 245, groundY);
    ctx.lineTo(width / 2 - 245, 165);
    ctx.lineTo(width / 2, 86);
    ctx.lineTo(width / 2 + 245, 165);
    ctx.lineTo(width / 2 + 245, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Animated Philosopher Spectators in the Agora Gallery
    drawSpectatorSilhouettes(ctx, width, groundY, frame);

    // Fluted Classical Columns with 3D Shading & Vertical Fluting Grooves
    const colPositions = [145, 285, 425, 775, 915, 1055];
    for (const cx of colPositions) {
      const colGrad = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0);
      colGrad.addColorStop(0, stagePalette.architectureSecondary);
      colGrad.addColorStop(0.4, stagePalette.architecturePrimary);
      colGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = colGrad;
      ctx.fillRect(cx - 20, 88, 40, groundY - 88);

      // Vertical Fluting Grooves
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
      ctx.lineWidth = 1.2;
      for (const gx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(cx + gx, 94);
        ctx.lineTo(cx + gx, groundY - 18);
        ctx.stroke();
      }

      // Ionic Capital & Base Pedestal
      ctx.fillStyle = stagePalette.architectureSecondary;
      ctx.fillRect(cx - 28, 76, 56, 14);
      ctx.fillRect(cx - 30, groundY - 18, 60, 18);
    }

    // Upper Entablature Frieze Beam
    ctx.fillStyle = stagePalette.architectureSecondary;
    ctx.fillRect(80, 58, width - 160, 18);
  } else if (stagePalette.architectureStyle === 'chinese_courtyard') {
    const pillars = [160, 350, 850, 1040];
    for (const px of pillars) {
      const pilGrad = ctx.createLinearGradient(px - 16, 0, px + 16, 0);
      pilGrad.addColorStop(0, '#7F1D1D');
      pilGrad.addColorStop(0.5, '#DC2626');
      pilGrad.addColorStop(1, '#450A0A');
      ctx.fillStyle = pilGrad;
      ctx.fillRect(px - 16, 100, 32, groundY - 100);

      // Glowing Hanging Silk Lanterns
      const sway = Math.sin(frame * 0.06 + px) * 4;
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px + 34 + sway, 132, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Sweeping Imperial Tiled Roof
    ctx.fillStyle = '#451A03';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.quadraticCurveTo(width / 2, 60, width - 50, 110);
    ctx.lineTo(width - 30, 84);
    ctx.quadraticCurveTo(width / 2, 38, 30, 84);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (
    stagePalette.architectureStyle === 'sils_maria_cliff' ||
    stagePalette.architectureStyle === 'mountain_pass' ||
    stagePalette.architectureStyle === 'alpine_meadow'
  ) {
    // Distant Mountain Range Layer
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(140, 165);
    ctx.lineTo(310, 250);
    ctx.lineTo(490, 110);
    ctx.lineTo(710, 230);
    ctx.lineTo(920, 100);
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();

    // Foreground Jagged Alpine Glaciers
    const peakGrad = ctx.createLinearGradient(0, 80, 0, groundY);
    peakGrad.addColorStop(0, '#F8FAFC');
    peakGrad.addColorStop(0.35, stagePalette.architecturePrimary);
    peakGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = peakGrad;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(190, 125);
    ctx.lineTo(370, 285);
    ctx.lineTo(590, 82);
    ctx.lineTo(820, 265);
    ctx.lineTo(1020, 120);
    ctx.lineTo(width, groundY);
    ctx.closePath();
    ctx.fill();

    // Periodic Zarathustra Lightning Strike
    if (stagePalette.architectureStyle === 'sils_maria_cliff' && frame % 95 < 6) {
      ctx.save();
      ctx.strokeStyle = '#FEF08A';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(610, 10);
      ctx.lineTo(580, 95);
      ctx.lineTo(620, 135);
      ctx.lineTo(575, 225);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Grand Gothic / Enlightenment Study Archways & Animated Spectators
    drawSpectatorSilhouettes(ctx, width, groundY, frame);
    ctx.strokeStyle = stagePalette.architectureSecondary;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(85, 55, width - 170, groundY - 55);
    for (const ax of [240, 440, 760, 960]) {
      ctx.beginPath();
      ctx.moveTo(ax, 55);
      ctx.lineTo(ax, groundY);
      ctx.stroke();
    }
  }

  // Stage Title Plaque at Top Center
  ctx.fillStyle = 'rgba(9, 13, 22, 0.86)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(width / 2 - 235, 12, 470, 42, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = stagePalette.accentGlow;
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${stage.stageBackground.toUpperCase()} · ${stage.origin.toUpperCase()}`,
    width / 2,
    30
  );
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '400 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`“${stage.signaturePhilosophy}”`, width / 2, 46);

  ctx.restore();
}

function drawSpectatorSilhouettes(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  frame: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(9, 13, 22, 0.65)';
  const positions = [210, 345, 495, 555, 645, 705, 845, 985];
  positions.forEach((sx, i) => {
    const bob = Math.sin(frame * 0.12 + i * 1.3) * 3.5;
    ctx.beginPath();
    ctx.roundRect(sx - 14, groundY - 46 + bob, 28, 46 - bob, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, groundY - 54 + bob, 9.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDebugBoxes(ctx: CanvasRenderingContext2D, fighter: FighterState) {
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(fighter.hurtbox.x, fighter.hurtbox.y, fighter.hurtbox.width, fighter.hurtbox.height);
  ctx.strokeRect(fighter.hurtbox.x, fighter.hurtbox.y, fighter.hurtbox.width, fighter.hurtbox.height);

  if (fighter.activeHitbox) {
    ctx.strokeStyle = '#10B981';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.26)';
    ctx.lineWidth = 2.5;
    ctx.fillRect(
      fighter.activeHitbox.x,
      fighter.activeHitbox.y,
      fighter.activeHitbox.width,
      fighter.activeHitbox.height
    );
    ctx.strokeRect(
      fighter.activeHitbox.x,
      fighter.activeHitbox.y,
      fighter.activeHitbox.width,
      fighter.activeHitbox.height
    );
  }
  ctx.restore();
}
