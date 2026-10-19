import {
  AttackMoveType,
  Box,
  FighterState,
  GameMatchState,
  MoveFrameData,
  PlayerInput,
} from './types';
import { PHILOSOPHER_ROSTER } from './FighterRoster';
import { ComboEngine } from './ComboEngine';
import { JuiceController } from './JuiceController';
import { ArcadeSoundEngine, ParticleFxEngine } from './LogosArenaMasterCore';

export const STATE_POOL_SIZE = 120; // 2 seconds of pre-allocated rollback frames at 60 FPS
export const STAGE_LEFT_BOUND = 75;
export const STAGE_RIGHT_BOUND = 1125;
export const GROUND_Y = 455;
export const GRAVITY = 0.85;

export class DesyncDetector {
  private static crcTable: Uint32Array | null = null;

  private static getCrcTable(): Uint32Array {
    if (this.crcTable) return this.crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    this.crcTable = table;
    return table;
  }

  /**
   * Fast CRC32 hash generator for deterministic state verification
   */
  public static computeChecksum(stateJson: string): number {
    let crc = 0xffffffff;
    const table = this.getCrcTable();
    for (let i = 0; i < stateJson.length; i++) {
      const charCode = stateJson.charCodeAt(i);
      crc = (crc >>> 8) ^ table[(crc ^ charCode) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Zero-allocation FNV-1a bitwise hash over core numeric state fields
   */
  public static computeFnv1a(state: GameMatchState): number {
    let hash = 2166136261;
    const f1 = state.fighter1;
    const f2 = state.fighter2;
    const values = [
      state.frameNumber,
      Math.round(f1.position.x),
      Math.round(f1.position.y),
      Math.round(f1.health),
      Math.round(f1.meter),
      f1.frameTimer,
      Math.round(f2.position.x),
      Math.round(f2.position.y),
      Math.round(f2.health),
      Math.round(f2.meter),
      f2.frameTimer,
    ];
    for (let i = 0; i < values.length; i++) {
      hash ^= values[i];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}

export class FighterFactory {
  public static createFighterState(
    philosopherKey: string,
    id: string,
    startX: number,
    facingRight: boolean
  ): FighterState {
    const profile = PHILOSOPHER_ROSTER[philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    return {
      id,
      philosopherKey: profile.key,
      name: profile.name,
      position: { x: startX, y: GROUND_Y },
      velocity: { x: 0, y: 0 },
      grounded: true,
      crouching: false,
      blocking: false,
      health: profile.maxHealth,
      maxHealth: profile.maxHealth,
      meter: 35,
      maxMeter: 100,
      facingRight,
      attackState: 'IDLE',
      currentMove: 'NONE',
      currentAnimFrame: 0,
      frameTimer: 0,
      totalMoveFrames: 0,
      activeHitbox: null,
      hurtbox: {
        x: startX - 32,
        y: GROUND_Y - 176,
        width: 64,
        height: 176,
      },
      hitConfirmedThisMove: false,
      comboCount: 0,
      lastMoveUsed: 'NONE',
      consecutiveMoveCount: 0,
      aporiaReversedFrames: 0,
      categoricalImperativeFrames: 0,
      silenceFrames: 0,
      staminaDrainFrames: 0,
      superArmorFrames: 0,
      damageMultiplier: 1.0,
      dialecticStacks: 0,
      statusBannerText: null,
      statusBannerFrames: 0,
    };
  }

  public static createInitialMatchState(p1Key: string, p2Key: string): GameMatchState {
    const f1 = this.createFighterState(p1Key, 'player1', 330, true);
    const f2 = this.createFighterState(p2Key, 'player2', 870, false);
    const initial: GameMatchState = {
      frameNumber: 0,
      roundNumber: 1,
      timerFrames: 99 * 60,
      fighter1: f1,
      fighter2: f2,
      p1RoundsWon: 0,
      p2RoundsWon: 0,
      activeZones: [],
      clashEffects: [],
      isRoundOver: false,
      isGameOver: false,
      winner: null,
      winMethod: null,
      lastHitDescription: 'Round 1 — Fight! Chain PUNCH -> KICK -> SPECIAL for Combos!',
      checksumCrc32: 0,
      checksumFnv1a: 0,
    };
    initial.checksumFnv1a = DesyncDetector.computeFnv1a(initial);
    initial.checksumCrc32 = DesyncDetector.computeChecksum(JSON.stringify(initial));
    return initial;
  }
}

export class CombatEngine {
  private state: GameMatchState;
  private stateRingPool: string[] = new Array(STATE_POOL_SIZE).fill('');

  constructor(initialState: GameMatchState) {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.saveToPool(this.state.frameNumber);
  }

  public getState(): GameMatchState {
    return this.state;
  }

  public setState(newState: GameMatchState): void {
    this.state = JSON.parse(JSON.stringify(newState));
  }

  public serializeState(): string {
    return JSON.stringify(this.state);
  }

  public deserializeState(serialized: string): void {
    this.state = JSON.parse(serialized);
  }

  public saveToPool(frame: number): string {
    const snap = this.serializeState();
    this.stateRingPool[frame % STATE_POOL_SIZE] = snap;
    return snap;
  }

  public getFromPool(frame: number): string | null {
    const snap = this.stateRingPool[frame % STATE_POOL_SIZE];
    return snap || null;
  }

  public resetForNextRound(): void {
    const p1Key = this.state.fighter1.philosopherKey;
    const p2Key = this.state.fighter2.philosopherKey;
    const p1Meter = Math.min(100, this.state.fighter1.meter + 25);
    const p2Meter = Math.min(100, this.state.fighter2.meter + 25);

    this.state.roundNumber += 1;
    this.state.timerFrames = 99 * 60;
    this.state.fighter1 = FighterFactory.createFighterState(p1Key, 'player1', 330, true);
    this.state.fighter2 = FighterFactory.createFighterState(p2Key, 'player2', 870, false);
    this.state.fighter1.meter = p1Meter;
    this.state.fighter2.meter = p2Meter;
    this.state.activeZones = [];
    this.state.clashEffects = [];
    this.state.isRoundOver = false;
    this.state.lastHitDescription = `Round ${this.state.roundNumber} — Fight!`;
  }

  /**
   * Core deterministic step executed strictly at 60Hz (16.66ms fixed tick)
   */
  public update(input1: PlayerInput, input2: PlayerInput): void {
    if (this.state.isGameOver || this.state.isRoundOver) return;

    const f1 = this.state.fighter1;
    const f2 = this.state.fighter2;

    // Auto-face opponent when idle or walking on the ground
    if (f1.grounded && (f1.attackState === 'IDLE' || f1.attackState === 'WALK' || f1.attackState === 'CROUCH')) {
      f1.facingRight = f1.position.x <= f2.position.x;
    }
    if (f2.grounded && (f2.attackState === 'IDLE' || f2.attackState === 'WALK' || f2.attackState === 'CROUCH')) {
      f2.facingRight = f2.position.x <= f1.position.x;
    }

    this.tickStatusEffects(f1);
    this.tickStatusEffects(f2);
    this.tickActiveZones(f1, f2);

    this.processFighterInput(f1, f2, input1);
    this.processFighterInput(f2, f1, input2);

    this.updateFighterPhysics(f1, f2);
    this.updateFighterPhysics(f2, f1);

    this.checkCollisions();

    // Update clash visual counters
    this.state.clashEffects = this.state.clashEffects
      .map((c) => ({ ...c, framesRemaining: c.framesRemaining - 1 }))
      .filter((c) => c.framesRemaining > 0);

    // Tick round timer
    if (this.state.timerFrames > 0) {
      this.state.timerFrames--;
      if (this.state.timerFrames === 0 && !this.state.isRoundOver) {
        this.resolveTimeOut();
      }
    }

    this.state.frameNumber++;
    this.state.checksumFnv1a = DesyncDetector.computeFnv1a(this.state);
    if (this.state.frameNumber % 30 === 0) {
      this.state.checksumCrc32 = DesyncDetector.computeChecksum(this.serializeState());
    }
    this.saveToPool(this.state.frameNumber);
  }

  private tickStatusEffects(f: FighterState): void {
    if (f.aporiaReversedFrames > 0) f.aporiaReversedFrames--;
    if (f.categoricalImperativeFrames > 0) f.categoricalImperativeFrames--;
    if (f.silenceFrames > 0) f.silenceFrames--;
    if (f.staminaDrainFrames > 0) f.staminaDrainFrames--;
    if (f.superArmorFrames > 0) f.superArmorFrames--;
    if (f.statusBannerFrames > 0) {
      f.statusBannerFrames--;
      if (f.statusBannerFrames === 0) f.statusBannerText = null;
    }

    // Dynamic passive scaling
    if (f.philosopherKey === 'NIETZSCHE') {
      const missingRatio = Math.max(0, 1 - f.health / f.maxHealth);
      f.damageMultiplier = Number((1 + missingRatio * 0.85).toFixed(2));
    } else if (f.philosopherKey === 'ROUSSEAU') {
      const missingRatio = Math.max(0, 1 - f.health / f.maxHealth);
      f.damageMultiplier = Number((1 + missingRatio * 0.65).toFixed(2));
    } else if (f.philosopherKey === 'ARISTOTLE') {
      const nearBalance = Math.abs(f.health - 55) <= 25;
      f.damageMultiplier = nearBalance ? 1.3 : 1.05;
    }
  }

  private tickActiveZones(f1: FighterState, f2: FighterState): void {
    for (const zone of this.state.activeZones) {
      zone.remainingFrames--;
      const target = zone.ownerId === f1.id ? f2 : f1;
      const owner = zone.ownerId === f1.id ? f1 : f2;

      const inside =
        target.position.x >= zone.x &&
        target.position.x <= zone.x + zone.width;

      if (inside && this.state.frameNumber % 20 === 0) {
        if (zone.type === 'LOCKE_TERRITORY') {
          target.health = Math.max(1, target.health - 2);
          owner.meter = Math.min(100, owner.meter + 3);
          this.setBanner(target, 'TRESPASSING LOCKE TERRITORY');
        } else if (zone.type === 'PLATO_FORM') {
          target.health = Math.max(1, target.health - 3);
          target.staminaDrainFrames = 25;
          this.setBanner(target, 'BOUND BY PLATONIC FORM');
        } else if (zone.type === 'WITTGENSTEIN_SILENCE') {
          target.silenceFrames = Math.max(target.silenceFrames, 45);
          this.setBanner(target, 'PROPOSITION 7: SILENCED');
        } else if (zone.type === 'MARX_HAZARD') {
          target.health = Math.max(1, target.health - 2);
          const stolen = Math.min(4, target.meter);
          target.meter -= stolen;
          owner.meter = Math.min(100, owner.meter + stolen);
        }
      }
    }
    this.state.activeZones = this.state.activeZones.filter((z) => z.remainingFrames > 0);
  }

  private getMoveData(fighter: FighterState, moveType: AttackMoveType): MoveFrameData {
    const profile = PHILOSOPHER_ROSTER[fighter.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;
    if (moveType === 'LIGHT') return profile.lightMove;
    if (moveType === 'HEAVY') return profile.heavyMove;
    if (moveType === 'SUPER') {
      return {
        ...profile.specialMove,
        name: profile.superMoveName,
        startupFrames: Math.max(4, profile.specialMove.startupFrames - 1),
        activeFrames: profile.specialMove.activeFrames + 4,
        damage: Math.round(profile.specialMove.damage * 1.8),
        chipDamage: profile.specialMove.chipDamage + 4,
        rangeX: profile.specialMove.rangeX + 45,
        hitstunDuration: profile.specialMove.hitstunDuration + 9,
      };
    }
    return profile.specialMove;
  }

  private processFighterInput(
    fighter: FighterState,
    opponent: FighterState,
    rawInput: PlayerInput
  ): void {
    const profile = PHILOSOPHER_ROSTER[fighter.philosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;

    // Apply Socrates' Aporia input reversal if active
    const leftPressed = fighter.aporiaReversedFrames > 0 ? rawInput.right : rawInput.left;
    const rightPressed = fighter.aporiaReversedFrames > 0 ? rawInput.left : rawInput.right;

    const canAct =
      fighter.attackState === 'IDLE' ||
      fighter.attackState === 'WALK' ||
      fighter.attackState === 'CROUCH' ||
      fighter.attackState === 'JUMP';

    // Check Street Fighter style Combo Cancellation window if currently mid-attack
    if (!canAct) {
      const cancelMove = ComboEngine.resolveRequestedCancel(fighter, rawInput);
      if (cancelMove !== 'NONE') {
        if (cancelMove === 'SUPER') fighter.meter = 0;
        else if (cancelMove === 'SPECIAL') fighter.meter = Math.max(0, fighter.meter - 20);
        this.setBanner(fighter, `${cancelMove} COMBO CANCEL!`);
        this.initiateAttack(fighter, opponent, cancelMove);
        return;
      }

      // Advance frame timer for STARTUP / ACTIVE / RECOVERY / HITSTUN / BLOCKSTUN
      fighter.frameTimer--;
      fighter.currentAnimFrame++;
      if (fighter.frameTimer <= 0) {
        this.progressAttackState(fighter, opponent);
      }
      return;
    }

    // Holding back relative to opponent or explicit block button enables blocking
    const holdingBack = fighter.facingRight ? leftPressed : rightPressed;
    fighter.blocking =
      canAct &&
      (rawInput.block ||
        (holdingBack &&
          (opponent.attackState === 'STARTUP' || opponent.attackState === 'ACTIVE')));

    fighter.crouching = fighter.grounded && rawInput.down;

    const speedPenalty = fighter.staminaDrainFrames > 0 ? 0.62 : 1.0;
    const walkSpeed = profile.walkSpeed * 1.18 * speedPenalty;

    if (fighter.crouching || rawInput.block) {
      fighter.velocity.x = 0;
      if (fighter.grounded) fighter.attackState = 'CROUCH';
    } else if (leftPressed) {
      fighter.velocity.x = -walkSpeed;
      if (fighter.grounded) fighter.attackState = 'WALK';
    } else if (rightPressed) {
      fighter.velocity.x = walkSpeed;
      if (fighter.grounded) fighter.attackState = 'WALK';
    } else {
      fighter.velocity.x = 0;
      if (fighter.grounded) fighter.attackState = 'IDLE';
    }

    // Jump initiation
    if (rawInput.up && fighter.grounded) {
      fighter.velocity.y = profile.jumpVelocity * 1.08;
      fighter.grounded = false;
      fighter.crouching = false;
      fighter.attackState = 'JUMP';
    }

    // Attack initiation (Punch = Light, Kick = Heavy, Special = Philosophical Special)
    let chosenMove: AttackMoveType = 'NONE';
    if (rawInput.special) {
      if (fighter.silenceFrames > 0) {
        this.setBanner(fighter, 'SILENCED — CANNOT SPEAK SPECIALS');
      } else if (fighter.meter >= 100 && (rawInput.heavyAttack || rawInput.up)) {
        chosenMove = 'SUPER';
        fighter.meter = 0;
      } else if (fighter.meter >= 20) {
        chosenMove = 'SPECIAL';
        fighter.meter = Math.max(0, fighter.meter - 20);
      } else {
        chosenMove = 'LIGHT';
      }
    } else if (rawInput.heavyAttack) {
      if (fighter.meter >= 100 && rawInput.down) {
        chosenMove = 'SUPER';
        fighter.meter = 0;
      } else {
        chosenMove = 'HEAVY'; // KICK
      }
    } else if (rawInput.lightAttack) {
      chosenMove = 'LIGHT'; // PUNCH
    }

    if (chosenMove !== 'NONE') {
      this.initiateAttack(fighter, opponent, chosenMove);
    }
  }

  private initiateAttack(
    fighter: FighterState,
    opponent: FighterState,
    moveType: AttackMoveType
  ): void {
    const moveData = this.getMoveData(fighter, moveType);

    // Check Kant's Categorical Imperative penalty if fighter repeats the exact same move
    if (moveType === fighter.lastMoveUsed) {
      fighter.consecutiveMoveCount++;
      if (fighter.categoricalImperativeFrames > 0 && fighter.consecutiveMoveCount >= 2) {
        fighter.health = Math.max(1, fighter.health - 9);
        this.setBanner(fighter, 'MAXIM VIOLATED! -9 HP');
        this.state.lastHitDescription = `${fighter.name} violated Kant's Categorical Imperative by repeating ${moveData.name}!`;
      }
    } else {
      fighter.lastMoveUsed = moveType;
      fighter.consecutiveMoveCount = 1;
    }

    fighter.currentMove = moveType;
    fighter.attackState = 'STARTUP';
    fighter.frameTimer = moveData.startupFrames;
    fighter.totalMoveFrames =
      moveData.startupFrames + moveData.activeFrames + moveData.recoveryFrames;
    fighter.currentAnimFrame = 0;
    fighter.hitConfirmedThisMove = false;
    if (fighter.grounded) {
      // Forward micro-lunge on kicks and specials for responsive arcade range
      const dir = fighter.facingRight ? 1 : -1;
      fighter.velocity.x = moveType === 'HEAVY' ? dir * 2.5 : moveType === 'SPECIAL' ? dir * 3.5 : 0;
    }

    // Philosopher Startup Mechanics
    if (moveType === 'SPECIAL' || moveType === 'SUPER') {
      if (fighter.philosopherKey === 'AQUINAS' || fighter.philosopherKey === 'CONFUCIUS') {
        fighter.superArmorFrames = moveData.startupFrames + moveData.activeFrames;
        this.setBanner(fighter, 'SCHOLASTIC ARMOR');
      } else if (fighter.philosopherKey === 'LAOZI' || fighter.philosopherKey === 'KIERKEGAARD') {
        fighter.superArmorFrames = moveData.startupFrames + 3;
        const dir = fighter.facingRight ? 1 : -1;
        fighter.position.x += dir * 75;
        this.setBanner(
          fighter,
          fighter.philosopherKey === 'LAOZI' ? 'WU WEI FLOW' : 'LEAP OF FAITH!'
        );
      } else if (fighter.philosopherKey === 'DESCARTES') {
        const targetX = opponent.facingRight
          ? opponent.position.x + 95
          : opponent.position.x - 95;
        fighter.position.x = Math.max(STAGE_LEFT_BOUND, Math.min(STAGE_RIGHT_BOUND, targetX));
        fighter.facingRight = fighter.position.x <= opponent.position.x;
        this.setBanner(fighter, 'COGITO WARP (X,Y)');
      } else if (fighter.philosopherKey === 'EPICURUS') {
        fighter.health = Math.min(fighter.maxHealth, fighter.health + 6);
        fighter.aporiaReversedFrames = 0;
        fighter.staminaDrainFrames = 0;
        this.setBanner(fighter, 'ATARAXIA +6 HP');
      }
    }
  }

  private progressAttackState(fighter: FighterState, opponent: FighterState): void {
    const moveData = this.getMoveData(fighter, fighter.currentMove);

    switch (fighter.attackState) {
      case 'STARTUP': {
        fighter.attackState = 'ACTIVE';
        fighter.frameTimer = moveData.activeFrames;
        fighter.velocity.x = 0;
        const reach = Math.round(moveData.rangeX * 1.25);
        const height = Math.round(moveData.rangeY * 1.35);
        const hitX = fighter.facingRight
          ? fighter.position.x + 20
          : fighter.position.x - 20 - reach;
        const hitY = fighter.crouching
          ? fighter.position.y - 85
          : fighter.currentMove === 'HEAVY'
          ? fighter.position.y - 125
          : fighter.position.y - 148;
        fighter.activeHitbox = {
          x: hitX,
          y: hitY,
          width: reach,
          height: height,
        };

        if (fighter.currentMove === 'SPECIAL' || fighter.currentMove === 'SUPER') {
          this.spawnPhilosopherZone(fighter, opponent);
        }
        break;
      }
      case 'ACTIVE': {
        fighter.attackState = 'RECOVERY';
        fighter.frameTimer = moveData.recoveryFrames;
        fighter.activeHitbox = null;
        break;
      }
      case 'RECOVERY':
      case 'HITSTUN':
      case 'BLOCKSTUN':
      case 'KNOCKDOWN': {
        fighter.attackState = fighter.grounded ? 'IDLE' : 'JUMP';
        fighter.currentMove = 'NONE';
        fighter.frameTimer = 0;
        fighter.activeHitbox = null;
        if (fighter.attackState === 'IDLE') {
          fighter.comboCount = 0;
        }
        break;
      }
    }
  }

  private spawnPhilosopherZone(fighter: FighterState, opponent: FighterState): void {
    const dir = fighter.facingRight ? 1 : -1;
    if (fighter.philosopherKey === 'LOCKE') {
      this.state.activeZones.push({
        ownerId: fighter.id,
        philosopherKey: 'LOCKE',
        type: 'LOCKE_TERRITORY',
        x: Math.max(STAGE_LEFT_BOUND, fighter.position.x - 40),
        y: GROUND_Y - 18,
        width: 240,
        height: 18,
        remainingFrames: 210,
      });
      this.setBanner(fighter, 'PROPERTY CLAIMED');
    } else if (fighter.philosopherKey === 'PLATO') {
      this.state.activeZones.push({
        ownerId: fighter.id,
        philosopherKey: 'PLATO',
        type: 'PLATO_FORM',
        x: Math.max(STAGE_LEFT_BOUND, Math.min(STAGE_RIGHT_BOUND - 140, fighter.position.x + dir * 80 - 60)),
        y: GROUND_Y - 150,
        width: 140,
        height: 150,
        remainingFrames: 180,
      });
      this.setBanner(fighter, 'FORM OF THE DODECAHEDRON');
    } else if (fighter.philosopherKey === 'WITTGENSTEIN') {
      this.state.activeZones.push({
        ownerId: fighter.id,
        philosopherKey: 'WITTGENSTEIN',
        type: 'WITTGENSTEIN_SILENCE',
        x: Math.max(STAGE_LEFT_BOUND, opponent.position.x - 105),
        y: GROUND_Y - 170,
        width: 210,
        height: 170,
        remainingFrames: 200,
      });
      opponent.silenceFrames = 180;
      this.setBanner(fighter, 'PROPOSITION 7: SILENCE');
    } else if (fighter.philosopherKey === 'MARX') {
      this.state.activeZones.push({
        ownerId: fighter.id,
        philosopherKey: 'MARX',
        type: 'MARX_HAZARD',
        x: Math.max(STAGE_LEFT_BOUND, opponent.position.x - 110),
        y: GROUND_Y - 24,
        width: 220,
        height: 24,
        remainingFrames: 180,
      });
    }
  }

  private updateFighterPhysics(fighter: FighterState, opponent: FighterState): void {
    fighter.position.x += fighter.velocity.x;
    fighter.position.y += fighter.velocity.y;

    if (!fighter.grounded) {
      fighter.velocity.y += GRAVITY;
      if (fighter.position.y >= GROUND_Y) {
        fighter.position.y = GROUND_Y;
        fighter.velocity.y = 0;
        fighter.grounded = true;
        if (fighter.attackState === 'JUMP') {
          fighter.attackState = 'IDLE';
        }
      }
    }

    // Prevent fighters from overlapping completely on the ground
    const minSeparation = 64;
    const dx = fighter.position.x - opponent.position.x;
    if (Math.abs(dx) < minSeparation && Math.abs(fighter.position.y - opponent.position.y) < 110) {
      const push = (minSeparation - Math.abs(dx)) * 0.5;
      if (dx >= 0) {
        fighter.position.x += push;
        opponent.position.x -= push;
      } else {
        fighter.position.x -= push;
        opponent.position.x += push;
      }
    }

    // Clamp to arena boundaries
    if (fighter.position.x < STAGE_LEFT_BOUND) fighter.position.x = STAGE_LEFT_BOUND;
    if (fighter.position.x > STAGE_RIGHT_BOUND) fighter.position.x = STAGE_RIGHT_BOUND;

    // Sync hurtbox to large 176px fighter body
    const crouchOffset = fighter.crouching ? 48 : 0;
    fighter.hurtbox = {
      x: fighter.position.x - 32,
      y: fighter.position.y - 176 + crouchOffset,
      width: 64,
      height: 176 - crouchOffset,
    };

    // Keep active hitbox attached to fighter if still active
    if (fighter.activeHitbox) {
      const moveData = this.getMoveData(fighter, fighter.currentMove);
      const reach = Math.round(moveData.rangeX * 1.25);
      fighter.activeHitbox.x = fighter.facingRight
        ? fighter.position.x + 20
        : fighter.position.x - 20 - reach;
      fighter.activeHitbox.y = fighter.crouching
        ? fighter.position.y - 85
        : fighter.currentMove === 'HEAVY'
        ? fighter.position.y - 125
        : fighter.position.y - 148;
    }
  }

  private checkCollisions(): void {
    const f1 = this.state.fighter1;
    const f2 = this.state.fighter2;

    // 1. Priority & Clash Check: If both active hitboxes intersect on the exact same tick
    if (
      f1.activeHitbox &&
      f2.activeHitbox &&
      !f1.hitConfirmedThisMove &&
      !f2.hitConfirmedThisMove &&
      this.isColliding(f1.activeHitbox, f2.activeHitbox)
    ) {
      f1.hitConfirmedThisMove = true;
      f2.hitConfirmedThisMove = true;
      f1.activeHitbox = null;
      f2.activeHitbox = null;
      f1.attackState = 'RECOVERY';
      f2.attackState = 'RECOVERY';
      f1.frameTimer = 10;
      f2.frameTimer = 10;
      f1.position.x += f1.facingRight ? -36 : 36;
      f2.position.x += f2.facingRight ? -36 : 36;
      f1.meter = Math.min(100, f1.meter + 15);
      f2.meter = Math.min(100, f2.meter + 15);

      const midX = (f1.position.x + f2.position.x) / 2;
      const midY = GROUND_Y - 115;

      // Trigger Street Fighter Hitstop & Screen Shake on Clash
      JuiceController.triggerHitstop(6);
      JuiceController.triggerScreenShake(10, 9);
      JuiceController.spawnHitSparks(midX, midY, true, '#38BDF8');

      this.state.clashEffects.push({
        x: midX,
        y: midY,
        framesRemaining: 24,
        label: 'DIALECTICAL CLASH!',
      });
      this.state.lastHitDescription = `Dialectical Clash! ${f1.name} and ${f2.name} collided on Frame ${this.state.frameNumber}!`;
      return;
    }

    // 2. Check Fighter 1 hitting Fighter 2
    if (f1.activeHitbox && !f1.hitConfirmedThisMove && this.isColliding(f1.activeHitbox, f2.hurtbox)) {
      this.applyHit(f1, f2);
    }

    // 3. Check Fighter 2 hitting Fighter 1
    if (f2.activeHitbox && !f2.hitConfirmedThisMove && this.isColliding(f2.activeHitbox, f1.hurtbox)) {
      this.applyHit(f2, f1);
    }
  }

  private applyHit(attacker: FighterState, defender: FighterState): void {
    const moveData = this.getMoveData(attacker, attacker.currentMove);
    attacker.hitConfirmedThisMove = true;
    attacker.activeHitbox = null;

    const pushDir = attacker.facingRight ? 1 : -1;
    const sparkX = (attacker.position.x + defender.position.x) / 2;
    const sparkY = defender.position.y - 115;

    // Check if defender is blocking
    if (defender.blocking && defender.superArmorFrames <= 0) {
      let chip = moveData.chipDamage;
      if (attacker.philosopherKey === 'MACHIAVELLI' || attacker.philosopherKey === 'SARTRE') {
        chip += 3;
      }
      defender.health = Math.max(1, defender.health - chip);
      defender.attackState = 'BLOCKSTUN';
      defender.frameTimer = moveData.blockstunDuration;
      defender.position.x = Math.max(
        STAGE_LEFT_BOUND,
        Math.min(STAGE_RIGHT_BOUND, defender.position.x + pushDir * (moveData.pushback * 0.7))
      );
      attacker.meter = Math.min(100, attacker.meter + Math.round(moveData.meterGain * 0.5));
      defender.meter = Math.min(100, defender.meter + 6);

      JuiceController.triggerHitstop(2);
      JuiceController.spawnHitSparks(sparkX, sparkY, false, '#38BDF8');

      if (defender.philosopherKey === 'HEGEL') {
        defender.dialecticStacks = Math.min(3, defender.dialecticStacks + 1);
        this.setBanner(defender, `DIALECTIC STACK ${defender.dialecticStacks}/3`);
      }
      if (attacker.philosopherKey === 'SARTRE' && attacker.currentMove === 'SPECIAL') {
        defender.meter = Math.max(0, defender.meter - 16);
        this.setBanner(defender, 'NO EXIT DILEMMA: -16 METER');
      }

      this.state.lastHitDescription = `${defender.name} blocked ${attacker.name}'s ${moveData.name} (${chip} chip dmg)`;
      return;
    }

    // Calculate unblocked damage with philosophical modifiers
    let rawDamage = moveData.damage * attacker.damageMultiplier;

    if (attacker.philosopherKey === 'HEGEL' && (attacker.currentMove === 'SPECIAL' || attacker.currentMove === 'SUPER')) {
      rawDamage += attacker.dialecticStacks * 6;
      attacker.dialecticStacks = 0;
      this.setBanner(attacker, 'AUFHEBUNG SYNTHESIS!');
    }

    if (attacker.philosopherKey === 'HUME' && (attacker.currentMove === 'SPECIAL' || attacker.currentMove === 'HEAVY')) {
      const passionCrit = this.state.frameNumber % 3 === 0 ? 1.35 : 1.1;
      rawDamage *= passionCrit;
      if (passionCrit > 1.2) this.setBanner(attacker, 'PASSIONS OVER REASON CRIT!');
    }

    const finalDamage = Math.max(1, Math.round(rawDamage));
    defender.health = Math.max(0, defender.health - finalDamage);
    attacker.meter = Math.min(100, attacker.meter + moveData.meterGain);
    defender.meter = Math.min(100, defender.meter + Math.round(moveData.meterGain * 0.45));
    attacker.comboCount += 1;

    // Trigger Street Fighter / Mortal Kombat Hitstop & Camera Screen-Shake
    const isHeavyOrSpec =
      attacker.currentMove === 'HEAVY' ||
      attacker.currentMove === 'SPECIAL' ||
      attacker.currentMove === 'SUPER';
    if (attacker.currentMove === 'SUPER') {
      ArcadeSoundEngine.playImpact('super');
      JuiceController.triggerHitstop(8);
      JuiceController.triggerScreenShake(14, 12);
      JuiceController.triggerImpactFlash('#F59E0B', 0.25);
      JuiceController.spawnHitSparks(sparkX, sparkY, true, '#FDE047');
      JuiceController.spawnFloorCrater(sparkX, GROUND_Y, '#FDE047', 84);
      ParticleFxEngine.spawnImpactSparks(sparkX, sparkY, true);
    } else if (isHeavyOrSpec) {
      ArcadeSoundEngine.playImpact('heavy');
      JuiceController.triggerHitstop(6);
      JuiceController.triggerScreenShake(12, 10);
      JuiceController.spawnHitSparks(sparkX, sparkY, true, '#F59E0B');
      JuiceController.spawnFloorCrater(sparkX, GROUND_Y, '#F59E0B', 58);
      ParticleFxEngine.spawnImpactSparks(sparkX, sparkY, false);
    } else {
      ArcadeSoundEngine.playImpact('light');
      JuiceController.triggerHitstop(3);
      JuiceController.triggerScreenShake(4, 3.5);
      JuiceController.spawnHitSparks(sparkX, sparkY, false, '#38BDF8');
      ParticleFxEngine.spawnImpactSparks(sparkX, sparkY, false);
    }

    // Apply philosopher-specific special effects on hit
    if (attacker.currentMove === 'SPECIAL' || attacker.currentMove === 'SUPER') {
      this.applyPhilosopherSpecialHitEffect(attacker, defender);
    }

    // Super armor check on defender
    if (defender.superArmorFrames > 0 && defender.health > 0) {
      defender.superArmorFrames = 0;
      this.setBanner(defender, 'ARMOR ABSORBED!');
    } else {
      defender.attackState = 'HITSTUN';
      defender.frameTimer = moveData.hitstunDuration + (attacker.comboCount > 1 ? 3 : 0);
      defender.position.x = Math.max(
        STAGE_LEFT_BOUND,
        Math.min(STAGE_RIGHT_BOUND, defender.position.x + pushDir * moveData.pushback)
      );
    }

    const actionTypeLabel =
      attacker.currentMove === 'LIGHT'
        ? 'PUNCH'
        : attacker.currentMove === 'HEAVY'
        ? 'KICK'
        : attacker.currentMove;

    this.state.clashEffects.push({
      x: sparkX,
      y: sparkY,
      framesRemaining: 20,
      label: `${actionTypeLabel} -${finalDamage} HP`,
    });

    this.state.lastHitDescription = `${attacker.name} landed ${moveData.name} (${actionTypeLabel}) on ${defender.name} for ${finalDamage} dmg!`;

    if (defender.health <= 0) {
      defender.health = 0;
      defender.attackState = 'KNOCKDOWN';
      JuiceController.triggerHitstop(10);
      JuiceController.triggerScreenShake(18, 14);
      const method =
        attacker.currentMove === 'SPECIAL' || attacker.currentMove === 'SUPER'
          ? 'LOGICAL_COUNTER'
          : 'WILLPOWER_BREAK';
      this.handleRoundWin(attacker, method);
    }
  }

  private applyPhilosopherSpecialHitEffect(attacker: FighterState, defender: FighterState): void {
    switch (attacker.philosopherKey) {
      case 'SOCRATES':
        defender.aporiaReversedFrames = 180;
        this.setBanner(defender, 'APORIA! CONTROLS REVERSED');
        break;
      case 'AUGUSTINE':
        defender.meter = Math.max(0, defender.meter - 15);
        defender.staminaDrainFrames = 180;
        this.setBanner(defender, 'SPIRIT DRAIN: SLOWED');
        break;
      case 'KANT':
        defender.categoricalImperativeFrames = 240;
        this.setBanner(defender, 'CATEGORICAL IMPERATIVE ACTIVE');
        break;
      case 'MARX': {
        const seized = Math.min(20, defender.meter);
        defender.meter -= seized;
        attacker.meter = Math.min(100, attacker.meter + seized);
        this.setBanner(attacker, `SURPLUS SEIZED +${seized} METER`);
        break;
      }
      case 'SPINOZA':
        attacker.health = Math.min(attacker.maxHealth, attacker.health + 4);
        this.setBanner(attacker, 'DEUS SIVE NATURA HARMONY');
        break;
      case 'NIETZSCHE':
        this.setBanner(attacker, `WILL TO POWER x${attacker.damageMultiplier}`);
        break;
      case 'WITTGENSTEIN':
        defender.silenceFrames = 240;
        this.setBanner(defender, 'SILENCED FOR 4s');
        break;
    }
  }

  private handleRoundWin(winner: FighterState, method: 'LOGICAL_COUNTER' | 'WILLPOWER_BREAK' | 'TIME_OUT'): void {
    this.state.isRoundOver = true;
    this.state.winMethod = method;

    if (winner.id === 'player1') {
      this.state.p1RoundsWon += 1;
    } else {
      this.state.p2RoundsWon += 1;
    }

    if (this.state.p1RoundsWon >= 2 || this.state.p2RoundsWon >= 2) {
      this.state.isGameOver = true;
      this.state.winner = winner.name;
    } else {
      this.state.winner = winner.name;
    }
  }

  private resolveTimeOut(): void {
    const f1 = this.state.fighter1;
    const f2 = this.state.fighter2;
    const winner = f1.health >= f2.health ? f1 : f2;
    this.handleRoundWin(winner, 'TIME_OUT');
  }

  private setBanner(fighter: FighterState, text: string): void {
    fighter.statusBannerText = text;
    fighter.statusBannerFrames = 75;
  }

  private isColliding(boxA: Box, boxB: Box): boolean {
    return (
      boxA.x < boxB.x + boxB.width &&
      boxA.x + boxA.width > boxB.x &&
      boxA.y < boxB.y + boxB.height &&
      boxA.y + boxA.height > boxB.y
    );
  }
}

export class DeterministicAI {
  public static computeInput(state: GameMatchState, difficulty = 3): PlayerInput {
    const ai = state.fighter2;
    const player = state.fighter1;
    const f = state.frameNumber;

    const input: PlayerInput = {
      frame: f,
      up: false,
      down: false,
      left: false,
      right: false,
      lightAttack: false,
      heavyAttack: false,
      special: false,
      block: false,
    };

    const dist = Math.abs(ai.position.x - player.position.x);
    const playerToLeft = player.position.x < ai.position.x;

    const reactionCadence = Math.max(6, 26 - difficulty * 4);
    const shouldReactThisTick = f % reactionCadence === 0;

    if (
      dist < 145 &&
      (player.attackState === 'STARTUP' || player.attackState === 'ACTIVE') &&
      f % 5 < difficulty
    ) {
      input.block = true;
      if (playerToLeft) input.right = true;
      else input.left = true;
      return input;
    }

    if (dist > 110) {
      if (playerToLeft) input.left = true;
      else input.right = true;

      if (dist > 180 && f % 90 === 0 && ai.meter >= 25) {
        input.special = true;
      } else if (dist > 150 && f % 110 === 0) {
        input.up = true;
      }
      return input;
    }

    if (shouldReactThisTick) {
      const cycle = (f + Math.round(ai.position.x)) % 10;
      if (ai.meter >= 100 && cycle < 3) {
        input.special = true;
        input.heavyAttack = true;
      } else if (ai.meter >= 25 && cycle < 5 && ai.silenceFrames === 0) {
        input.special = true;
      } else if (cycle < 8) {
        input.lightAttack = true;
      } else {
        input.heavyAttack = true;
      }
    }

    return input;
  }
}
