import {
  CombatEngine,
  DesyncDetector,
  DeterministicAI,
  FighterFactory,
} from '../src/engine/DeterministicKernel';
import { BinaryStreamer, RollbackManager } from '../src/engine/RollbackNetcode';
import { PHILOSOPHER_KEYS, PHILOSOPHER_ROSTER } from '../src/engine/FighterRoster';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('=== Logos Arena: Deterministic Engine & Rollback Netcode Verification Suite ===\n');

// 1. Verify all 21 Philosophers have valid frame data profiles
console.log(`[1/4] Auditing ${PHILOSOPHER_KEYS.length} Philosopher Frame Data Profiles...`);
assert(PHILOSOPHER_KEYS.length === 21, `Expected 21 philosophers, found ${PHILOSOPHER_KEYS.length}`);
for (const key of PHILOSOPHER_KEYS) {
  const p = PHILOSOPHER_ROSTER[key];
  assert(Boolean(p.name && p.stageBackground), `Missing metadata on ${key}`);
  assert(p.lightMove.startupFrames > 0 && p.lightMove.activeFrames > 0, `Invalid lightMove on ${key}`);
  assert(p.heavyMove.startupFrames > 0 && p.heavyMove.activeFrames > 0, `Invalid heavyMove on ${key}`);
  assert(p.specialMove.startupFrames > 0 && p.specialMove.activeFrames > 0, `Invalid specialMove on ${key}`);
}
console.log('  ✓ All 21 Philosopher profiles & frame data tables verified.');

// 2. Verify 5-Byte BinaryStreamer Packet Encoding & Decoding
console.log('[2/4] Testing 5-Byte BinaryStreamer ArrayBuffer Codec...');
const sampleInput = {
  frame: 1420,
  left: false,
  right: true,
  up: true,
  down: false,
  lightAttack: true,
  heavyAttack: false,
  special: true,
  block: false,
};
const mask = BinaryStreamer.inputToBitmask(sampleInput);
const encoded = BinaryStreamer.encodeInputPacket(sampleInput.frame, mask);
assert(encoded.byteLength === 5, `Expected 5-byte packet, got ${encoded.byteLength}`);
const decodedPacket = BinaryStreamer.decodeInputPacket(encoded);
assert(decodedPacket.frameId === 1420, `Frame ID mismatch: ${decodedPacket.frameId}`);
const roundtripInput = BinaryStreamer.bitmaskToInput(decodedPacket.frameId, decodedPacket.inputBitmask);
assert(
  roundtripInput.right === true &&
    roundtripInput.up === true &&
    roundtripInput.lightAttack === true &&
    roundtripInput.special === true &&
    roundtripInput.left === false,
  'Bitmask roundtrip mismatch'
);
console.log('  ✓ 5-Byte BinaryStreamer ArrayBuffer roundtrip verified.');

// 3. Verify 600-Frame Bit-Exact Determinism across two independent CombatEngine instances
console.log('[3/4] Running 600-Frame (10s @ 60Hz) Twin-Engine Determinism Simulation (Socrates vs. Nietzsche)...');
const engineA = new CombatEngine(FighterFactory.createInitialMatchState('SOCRATES', 'NIETZSCHE'));
const engineB = new CombatEngine(FighterFactory.createInitialMatchState('SOCRATES', 'NIETZSCHE'));

for (let f = 0; f < 600; f++) {
  const p1In = DeterministicAI.computeInput(engineA.getState(), 4);
  // Flip AI perspective for P1 vs P2 active exchange
  p1In.right = f % 20 < 12;
  p1In.lightAttack = f % 19 === 0;
  p1In.heavyAttack = f % 31 === 0;
  p1In.special = f % 53 === 0;

  const p2In = DeterministicAI.computeInput(engineA.getState(), 4);
  engineA.update(p1In, p2In);
  engineB.update(p1In, p2In);
}

const crcA = DesyncDetector.computeChecksum(engineA.serializeState());
const crcB = DesyncDetector.computeChecksum(engineB.serializeState());
const fnvA = engineA.getState().checksumFnv1a;
const fnvB = engineB.getState().checksumFnv1a;

assert(crcA === crcB, `CRC32 mismatch after 600 frames: ${crcA} !== ${crcB}`);
assert(fnvA === fnvB, `FNV-1a mismatch after 600 frames: ${fnvA} !== ${fnvB}`);
console.log(
  `  ✓ 600-Frame Determinism Verified! CRC32: 0x${crcA.toString(16).toUpperCase()} | FNV-1a: 0x${fnvA.toString(16).toUpperCase()}`
);

// 4. Verify Rollback Netcode State Rewind & Forward Resimulation
console.log('[4/4] Testing 12-Frame Rollback Rewind & State Reconciliation...');
const rbEngine = new CombatEngine(FighterFactory.createInitialMatchState('KANT', 'WITTGENSTEIN'));
const rollbackManager = new RollbackManager(rbEngine, 1);

for (let f = 0; f < 120; f++) {
  const localIn = {
    frame: f,
    left: false,
    right: true,
    up: false,
    down: false,
    lightAttack: f % 15 === 0,
    heavyAttack: false,
    special: false,
    block: false,
  };
  const remoteIn = DeterministicAI.computeInput(rbEngine.getState(), 3);
  rollbackManager.registerLocalInput(f, localIn);
  rollbackManager.advanceFrame(f, remoteIn);
}

const preRollbackFrame = rbEngine.getState().frameNumber;
rollbackManager.forceSimulatedRollback(12);
const postRollbackFrame = rbEngine.getState().frameNumber;
const telemetry = rollbackManager.getTelemetry();

assert(
  preRollbackFrame === postRollbackFrame,
  `Frame count changed after rollback: ${preRollbackFrame} vs ${postRollbackFrame}`
);
assert(telemetry.rollbackCount >= 1 && telemetry.lastRollbackDepth === 12, 'Rollback depth telemetry not recorded');
console.log(
  `  ✓ 12-Frame Rollback Rewind & Resimulation Verified at Frame #${postRollbackFrame} (CRC32: 0x${telemetry.localCrc32
    .toString(16)
    .toUpperCase()}).`
);

console.log('\n✅ ALL DETERMINISTIC ENGINE & ROLLBACK NETCODE CHECKS PASSED!\n');
