# Contributing to Logos Arena: Clash of Philosophers

Thank you for contributing to **Logos Arena**! Because fighting games with rollback netcode demand strict frame-by-frame determinism, please review the architectural invariants below before opening a Pull Request.

---

## 1. The Golden Rule of Determinism

`src/engine/DeterministicKernel.ts` must remain **100% deterministic**:
- **Never** call `Math.random()`, `Date.now()`, or `performance.now()` inside `CombatEngine` or `DeterministicAI`.
- All simulation state transitions must depend exclusively on `GameMatchState` and the two `PlayerInput` structs for that tick.
- Run `npm test` (`tsx scripts/verify-determinism.ts`) before submitting any PR to verify that two independent `CombatEngine` instances produce identical **CRC32** and **FNV-1a** state hashes across 600 frames and across rollback rewinds.

---

## 2. Adding a New Philosopher Fighter

1. **Add Profile to `src/engine/FighterRoster.ts`**:
   - Define `lightMove` (Punch), `heavyMove` (Kick), and `specialMove` with explicit `startupFrames`, `activeFrames`, `recoveryFrames`, `hitstunDuration`, `blockstunDuration`, `damage`, and `rangeX`/`rangeY`.
   - Configure `visual` (`primaryRobe`, `secondaryTrim`, `beardStyle`, `headwear`, `accessory`) and `stagePalette`.
2. **Add Signature Special Effect in `src/engine/DeterministicKernel.ts`**:
   - Wire any custom status timer or stage zone inside `initiateAttack`, `spawnPhilosopherZone`, or `applyPhilosopherSpecialHitEffect`.
3. **Verify Determinism & Types**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

---

## 3. Pull Request Checklist

- [ ] `npm run lint` passes with zero TypeScript errors.
- [ ] `npm test` passes all deterministic replay, binary packet encoding, and rollback reconciliation assertions.
- [ ] `npm run build` succeeds cleanly.
