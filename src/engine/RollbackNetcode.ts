import { PlayerInput, RollbackTelemetry } from './types';
import { CombatEngine, DesyncDetector } from './DeterministicKernel';

/**
 * Packs and unpacks player input and frame index into a compact 5-byte binary packet
 * Byte 0-3: Frame ID (Uint32 little-endian)
 * Byte 4: Input Bitmask (Uint8)
 */
export class BinaryStreamer {
  public static inputToBitmask(input: PlayerInput): number {
    let mask = 0;
    if (input.left) mask |= 1 << 0;
    if (input.right) mask |= 1 << 1;
    if (input.up) mask |= 1 << 2;
    if (input.down) mask |= 1 << 3;
    if (input.lightAttack) mask |= 1 << 4;
    if (input.heavyAttack) mask |= 1 << 5;
    if (input.special) mask |= 1 << 6;
    if (input.block) mask |= 1 << 7;
    return mask;
  }

  public static bitmaskToInput(frame: number, mask: number): PlayerInput {
    return {
      frame,
      left: (mask & (1 << 0)) !== 0,
      right: (mask & (1 << 1)) !== 0,
      up: (mask & (1 << 2)) !== 0,
      down: (mask & (1 << 3)) !== 0,
      lightAttack: (mask & (1 << 4)) !== 0,
      heavyAttack: (mask & (1 << 5)) !== 0,
      special: (mask & (1 << 6)) !== 0,
      block: (mask & (1 << 7)) !== 0,
    };
  }

  public static encodeInputPacket(frameId: number, inputBitmask: number): ArrayBuffer {
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);
    view.setUint32(0, frameId, true);
    view.setUint8(4, inputBitmask);
    return buffer;
  }

  public static decodeInputPacket(data: ArrayBuffer): { frameId: number; inputBitmask: number } {
    const view = new DataView(data);
    return {
      frameId: view.getUint32(0, true),
      inputBitmask: view.getUint8(4),
    };
  }
}

export class RollbackManager {
  private engine: CombatEngine;
  private localSlot: 1 | 2;
  private inputHistorySize = 90;
  private localInputs: Map<number, PlayerInput> = new Map();
  private remoteInputs: Map<number, PlayerInput> = new Map();
  private stateHistory: Map<number, string> = new Map();

  private rollbackCount = 0;
  private lastRollbackDepth = 0;
  private maxRollbackDepth = 0;
  private remoteCrc32 = 0;
  private desyncDetected = false;
  private simulatedPingMs = 0;
  private bytesSentWindow = 0;

  private sendBinaryCallback?: (packet: ArrayBuffer) => void;
  private sendJsonCallback?: (payload: object) => void;

  constructor(
    engine: CombatEngine,
    localSlot: 1 | 2 = 1,
    sendBinary?: (packet: ArrayBuffer) => void,
    sendJson?: (payload: object) => void
  ) {
    this.engine = engine;
    this.localSlot = localSlot;
    this.sendBinaryCallback = sendBinary;
    this.sendJsonCallback = sendJson;
  }

  public setSimulatedLatency(pingMs: number): void {
    this.simulatedPingMs = Math.max(0, Math.min(200, pingMs));
  }

  public getSimulatedLatency(): number {
    return this.simulatedPingMs;
  }

  public registerLocalInput(frame: number, input: PlayerInput): void {
    this.localInputs.set(frame, input);
    const bitmask = BinaryStreamer.inputToBitmask(input);
    const packet = BinaryStreamer.encodeInputPacket(frame, bitmask);
    this.bytesSentWindow += 5;

    if (this.sendBinaryCallback) {
      this.sendBinaryCallback(packet);
    }
  }

  public receiveRemoteBinaryInput(buffer: ArrayBuffer): void {
    const { frameId, inputBitmask } = BinaryStreamer.decodeInputPacket(buffer);
    const decoded = BinaryStreamer.bitmaskToInput(frameId, inputBitmask);
    this.receiveRemoteInput(frameId, decoded);
  }

  public receiveRemoteInput(frame: number, input: PlayerInput): void {
    const predicted = this.getPredictedRemoteInput(frame);
    this.remoteInputs.set(frame, input);

    const currentFrame = this.engine.getState().frameNumber;
    if (frame < currentFrame && !this.inputsMatch(predicted, input)) {
      this.triggerRollback(frame);
    }
  }

  public receiveRemoteChecksum(frame: number, remoteChecksum: number): void {
    this.remoteCrc32 = remoteChecksum;
    const snap = this.stateHistory.get(frame);
    if (!snap) return;

    const localChecksum = DesyncDetector.computeChecksum(snap);
    if (localChecksum !== remoteChecksum) {
      this.desyncDetected = true;
      this.triggerRollback(frame);
    } else {
      this.desyncDetected = false;
    }
  }

