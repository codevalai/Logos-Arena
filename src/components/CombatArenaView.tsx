import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CombatEngine,
  DeterministicAI,
  FighterFactory,
} from '../engine/DeterministicKernel';
import { RollbackManager } from '../engine/RollbackNetcode';
import { PHILOSOPHER_LIST, PHILOSOPHER_ROSTER } from '../engine/FighterRoster';
import {
  CampaignStage,
  GameMatchState,
  PlayerInput,
  RollbackTelemetry,
} from '../engine/types';
import { ArenaCanvas, ArenaRenderMode } from './ArenaCanvas';
import { PhilosopherPortrait } from './PhilosopherPortrait';
import { SoundEngine } from '../engine/SoundEngine';
import { JuiceController } from '../engine/JuiceController';
import { MobileControlsUI, VirtualTouchInputState } from '../engine/MobileControlsUI';
import { OnlineMatchConfig } from './OnlineLobbyView';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Volume2,
  VolumeX,
  Rewind,
  Swords,
  ArrowRight,
  MessageSquareQuote,
  Music,
  Box,
} from 'lucide-react';

export type CombatMode = 'STORY' | 'VERSUS_AI' | 'LOCAL_2P' | 'ONLINE_P2P' | 'NETCODE_SANDBOX';

interface CombatArenaViewProps {
  mode: CombatMode;
  p1Key: string;
  p2Key: string;
  onChangeP1: (key: string) => void;
  onChangeP2: (key: string) => void;
  onChangeMode: (mode: CombatMode) => void;
  campaignStage?: CampaignStage | null;
  onlineConfig?: OnlineMatchConfig | null;
  onCampaignMatchComplete?: (
    stage: CampaignStage,
    won: boolean,
    winMethod: 'LOGICAL_COUNTER' | 'WILLPOWER_BREAK' | 'TIME_OUT' | null
  ) => void;
}

