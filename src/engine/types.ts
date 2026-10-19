export type EraCategory =
  | 'Ancient Philosophy'
  | 'Medieval & Renaissance'
  | 'Enlightenment'
  | '19th & 20th Century';

export type AttackState =
  | 'IDLE'
  | 'WALK'
  | 'JUMP'
  | 'CROUCH'
  | 'STARTUP'
  | 'ACTIVE'
  | 'RECOVERY'
  | 'HITSTUN'
  | 'BLOCKSTUN'
  | 'KNOCKDOWN';

export type AttackMoveType = 'NONE' | 'LIGHT' | 'HEAVY' | 'SPECIAL' | 'SUPER';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MoveFrameData {
  name: string;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  hitstunDuration: number;
  blockstunDuration: number;
  damage: number;
  chipDamage: number;
  meterGain: number;
  rangeX: number;
  rangeY: number;
  pushback: number;
}

export interface PhilosopherVisualConfig {
  primaryRobe: string;
  secondaryTrim: string;
  skinTone: string;
  hairColor: string;
  beardStyle: 'full' | 'long_white' | 'goatee' | 'mustache' | 'stubble' | 'clean';
  headwear: 'none' | 'laurel' | 'scholar_cap' | 'mitre' | 'florentine_cap' | ' skullcap' | 'wig' | 'rustic_cap' | 'tricorn' | 'top_hat' | 'beret';
  accessory: 'scroll' | 'polyhedron' | 'compass' | 'staff' | 'bamboo' | 'chalice' | 'tome' | 'dagger' | 'grid' | 'lens' | 'gavel' | 'billiard' | 'broken_chain' | 'clock' | 'dialectic_triad' | 'hammer_gear' | 'lantern' | 'lightning' | 'cigarette' | 'logic_brackets';
}

export interface StagePalette {
  skyTop: string;
  skyBottom: string;
  architecturePrimary: string;
  architectureSecondary: string;
  floorTop: string;
  floorBottom: string;
  accentGlow: string;
  architectureStyle:
    | 'greek_agora'
    | 'greek_academy'
    | 'greek_lyceum'
    | 'chinese_courtyard'
    | 'mountain_pass'
    | 'athens_garden'
    | 'cathedral_hippo'
    | 'scriptorium'
    | 'florentine_palazzo'
    | 'dutch_study'
    | 'lens_workshop'
    | 'parliament'
    | 'edinburgh_salon'
    | 'alpine_meadow'
    | 'konigsberg_street'
    | 'berlin_lecture'
    | 'london_docks'
    | 'copenhagen_fog'
    | 'sils_maria_cliff'
    | 'paris_cafe'
    | 'cambridge_room';
}

export interface PhilosopherProfile {
  key: string;
  name: string;
  years: string;
  era: EraCategory;
  origin: string;
  stageBackground: string;
  stageDescription: string;
  attireDescription: string;
  signaturePhilosophy: string;
  fightingStyle: string;
  specialAbilityName: string;
  specialMechanicSummary: string;
  superMoveName: string;
  walkSpeed: number;
  jumpVelocity: number;
  maxHealth: number;
  lightMove: MoveFrameData;
  heavyMove: MoveFrameData;
  specialMove: MoveFrameData;
  visual: PhilosopherVisualConfig;
  stagePalette: StagePalette;
}

export interface ActiveZone {
  ownerId: string;
  philosopherKey: string;
  type: 'LOCKE_TERRITORY' | 'PLATO_FORM' | 'DESCARTES_GRID' | 'WITTGENSTEIN_SILENCE' | 'MARX_HAZARD';
  x: number;
  y: number;
  width: number;
  height: number;
  remainingFrames: number;
}

export interface FighterState {
  id: string;
  philosopherKey: string;
  name: string;
  position: Vector2D;
  velocity: Vector2D;
  grounded: boolean;
  crouching: boolean;
  blocking: boolean;
  health: number;
  maxHealth: number;
  meter: number;
  maxMeter: number;
  facingRight: boolean;
  attackState: AttackState;
  currentMove: AttackMoveType;
  currentAnimFrame: number;
  frameTimer: number;
  totalMoveFrames: number;
  activeHitbox: Box | null;
  hurtbox: Box;
  hitConfirmedThisMove: boolean;
  comboCount: number;
  lastMoveUsed: AttackMoveType;
  consecutiveMoveCount: number;
  // Special Philosophical Status Effects
  aporiaReversedFrames: number; // Socrates: reverses left/right
  categoricalImperativeFrames: number; // Kant: punishes repeated move
  silenceFrames: number; // Wittgenstein: disables special moves
  staminaDrainFrames: number; // Augustine: slows speed & drains meter
  superArmorFrames: number; // Aquinas / Laozi: absorbs 1 hit or flows through
  damageMultiplier: number; // Nietzsche Will to Power / Hume Passions
  dialecticStacks: number; // Hegel Thesis/Antithesis stacks (0..3)
  statusBannerText: string | null;
  statusBannerFrames: number;
}

export interface ClashEffect {
  x: number;
  y: number;
  framesRemaining: number;
  label: string;
}

export interface GameMatchState {
  frameNumber: number;
  roundNumber: number;
  timerFrames: number; // 99 seconds * 60 = 5940 frames
  fighter1: FighterState;
  fighter2: FighterState;
  p1RoundsWon: number;
  p2RoundsWon: number;
  activeZones: ActiveZone[];
  clashEffects: ClashEffect[];
  isRoundOver: boolean;
  isGameOver: boolean;
  winner: string | null;
  winMethod: 'LOGICAL_COUNTER' | 'WILLPOWER_BREAK' | 'TIME_OUT' | null;
  lastHitDescription: string;
  checksumCrc32: number;
  checksumFnv1a: number;
}

export interface PlayerInput {
  frame: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
  special: boolean;
  block: boolean;
}

export interface RollbackTelemetry {
  currentFrame: number;
  rollbackCount: number;
  lastRollbackDepth: number;
  maxRollbackDepth: number;
  localCrc32: number;
  remoteCrc32: number;
  fnv1aHash: number;
  desyncDetected: boolean;
  simulatedPingMs: number;
  ringBufferUtilization: number;
  bytesPerSecond: number;
}

export interface DialogueNode {
  speaker: string;
  role: 'player' | 'opponent' | 'narrator';
  expression: 'calm' | 'smirk' | 'intense' | 'thoughtful' | 'exhausted' | 'determined';
  text: string;
}

export interface CampaignStage {
  stageId: number;
  chapterTitle: string;
  era: EraCategory;
  opponentKey: string;
  opponentName: string;
  stageBackground: string;
  matchRuleDescription: string;
  aiDifficulty: number; // 1..5
  specialModifier?: 'APORIA_TRAP' | 'WILL_TO_POWER' | 'CATEGORICAL_IMPERATIVE' | 'DIALECTICAL_SYNTHESIS' | 'SILENCE_BOUNDS';
  introDialogue: DialogueNode[];
  logicalVictoryOutro: DialogueNode[];
  willpowerVictoryOutro: DialogueNode[];
  nextStageOnLogicalWin: number | null;
  nextStageOnWillpowerWin: number | null;
}