  public forceSimulatedRollback(depthFrames = 6): void {
    const currentFrame = this.engine.getState().frameNumber;
    const targetFrame = Math.max(1, currentFrame - depthFrames);
    this.triggerRollback(targetFrame);
  }

  public triggerRollback(targetFrame: number): void {
    const currentFrame = this.engine.getState().frameNumber;
    const snapshot = this.stateHistory.get(targetFrame) || this.engine.getFromPool(targetFrame);
    if (!snapshot || targetFrame >= currentFrame) return;

    const depth = currentFrame - targetFrame;
    this.rollbackCount += 1;
    this.lastRollbackDepth = depth;
    if (depth > this.maxRollbackDepth) {
      this.maxRollbackDepth = depth;
    }

    // 1. Rewind engine to accurate snapshot at targetFrame
    this.engine.deserializeState(snapshot);

    // 2. Re-simulate forward up to currentFrame
    for (let f = targetFrame; f < currentFrame; f++) {
      const localIn = this.localInputs.get(f) || this.getDefaultInput(f);
      const remoteIn = this.remoteInputs.get(f) || this.getPredictedRemoteInput(f);

      this.stateHistory.set(f, this.engine.serializeState());
      if (this.localSlot === 1) {
        this.engine.update(localIn, remoteIn);
      } else {
        this.engine.update(remoteIn, localIn);
      }
    }
  }

  public advanceFrame(currentFrame: number, overrideRemoteInput?: PlayerInput): void {
    const serialized = this.engine.serializeState();
    this.stateHistory.set(currentFrame, serialized);

    // Prune ring buffer beyond inputHistorySize
    if (this.stateHistory.size > this.inputHistorySize) {
      const oldestKey = currentFrame - this.inputHistorySize;
      this.stateHistory.delete(oldestKey);
      this.localInputs.delete(oldestKey);
      this.remoteInputs.delete(oldestKey);
    }

    const localIn = this.localInputs.get(currentFrame) || this.getDefaultInput(currentFrame);
    let remoteIn: PlayerInput;

    if (overrideRemoteInput) {
      // If artificial latency is enabled in local/test mode, delay registration to demonstrate real rollback
      if (this.simulatedPingMs > 0) {
        const delayFrames = Math.max(1, Math.round(this.simulatedPingMs / 16.66));
        this.remoteInputs.set(currentFrame, overrideRemoteInput);
        if (currentFrame > delayFrames && currentFrame % 25 === 0) {
          this.triggerRollback(currentFrame - delayFrames);
        }
      }
      remoteIn = overrideRemoteInput;
    } else {
      remoteIn = this.remoteInputs.get(currentFrame) || this.getPredictedRemoteInput(currentFrame);
    }

    if (this.localSlot === 1) {
      this.engine.update(localIn, remoteIn);
    } else {
      this.engine.update(remoteIn, localIn);
    }

    // Every 30 frames, transmit rolling CRC32 state hash
    if (currentFrame % 30 === 0 && this.sendJsonCallback) {
      const crc = this.engine.getState().checksumCrc32;
      this.sendJsonCallback({
        type: 'CHECKSUM',
        frame: currentFrame,
        checksum: crc,
      });
    }
  }

  public getTelemetry(): RollbackTelemetry {
    const st = this.engine.getState();
    return {
      currentFrame: st.frameNumber,
      rollbackCount: this.rollbackCount,
      lastRollbackDepth: this.lastRollbackDepth,
      maxRollbackDepth: this.maxRollbackDepth,
      localCrc32: st.checksumCrc32,
      remoteCrc32: this.remoteCrc32 || st.checksumCrc32,
      fnv1aHash: st.checksumFnv1a,
      desyncDetected: this.desyncDetected,
      simulatedPingMs: this.simulatedPingMs,
      ringBufferUtilization: Math.round((this.stateHistory.size / this.inputHistorySize) * 100),
      bytesPerSecond: 60 * 5, // 5-byte BinaryStreamer packet at 60Hz = 300 B/s
    };
  }

  private getPredictedRemoteInput(frame: number): PlayerInput {
    const prev = this.remoteInputs.get(frame - 1);
    if (prev) {
      return {
        ...prev,
        frame,
        // Do not predict repeated single-press attacks across frames
        lightAttack: false,
        heavyAttack: false,
        special: false,
      };
    }
    return this.getDefaultInput(frame);
  }

  private inputsMatch(a: PlayerInput, b: PlayerInput): boolean {
    return BinaryStreamer.inputToBitmask(a) === BinaryStreamer.inputToBitmask(b);
  }

  public getDefaultInput(frame: number): PlayerInput {
    return {
      frame,
      up: false,
      down: false,
      left: false,
      right: false,
      lightAttack: false,
      heavyAttack: false,
      special: false,
      block: false,
    };
  }
}