export const CombatArenaView: React.FC<CombatArenaViewProps> = ({
  mode,
  p1Key,
  p2Key,
  onChangeP1,
  onChangeP2,
  onChangeMode,
  campaignStage,
  onlineConfig,
  onCampaignMatchComplete,
}) => {
  const effectiveP1 =
    mode === 'ONLINE_P2P' && onlineConfig ? onlineConfig.p1Philosopher : p1Key;
  const effectiveP2 =
    mode === 'STORY' && campaignStage
      ? campaignStage.opponentKey
      : mode === 'ONLINE_P2P' && onlineConfig
      ? onlineConfig.p2Philosopher
      : p2Key;

  const [matchState, setMatchState] = useState<GameMatchState>(() =>
    FighterFactory.createInitialMatchState(effectiveP1, effectiveP2)
  );
  const [telemetry, setTelemetry] = useState<RollbackTelemetry>({
    currentFrame: 0,
    rollbackCount: 0,
    lastRollbackDepth: 0,
    maxRollbackDepth: 0,
    localCrc32: 0,
    remoteCrc32: 0,
    fnv1aHash: 0,
    desyncDetected: false,
    simulatedPingMs: mode === 'NETCODE_SANDBOX' ? 65 : 0,
    ringBufferUtilization: 0,
    bytesPerSecond: 300,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [renderMode, setRenderMode] = useState<ArenaRenderMode>('3D_WEBGL');
  const [muted, setMuted] = useState(SoundEngine.isMuted());
  const [musicOn, setMusicOn] = useState(SoundEngine.isMusicEnabled());
  const [pickingSlot, setPickingSlot] = useState<'P1' | 'P2'>('P1');
  const [expandRosterGrid, setExpandRosterGrid] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(
    campaignStage ? campaignStage.aiDifficulty : 3
  );
  const [simulatedPing, setSimulatedPing] = useState(
    mode === 'NETCODE_SANDBOX' ? 65 : 0
  );
  const [showStoryIntroModal, setShowStoryIntroModal] = useState(
    mode === 'STORY' && Boolean(campaignStage)
  );

  const engineRef = useRef<CombatEngine>(
    new CombatEngine(FighterFactory.createInitialMatchState(effectiveP1, effectiveP2))
  );
  const rollbackRef = useRef<RollbackManager | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const prevP1HealthRef = useRef<number>(100);
  const prevP2HealthRef = useRef<number>(100);

  const initMatch = useCallback(() => {
    MobileControlsUI.clearAll();
    SoundEngine.clearSpeechBubbles();
    const initial = FighterFactory.createInitialMatchState(effectiveP1, effectiveP2);
    const engine = new CombatEngine(initial);
    engineRef.current = engine;
    prevP1HealthRef.current = initial.fighter1.health;
    prevP2HealthRef.current = initial.fighter2.health;

    const localSlot = mode === 'ONLINE_P2P' && onlineConfig ? onlineConfig.localSlot : 1;

    const rb = new RollbackManager(
      engine,
      localSlot,
      (binaryPacket) => {
        if (
          mode === 'ONLINE_P2P' &&
          onlineConfig?.ws &&
          onlineConfig.ws.readyState === WebSocket.OPEN
        ) {
          onlineConfig.ws.send(binaryPacket);
        }
      },
      (jsonPayload) => {
        if (
          mode === 'ONLINE_P2P' &&
          onlineConfig?.ws &&
          onlineConfig.ws.readyState === WebSocket.OPEN
        ) {
          onlineConfig.ws.send(JSON.stringify(jsonPayload));
        }
      }
    );

    rb.setSimulatedLatency(mode === 'NETCODE_SANDBOX' ? 65 : 0);
    rollbackRef.current = rb;
    setMatchState(engine.getState());
    setIsPaused(false);
  }, [effectiveP1, effectiveP2, mode, onlineConfig]);

  useEffect(() => {
    initMatch();
    if (mode === 'STORY' && campaignStage) {
      setShowStoryIntroModal(true);
      setAiDifficulty(campaignStage.aiDifficulty);
    } else {
      setShowStoryIntroModal(false);
    }
  }, [effectiveP1, effectiveP2, mode, campaignStage, initMatch]);

  useEffect(() => {
    if (mode !== 'ONLINE_P2P' || !onlineConfig?.ws) return;
    const ws = onlineConfig.ws;

    const handleMessage = (event: MessageEvent) => {
      if (!rollbackRef.current) return;
      if (event.data instanceof ArrayBuffer) {
        rollbackRef.current.receiveRemoteBinaryInput(event.data);
        return;
      }
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'CHECKSUM') {
            rollbackRef.current.receiveRemoteChecksum(msg.frame, msg.checksum);
          } else if (msg.type === 'REMATCH') {
            initMatch();
          }
        } catch {
          // Ignore malformed packet
        }
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [mode, onlineConfig, initMatch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
      }
      keysPressedRef.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Deterministic 60 FPS Fixed Timestep Loop with Hitstop Freeze
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const FIXED_DELTA_MS = 1000 / 60;

    const captureP1Input = (frame: number): PlayerInput => {
      const keys = keysPressedRef.current;
      const touch = MobileControlsUI.getCurrentInputs();
      const isOnlineGuest = mode === 'ONLINE_P2P' && onlineConfig?.localSlot === 2;

      if (isOnlineGuest) {
        return {
          frame,
          left: keys.has('KeyA') || keys.has('ArrowLeft') || touch.left,
          right: keys.has('KeyD') || keys.has('ArrowRight') || touch.right,
          up: keys.has('KeyW') || keys.has('ArrowUp') || touch.up,
          down: keys.has('KeyS') || keys.has('ArrowDown') || touch.down,
          lightAttack: keys.has('KeyJ') || touch.lightAttack,
          heavyAttack: keys.has('KeyK') || touch.heavyAttack,
          special: keys.has('KeyL') || touch.special,
          block: keys.has('KeyU') || keys.has('ShiftLeft') || touch.block,
        };
      }

      return {
        frame,
        left:
          keys.has('KeyA') ||
          (mode !== 'LOCAL_2P' && keys.has('ArrowLeft')) ||
          touch.left,
        right:
          keys.has('KeyD') ||
          (mode !== 'LOCAL_2P' && keys.has('ArrowRight')) ||
          touch.right,
        up:
          keys.has('KeyW') ||
          (mode !== 'LOCAL_2P' && keys.has('ArrowUp')) ||
          touch.up,
        down:
          keys.has('KeyS') ||
          (mode !== 'LOCAL_2P' && keys.has('ArrowDown')) ||
          touch.down,
        lightAttack: keys.has('KeyJ') || touch.lightAttack,
        heavyAttack: keys.has('KeyK') || touch.heavyAttack,
        special: keys.has('KeyL') || touch.special,
        block: keys.has('KeyU') || keys.has('ShiftLeft') || touch.block,
      };
    };

    const captureP2LocalInput = (frame: number): PlayerInput => {
      const keys = keysPressedRef.current;
      return {
        frame,
        left: keys.has('ArrowLeft'),
        right: keys.has('ArrowRight'),
        up: keys.has('ArrowUp'),
        down: keys.has('ArrowDown'),
        lightAttack: keys.has('Digit1') || keys.has('Numpad1'),
        heavyAttack: keys.has('Digit2') || keys.has('Numpad2'),
        special: keys.has('Digit3') || keys.has('Numpad3'),
        block: keys.has('Digit0') || keys.has('Numpad0'),
      };
    };

    const loop = (currentTime: number) => {
      const delta = Math.min(100, currentTime - lastTime);
      lastTime = currentTime;

      if (!isPaused && !showStoryIntroModal && rollbackRef.current) {
        accumulator += delta;
        let stepped = false;

        while (accumulator >= FIXED_DELTA_MS) {
          if (JuiceController.consumeHitstopTick()) {
            accumulator -= FIXED_DELTA_MS;
            stepped = true;
            continue;
          }

          const currentEngine = engineRef.current;
          const st = currentEngine.getState();

          if (!st.isGameOver && !st.isRoundOver) {
            const frame = st.frameNumber;
            const prevP1State = st.fighter1.attackState;
            const prevP2State = st.fighter2.attackState;

            const localInput = captureP1Input(frame);
            rollbackRef.current.registerLocalInput(frame, localInput);

            if (mode === 'LOCAL_2P') {
              const p2Input = captureP2LocalInput(frame);
              rollbackRef.current.advanceFrame(frame, p2Input);
            } else if (mode === 'ONLINE_P2P') {
              rollbackRef.current.advanceFrame(frame);
            } else {
              const aiInput = DeterministicAI.computeInput(st, aiDifficulty);
              rollbackRef.current.advanceFrame(frame, aiInput);
            }

            const updated = currentEngine.getState();

            // 1. Opening Round Thesis Declaration
            if (updated.frameNumber === 10) {
              const opener = updated.roundNumber % 2 === 1 ? updated.fighter1 : updated.fighter2;
              SoundEngine.triggerPhilosopherQuote(opener.id, opener.philosopherKey, 'INTRO', true);
            }

            // 2. Detect Attack Startup for P1 & P2 (Swings, Specials, Supers & Live Philosophy Quotes)
            if (updated.fighter1.attackState === 'STARTUP' && prevP1State !== 'STARTUP') {
              const mv = updated.fighter1.currentMove;
              const prof = PHILOSOPHER_ROSTER[updated.fighter1.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
              if (mv === 'SUPER') {
                SoundEngine.playSuperActivate(updated.fighter1.philosopherKey);
                const b = SoundEngine.triggerPhilosopherQuote('player1', updated.fighter1.philosopherKey, 'SUPER', true);
                JuiceController.triggerSuperCutIn(
                  prof.name,
                  prof.superMoveName,
                  b?.quote || prof.signaturePhilosophy,
                  prof.stagePalette.accentGlow,
                  false
                );
              } else if (mv === 'SPECIAL') {
                SoundEngine.playSpecial(updated.fighter1.philosopherKey);
                const b = SoundEngine.triggerPhilosopherQuote('player1', updated.fighter1.philosopherKey, 'SPECIAL');
                if (b) {
                  JuiceController.triggerSuperCutIn(
                    prof.name,
                    prof.specialAbilityName,
                    b.quote,
                    prof.stagePalette.accentGlow,
                    false
                  );
                }
              } else if (mv === 'HEAVY') {
                SoundEngine.playSwing(true);
              } else if (mv === 'LIGHT') {
                SoundEngine.playSwing(false);
              }
            }

            if (updated.fighter2.attackState === 'STARTUP' && prevP2State !== 'STARTUP') {
              const mv = updated.fighter2.currentMove;
              const prof = PHILOSOPHER_ROSTER[updated.fighter2.philosopherKey] || PHILOSOPHER_ROSTER.NIETZSCHE;
              if (mv === 'SUPER') {
                SoundEngine.playSuperActivate(updated.fighter2.philosopherKey);
                const b = SoundEngine.triggerPhilosopherQuote('player2', updated.fighter2.philosopherKey, 'SUPER', true);
                JuiceController.triggerSuperCutIn(
                  prof.name,
                  prof.superMoveName,
                  b?.quote || prof.signaturePhilosophy,
                  prof.stagePalette.accentGlow,
                  true
                );
              } else if (mv === 'SPECIAL') {
                SoundEngine.playSpecial(updated.fighter2.philosopherKey);
                const b = SoundEngine.triggerPhilosopherQuote('player2', updated.fighter2.philosopherKey, 'SPECIAL');
                if (b) {
                  JuiceController.triggerSuperCutIn(
                    prof.name,
                    prof.specialAbilityName,
                    b.quote,
                    prof.stagePalette.accentGlow,
                    true
                  );
                }
              } else if (mv === 'HEAVY') {
                SoundEngine.playSwing(true);
              } else if (mv === 'LIGHT') {
                SoundEngine.playSwing(false);
              }
            }

            // 3. Detect Dialectical Clash
            if (
              updated.clashEffects.some(
                (c) => c.label === 'DIALECTICAL CLASH!' && c.framesRemaining === 24
              )
            ) {
              SoundEngine.playClash();
            }

            // 4. Detect Hits, Blocks & Mid-Combo Philosophical Declarations
            if (
              updated.fighter1.health < prevP1HealthRef.current ||
              updated.fighter2.health < prevP2HealthRef.current
            ) {
              const p1HitP2 = updated.fighter2.health < prevP2HealthRef.current;
              const attacker = p1HitP2 ? updated.fighter1 : updated.fighter2;
              const deltaDmg =
                prevP1HealthRef.current -
                updated.fighter1.health +
                (prevP2HealthRef.current - updated.fighter2.health);

              if (deltaDmg >= 14) {
                SoundEngine.playHit(true, attacker.comboCount);
                SoundEngine.triggerPhilosopherQuote(attacker.id, attacker.philosopherKey, 'ATTACK');
              } else if (deltaDmg >= 5) {
                SoundEngine.playHit(false, attacker.comboCount);
                if (attacker.comboCount >= 2) {
                  SoundEngine.triggerPhilosopherQuote(attacker.id, attacker.philosopherKey, 'ATTACK');
                }
              } else {
                SoundEngine.playBlock();
              }

              prevP1HealthRef.current = updated.fighter1.health;
              prevP2HealthRef.current = updated.fighter2.health;
            }

            // 5. Round KO Gong & Victory Philosophy Declaration
            if (updated.isRoundOver && !st.isRoundOver) {
              SoundEngine.playKO();
              const winFighter =
                updated.fighter1.health > 0 ? updated.fighter1 : updated.fighter2;
              SoundEngine.triggerPhilosopherQuote(
                winFighter.id,
                winFighter.philosopherKey,
                'VICTORY',
                true
              );
            }

            stepped = true;
          }

          accumulator -= FIXED_DELTA_MS;
        }

        if (stepped) {
          setMatchState({ ...engineRef.current.getState() });
          setTelemetry(rollbackRef.current.getTelemetry());
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, showStoryIntroModal, mode, aiDifficulty, onlineConfig]);

  const handleNextRound = () => {
    engineRef.current.resetForNextRound();
    const st = engineRef.current.getState();
    prevP1HealthRef.current = st.fighter1.health;
    prevP2HealthRef.current = st.fighter2.health;
    setMatchState({ ...st });
  };

  const handleTouchHold = (prop: keyof VirtualTouchInputState, active: boolean) => {
    MobileControlsUI.setInput(prop, active, false);
  };

  const handleTouchPulse = (prop: keyof VirtualTouchInputState) => {
    MobileControlsUI.setInput(prop, true, true);
  };

  const handleTriggerSuper = () => {
    MobileControlsUI.setInput('special', true, true);
    MobileControlsUI.setInput('heavyAttack', true, true);
  };

  const handleSpeakPhilosophyNow = () => {
    const f1State = engineRef.current.getState().fighter1;
    const prof = PHILOSOPHER_ROSTER[f1State.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    const bubble = SoundEngine.triggerPhilosopherQuote(
      'player1',
      f1State.philosopherKey,
      'SPECIAL',
      true
    );
    if (bubble) {
      JuiceController.triggerSuperCutIn(
        prof.name,
        'PHILOSOPHICAL MAXIM',
        bubble.quote,
        prof.stagePalette.accentGlow,
        false
      );
    }
    setMatchState({ ...engineRef.current.getState() });
  };

  const f1 = matchState.fighter1;
  const f2 = matchState.fighter2;
  const p1Profile = PHILOSOPHER_ROSTER[f1.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
  const p2Profile = PHILOSOPHER_ROSTER[f2.philosopherKey] || PHILOSOPHER_ROSTER.NIETZSCHE;

  const p1HealthPct = Math.round((f1.health / f1.maxHealth) * 100);
  const p2HealthPct = Math.round((f2.health / f2.maxHealth) * 100);
  const p1StateLabel = p1HealthPct > 60 ? 'STABLE' : p1HealthPct > 25 ? 'PRESSURED' : 'CRITICAL';
  const p2StateLabel = p2HealthPct > 60 ? 'STABLE' : p2HealthPct > 25 ? 'PRESSURED' : 'CRITICAL';

  const secondsRemaining = Math.ceil(matchState.timerFrames / 60);

  return (
    <div className="max-w-[1360px] mx-auto px-3 sm:px-6 py-3 space-y-3">
      {/* Workspace Mode & Matchup Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          {(
            [
              { id: 'VERSUS_AI', label: 'Versus AI' },
              { id: 'STORY', label: 'Story Mode' },
              { id: 'LOCAL_2P', label: 'Local 2-Player' },
              { id: 'NETCODE_SANDBOX', label: 'Rollback Lab' },
            ] as { id: CombatMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChangeMode(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === m.id
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Interactive Face + Name Fighter Pickers & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={mode === 'ONLINE_P2P'}
            onClick={() => {
              setPickingSlot('P1');
              setExpandRosterGrid((prev) => (pickingSlot === 'P1' ? !prev : true));
            }}
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
              pickingSlot === 'P1'
                ? 'bg-sky-500/15 border-sky-400 text-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <PhilosopherPortrait philosopherKey={effectiveP1} size="xs" />
            <div className="text-left">
              <span className="text-[10px] font-mono text-sky-400 block leading-none">
                P1 FIGHTER
              </span>
              <span className="font-semibold text-slate-100">{p1Profile.name} ▾</span>
            </div>
          </button>

          <span className="text-xs text-slate-500 font-mono">vs</span>

          <button
            type="button"
            disabled={mode === 'STORY' || mode === 'ONLINE_P2P'}
            onClick={() => {
              setPickingSlot('P2');
              setExpandRosterGrid((prev) => (pickingSlot === 'P2' ? !prev : true));
            }}
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
              pickingSlot === 'P2'
                ? 'bg-rose-500/15 border-rose-400 text-slate-100'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <PhilosopherPortrait philosopherKey={effectiveP2} size="xs" />
            <div className="text-left">
              <span className="text-[10px] font-mono text-rose-400 block leading-none">
                P2 OPPONENT
              </span>
              <span className="font-semibold text-slate-100">{p2Profile.name} ▾</span>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-1.5 border-l border-slate-800 pl-2">
            <button
              type="button"
              onClick={() =>
                setRenderMode((m) => (m === '3D_WEBGL' ? '2D_HD_ATLAS' : '3D_WEBGL'))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 ${
                renderMode === '3D_WEBGL'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400/50 hover:bg-purple-500/30'
                  : 'bg-sky-500/20 text-sky-200 border-sky-400/50 hover:bg-sky-500/30'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              {renderMode === '3D_WEBGL' ? '3D WebGL Cel' : 'HD-2D Atlas'}
            </button>

            <button
              type="button"
              onClick={handleSpeakPhilosophyNow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquareQuote className="w-3.5 h-3.5" />
              Speak Quote
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMusic = SoundEngine.toggleMusic();
                setMusicOn(nextMusic);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                musicOn
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              Music
            </button>

            <button
              type="button"
              onClick={() => setShowHitboxes((h) => !h)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                showHitboxes
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Hitboxes
            </button>

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMute = !muted;
                setMuted(nextMute);
                SoundEngine.setMuted(nextMute);
                if (nextMute) setMusicOn(false);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors whitespace-nowrap shrink-0"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={initMatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Visual 21-Philosopher Faces + Names Character Select Strip / Expandable Grid */}
      {mode !== 'ONLINE_P2P' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Choose Fighter (Faces & Names):</span>
              <button
                type="button"
                onClick={() => setPickingSlot('P1')}
                className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
                  pickingSlot === 'P1'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-sky-300 hover:bg-slate-700'
                }`}
              >
                Picking P1: {p1Profile.name}
              </button>
              {mode !== 'STORY' && (
                <button
                  type="button"
                  onClick={() => setPickingSlot('P2')}
                  className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
                    pickingSlot === 'P2'
                      ? 'bg-rose-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                  }`}
                >
                  Picking P2: {p2Profile.name}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setExpandRosterGrid((g) => !g)}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
            >
              {expandRosterGrid ? 'Collapse to Single Ribbon ▲' : 'Expand All 21 Faces Grid ▼'}
            </button>
          </div>

          <div
            className={
              expandRosterGrid
                ? 'grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 pt-1'
                : 'flex items-center gap-2 overflow-x-auto pb-1 pt-0.5'
            }
          >
            {PHILOSOPHER_LIST.map((phil) => {
              const isP1Selected = effectiveP1 === phil.key;
              const isP2Selected = effectiveP2 === phil.key;
              return (
                <button
                  key={phil.key}
                  type="button"
                  onClick={() => {
                    if (pickingSlot === 'P2' && mode !== 'STORY') {
                      onChangeP2(phil.key);
                      SoundEngine.triggerPhilosopherQuote('player2', phil.key, 'INTRO', true);
                    } else {
                      onChangeP1(phil.key);
                      SoundEngine.triggerPhilosopherQuote('player1', phil.key, 'INTRO', true);
                    }
                  }}
                  className={`group relative flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all shrink-0 ${
                    expandRosterGrid ? 'w-full' : 'w-40'
                  } ${
                    isP1Selected && isP2Selected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                      : isP1Selected
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md'
                      : isP2Selected
                      ? 'bg-rose-500/20 border-rose-400 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <PhilosopherPortrait philosopherKey={phil.key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {isP1Selected && (
                        <span className="px-1 py-0.2 bg-sky-500 text-slate-950 font-mono font-bold text-[9px] rounded">
                          P1
                        </span>
                      )}
                      {isP2Selected && (
                        <span className="px-1 py-0.2 bg-rose-500 text-slate-950 font-mono font-bold text-[9px] rounded">
                          P2
                        </span>
                      )}
                      <span className="text-xs font-semibold truncate">{phil.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {phil.specialAbilityName}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Combat HUD */}
      <div className="grid grid-cols-12 items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
        {/* Player 1 Health & Meter */}
        <div className="col-span-5 flex items-center gap-3">
          <div className="hidden sm:block">
            <PhilosopherPortrait philosopherKey={f1.philosopherKey} size="md" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-sm font-bold text-slate-100 font-display">
                  {f1.name}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  Wins: {matchState.p1RoundsWon}/2
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-sky-300 shrink-0">
                HP: {f1.health}/{f1.maxHealth} · {p1StateLabel}
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-950 rounded overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-transform duration-100 origin-left"
                style={{ transform: `scaleX(${Math.max(0, f1.health / f1.maxHealth)})` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <span className="text-amber-300">
                Meter: {f1.meter}/100 {f1.meter >= 100 ? '· SUPER READY' : ''}
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Dmg x{f1.damageMultiplier}
                {f1.comboCount > 1 ? ` · ${f1.comboCount}x COMBO` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center Match Timer & Round Counter */}
        <div className="col-span-2 text-center space-y-0.5">
          <div className="text-[11px] font-mono text-amber-400">
            ROUND 0{matchState.roundNumber}
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100">
            {String(secondsRemaining).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono tabular-nums text-slate-400">
            Tick #{matchState.frameNumber}
          </div>
        </div>

        {/* Player 2 Health & Meter */}
        <div className="col-span-5 flex items-center gap-3 flex-row-reverse text-right">
          <div className="hidden sm:block">
            <PhilosopherPortrait philosopherKey={f2.philosopherKey} size="md" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-row-reverse">
              <div className="truncate">
                <span className="text-sm font-bold text-slate-100 font-display">
                  {f2.name}
                </span>
                <span className="text-xs text-slate-400 mr-2">
                  Wins: {matchState.p2RoundsWon}/2 ·
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-rose-300 shrink-0">
                HP: {f2.health}/{f2.maxHealth} · {p2StateLabel}
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-950 rounded overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-l from-rose-500 to-amber-500 transition-transform duration-100 origin-right"
                style={{ transform: `scaleX(${Math.max(0, f2.health / f2.maxHealth)})` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-row-reverse text-[11px] font-mono tabular-nums">
              <span className="text-amber-300">
                Meter: {f2.meter}/100
              </span>
              <span className="text-slate-400 hidden sm:inline">
                Dmg x{f2.damageMultiplier}
                {f2.silenceFrames > 0 ? ' · SILENCED' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 100% Unobstructed 60 FPS Fighting Screen */}
      <div id="arena-screen-wrapper" className="relative select-none">
        <ArenaCanvas
          matchState={matchState}
          stageOwnerKey={f2.philosopherKey}
          showHitboxes={showHitboxes}
          renderMode={renderMode}
        />

        {/* Pre-Match Story Mode Intro Dialogue Modal */}
        {showStoryIntroModal && campaignStage && (
          <div className="absolute inset-0 bg-slate-950/95 rounded-xl flex items-center justify-center p-6 z-20">
            <div className="max-w-xl w-full bg-slate-900 border border-amber-500/60 rounded-xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-amber-400 font-medium">
                    {campaignStage.era} · {campaignStage.stageBackground}
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 font-display">
                    {campaignStage.chapterTitle}
                  </h2>
                </div>
                <PhilosopherPortrait philosopherKey={campaignStage.opponentKey} size="sm" />
              </div>

              <div className="space-y-3">
                {campaignStage.introDialogue.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs leading-relaxed"
                  >
                    <span
                      className={`font-semibold ${
                        node.role === 'opponent' ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      {node.speaker}:{' '}
                    </span>
                    <span className="text-slate-200">“{node.text}”</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <strong>Match Rule:</strong> {campaignStage.matchRuleDescription}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowStoryIntroModal(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  <Swords className="w-4 h-4" />
                  Begin Dialectical Duel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Round Over / Victory Modal Overlay */}
        {(matchState.isRoundOver || matchState.isGameOver) && (
          <div className="absolute inset-0 bg-slate-950/95 rounded-xl flex items-center justify-center p-6 z-20">
            <div className="max-w-lg w-full bg-slate-900 border border-amber-500/70 rounded-xl p-6 space-y-5 text-center shadow-2xl">
              <div className="text-xs font-mono text-amber-400">
                {matchState.isGameOver ? 'MATCH DECIDED' : `ROUND 0${matchState.roundNumber} COMPLETE`} ·{' '}
                {matchState.winMethod === 'LOGICAL_COUNTER'
                  ? 'LOGICAL SPECIAL FINISHER'
                  : matchState.winMethod === 'WILLPOWER_BREAK'
                  ? 'WILLPOWER STRIKE KO'
                  : 'TIME EXPIRATION'}
              </div>

              <h2 className="text-3xl font-bold text-slate-100 font-display">
                {matchState.winner} Triumphs!
              </h2>

              <p className="text-xs italic text-slate-300 px-4">
                “
                {matchState.winner === f1.name
                  ? p1Profile.signaturePhilosophy
                  : p2Profile.signaturePhilosophy}
                ”
              </p>

              {mode === 'STORY' && campaignStage && matchState.isGameOver && (
                <div className="text-left p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="text-amber-400 font-semibold">
                    {matchState.winMethod === 'LOGICAL_COUNTER'
                      ? 'Logical Counter Branch Unlocked:'
                      : 'Willpower Branch Unlocked:'}
                  </div>
                  {(matchState.winMethod === 'LOGICAL_COUNTER'
                    ? campaignStage.logicalVictoryOutro
                    : campaignStage.willpowerVictoryOutro
                  ).map((d, i) => (
                    <p key={i} className="text-slate-200">
                      <strong className="text-rose-400">{d.speaker}:</strong> “{d.text}”
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!matchState.isGameOver ? (
                  <button
                    type="button"
                    onClick={handleNextRound}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                  >
                    Start Round 0{matchState.roundNumber + 1}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        initMatch();
                        if (
                          mode === 'ONLINE_P2P' &&
                          onlineConfig?.ws &&
                          onlineConfig.ws.readyState === WebSocket.OPEN
                        ) {
                          onlineConfig.ws.send(JSON.stringify({ type: 'REMATCH' }));
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Play Again
                    </button>

                    {mode === 'STORY' && campaignStage && onCampaignMatchComplete && (
                      <button
                        type="button"
                        onClick={() =>
                          onCampaignMatchComplete(
                            campaignStage,
                            matchState.winner === f1.name,
                            matchState.winMethod
                          )
                        }
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                      >
                        Advance Story Campaign
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Arcade Control Deck Placed Cleanly BELOW the Fighting Screen */}
      <div
        id="virtual-gamepad"
        className="bg-slate-900/95 border border-slate-800 rounded-2xl px-4 sm:px-8 py-4 shadow-xl select-none touch-none"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left Thumb Zone: 3x3 D-Pad + Center Guard */}
          <div
            id="d-pad"
            className="grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 shrink-0"
          >
            <div />
            <button
              type="button"
              aria-label="Jump"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchPulse('up');
              }}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 text-white text-xl font-bold flex items-center justify-center active:scale-95 active:bg-amber-500 active:text-slate-950 active:border-amber-300 shadow-md"
            >
              ↑
            </button>
            <div />

            <button
              type="button"
              aria-label="Move Left"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchHold('left', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTouchHold('left', false);
              }}
              onPointerLeave={() => handleTouchHold('left', false)}
              onPointerCancel={() => handleTouchHold('left', false)}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 text-white text-xl font-bold flex items-center justify-center active:scale-95 active:bg-amber-500 active:text-slate-950 active:border-amber-300 shadow-md"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Guard"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchHold('block', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTouchHold('block', false);
              }}
              onPointerLeave={() => handleTouchHold('block', false)}
              onPointerCancel={() => handleTouchHold('block', false)}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-sky-900/90 hover:bg-sky-800 border-2 border-sky-400 text-sky-100 text-[10px] sm:text-xs font-bold flex items-center justify-center active:scale-95 active:bg-sky-400 active:text-slate-950 shadow-md"
            >
              GUARD
            </button>
            <button
              type="button"
              aria-label="Move Right"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchHold('right', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTouchHold('right', false);
              }}
              onPointerLeave={() => handleTouchHold('right', false)}
              onPointerCancel={() => handleTouchHold('right', false)}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 text-white text-xl font-bold flex items-center justify-center active:scale-95 active:bg-amber-500 active:text-slate-950 active:border-amber-300 shadow-md"
            >
              →
            </button>

            <div />
            <button
              type="button"
              aria-label="Crouch"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchHold('down', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                handleTouchHold('down', false);
              }}
              onPointerLeave={() => handleTouchHold('down', false)}
              onPointerCancel={() => handleTouchHold('down', false)}
              className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-500 text-white text-xl font-bold flex items-center justify-center active:scale-95 active:bg-amber-500 active:text-slate-950 active:border-amber-300 shadow-md"
            >
              ↓
            </button>
            <div />
          </div>

          {/* Center Live Combat Feed & Combo Guide (Visible on Desktop/Tablet) */}
          <div className="hidden md:flex flex-col items-center justify-center text-center px-4 space-y-1.5 flex-1 min-w-0">
            <div className="text-xs font-mono font-semibold text-amber-400 truncate max-w-full">
              {matchState.lastHitDescription}
            </div>
            <div className="text-xs text-slate-300">
              Combo Chain: <strong className="text-rose-400">PUNCH</strong> →{' '}
              <strong className="text-sky-400">KICK</strong> →{' '}
              <strong className="text-amber-400">SPECIAL</strong> ({p1Profile.specialAbilityName})
            </div>
            <div className="text-[11px] text-slate-400 max-w-md truncate">
              {p1Profile.specialMechanicSummary}
            </div>
          </div>

          {/* Right Thumb Zone: Large Arcade Action Buttons (PUNCH, KICK, SPECIAL, SUPER) */}
          <div
            id="action-buttons"
            className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-4 shrink-0"
          >
            <button
              type="button"
              id="btn-punch"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchPulse('lightAttack');
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 border-3 border-white text-white font-bold text-xs sm:text-sm shadow-lg active:scale-92 transition-transform flex flex-col items-center justify-center"
            >
              <span>PUNCH</span>
              <span className="text-[10px] font-mono opacity-85">
                {p1Profile.lightMove.startupFrames}f
              </span>
            </button>

            <button
              type="button"
              id="btn-kick"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchPulse('heavyAttack');
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-600 hover:bg-sky-500 border-3 border-white text-white font-bold text-xs sm:text-sm shadow-lg active:scale-92 transition-transform flex flex-col items-center justify-center"
            >
              <span>KICK</span>
              <span className="text-[10px] font-mono opacity-85">
                {p1Profile.heavyMove.startupFrames}f
              </span>
            </button>

            <button
              type="button"
              id="btn-spec"
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchPulse('special');
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 hover:bg-amber-300 border-3 border-white text-slate-950 font-bold text-xs sm:text-sm shadow-lg active:scale-92 transition-transform flex flex-col items-center justify-center"
            >
              <span>SPECIAL</span>
              <span className="text-[10px] font-mono opacity-85">20M</span>
            </button>

            <button
              type="button"
              id="btn-super"
              disabled={f1.meter < 100}
              onPointerDown={(e) => {
                e.preventDefault();
                if (f1.meter >= 100) handleTriggerSuper();
              }}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 font-bold text-xs sm:text-sm shadow-lg transition-transform flex flex-col items-center justify-center ${
                f1.meter >= 100
                  ? 'bg-purple-600 hover:bg-purple-500 border-amber-300 text-white active:scale-92'
                  : 'bg-slate-800/70 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              <span>SUPER</span>
              <span className="text-[10px] font-mono">100M</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deterministic Rollback & CRC32 Telemetry Strip */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono tabular-nums">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <span>
            CRC32: <strong className="text-emerald-400">0x{telemetry.localCrc32.toString(16).toUpperCase().padStart(8, '0')}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            FNV-1a: <strong className="text-sky-400">0x{telemetry.fnv1aHash.toString(16).toUpperCase().padStart(8, '0')}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Rollbacks: <strong className="text-amber-300">{telemetry.rollbackCount}</strong> (depth {telemetry.lastRollbackDepth}f / max {telemetry.maxRollbackDepth}f)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-slate-400">
            <span>Simulated Lag: {simulatedPing}ms</span>
            <input
              type="range"
              min={0}
              max={140}
              step={10}
              value={simulatedPing}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimulatedPing(val);
                rollbackRef.current?.setSimulatedLatency(val);
              }}
              className="w-24 accent-amber-500"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (rollbackRef.current) {
                rollbackRef.current.forceSimulatedRollback(8);
                setTelemetry(rollbackRef.current.getTelemetry());
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Rewind className="w-3 h-3" />
            Test 8-Frame Rollback
          </button>
        </div>
      </div>
    </div>
  );
};
