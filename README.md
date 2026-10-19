# Logos Arena: Clash of Philosophers

[![CI Build & Determinism Check](https://img.shields.io/badge/build-passing-10B981?style=flat-square)](#)
[![Tick Rate](https://img.shields.io/badge/tick_rate-60Hz_Deterministic-38BDF8?style=flat-square)](#architecture)
[![Netcode](https://img.shields.io/badge/netcode-Rollback_%2B_5B_Binary-F59E0B?style=flat-square)](#rollback-netcode-protocol)
[![License](https://img.shields.io/badge/license-MIT-94A3B8?style=flat-square)](./LICENSE)

**Logos Arena: Clash of Philosophers** is a 60 FPS deterministic 2D arcade fighting game built with TypeScript, React 19, HTML5 Canvas, Express, and WebSockets (`ws`). Play as **21 historical philosophers** spanning Classical Antiquity, the Medieval & Renaissance era, the Enlightenment, and the 19th & 20th centuries—each with era-authentic attire, custom architectural arenas, explicit frame data (`Startup`, `Active`, `Recovery`, `Hitstun`, `Blockstun`), Street Fighter-style combo cancellations, and philosophical special mechanics.

---

## System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 Client Application                                |
|   React 19 UI + HTML5 Canvas (AdvancedSpriteRenderer + JuiceController Hitstop)   |
+-----------------------------------------+-----------------------------------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
+----------------------------------+             +----------------------------------+
|    DeterministicKernel (60Hz)    |             |     RollbackManager & Netcode    |
|  - 16.66ms Fixed Timestep Loop   |             |  - 120-Frame State Ring Buffer   |
|  - AABB Hitbox/Hurtbox Math      |             |  - 5-Byte BinaryStreamer Packets |
|  - ComboEngine (P -> K -> Spec)  |             |  - 30-Frame CRC32 & FNV-1a Hash  |
|  - StoryCampaign Branching Graph |             |  - State Rewind & Resimulation   |
+----------------------------------+             +-----------------+----------------+
                                                                   |
                                                                   v
                                                 +----------------------------------+
                                                 |   Node.js / Express + ws Server  |
                                                 |  - Room Broker & Quick-Match     |
                                                 |  - Binary Input & Checksum Relay |
                                                 +----------------------------------+
```

### Core Technical Pillars

1. **Deterministic 60 FPS Simulation (`src/engine/DeterministicKernel.ts`)**
   - Game physics, hurtboxes, hitboxes, knockback, and frame timers run on a strict `1000 / 60` (`16.66ms`) fixed timestep completely decoupled from `requestAnimationFrame` rendering.
   - Zero `Math.random()` calls inside the simulation kernel—all AI decisions (`DeterministicAI`) and critical bursts (such as David Hume's *Passions Over Reason*) derive strictly from `frameNumber` and deterministic coordinates.
2. **Rollback Netcode & 5-Byte Binary Packet Streamer (`src/engine/RollbackNetcode.ts`)**
   - Every frame, player inputs (`left`, `right`, `up`, `down`, `lightAttack`, `heavyAttack`, `special`, `block`) are bit-packed into a compact **5-byte `ArrayBuffer`** (`Uint32` frame ID + `Uint8` input bitmask) via `BinaryStreamer`.
   - When a remote input arrives for a past frame that differs from the predicted input, `RollbackManager` rewinds `CombatEngine` to the saved snapshot in the 120-frame ring pool and re-simulates forward to the current tick in sub-millisecond time.
   - Every 30 frames, clients exchange a rolling **CRC32** and **FNV-1a** checksum (`DesyncDetector`) to verify zero state drift.
3. **Street Fighter-Style Combo Cancellation & Hitstop Juice (`src/engine/ComboEngine.ts`, `src/engine/JuiceController.ts`)**
   - Normal attacks cancel seamlessly on hit: **PUNCH (`Light`) → KICK (`Heavy`) → SPECIAL → SUPER**.
   - Connecting strikes trigger frame-accurate **Hitstop (3f–10f)**, camera screen-shake, expanding shockwave rings, radial hit-sparks, and Drive-style motion afterimages.
4. **Branching Story Mode Odyssey (`src/engine/StoryCampaign.ts`)**
   - 9-chapter narrative graph across 4 philosophical eras where finishing an opponent with a **Logical Counter (`Special`/`Super`)** vs. a **Willpower Strike (`Punch`/`Kick`)** unlocks different historical stages and philosophical dialogues.

---

## Complete 21-Philosopher Roster & Signature Mechanics

| Philosopher | Era | Stage Arena | Special Ability | Core Combat Mechanic |
| :--- | :--- | :--- | :--- | :--- |
| **Socrates** | Ancient | The Agora of Athens | *Aporia Paradox Trap* | Reverses opponent left/right directional inputs for 180 frames (3s). |
| **Plato** | Ancient | The Academy Gardens | *Projection of Eternal Forms* | Summons a geometric polyhedron zone on stage that damages and slows foes. |
| **Aristotle** | Ancient | The Lyceum Peripatos | *Golden Mean Strike* | High-efficiency frame data; deals +30% bonus damage near equilibrium. |
| **Confucius** | Ancient | The Courtyard of Lu | *Harmonic Bell Reciprocity* | Grants Scholastic/Ritual super-armor during startup & active frames. |
| **Laozi** | Ancient | The Mystic Mountain Pass | *Water Over Stone* | Invulnerable Wu Wei dash phase that slips past heavy attacks. |
| **Epicurus** | Ancient | The Garden of Athens | *Ataraxia Tranquility Pulse* | Restores +6 HP of mental tranquility and cleanses status debuffs. |
| **St. Augustine** | Medieval | The Cathedral of Hippo | *City of Light Judgement* | Drains 15 opponent Logos Meter and slows movement speed for 3s. |
| **Thomas Aquinas** | Medieval | The Scholastic Scriptorium | *Quinque Viae Lock* | Heavy super-armor blow that absorbs one strike and inflicts high blockstun. |
| **Niccolò Machiavelli** | Renaissance | The Florentine Palazzo | *Fox & Lion Ambush* | Fast lunging stiletto strike that inflicts amplified chip damage through guard. |
| **René Descartes** | Enlightenment | The Dutch Winter Study | *Cartesian Coordinate Warp* | Projects an `(X,Y)` grid and teleports directly to optimal striking range. |
| **Baruch Spinoza** | Enlightenment | The Lens-Grinder's Workshop | *Sub Specie Aeternitatis Prism* | Long-range refracted optical beam that restores composure on hit. |
| **John Locke** | Enlightenment | The Parliament Chambers | *Sovereign Property Stake* | Stakes a constitutional floor zone that drains trespassing opponents' HP. |
| **David Hume** | Enlightenment | Edinburgh Enlightenment Salon | *Passions Over Reason Surge* | Deterministic frame-parity critical multiplier (`1.35x`) on heavy/special hits. |
| **J.-J. Rousseau** | Enlightenment | The Swiss Alpine Meadow | *General Will Chain-Break* | Comeback brawler whose attack multiplier scales up to `+65%` as HP drops. |
| **Immanuel Kant** | Enlightenment | The Streets of Königsberg | *Categorical Imperative* | Punishes opponents with `-9 HP` moral-law recoil if they repeat the same move twice. |
| **G.W.F. Hegel** | 19th–20th C. | Berlin University Lecture Hall | *Aufhebung Synthesis* | Blocking builds Thesis/Antithesis stacks (`0..3`) that discharge on Special hit. |
| **Karl Marx** | 19th–20th C. | The Industrial London Docks | *Surplus Value Seizure* | Steals up to `20` meter from the opponent and spawns an industrial floor hazard. |
| **Søren Kierkegaard** | 19th–20th C. | Foggy Streets of Copenhagen | *Leap of Faith Phase* | High-speed armored forward phase strike with high hitstun reward. |
| **Friedrich Nietzsche** | 19th–20th C. | Sils-Maria Alpine Precipice | *Will to Power Surge* | Berserker scaling up to `1.85x` damage as health drops toward critical. |
| **Jean-Paul Sartre** | 19th–20th C. | The Smoky Parisian Café | *Condemned to Be Free* | No-win existential dilemma: blocking drains `16` meter and deals heavy chip damage. |
| **Ludwig Wittgenstein** | 19th–20th C. | The Cambridge Common Room | *Proposition 7 Silence Zone* | Spawns a linguistic boundary zone that disables opponent Special Moves for 4s. |

---

## Controls (Touch / Mouse / Keyboard)

### Dedicated Arcade Control Deck (Below the Fighting Screen)
- **Virtual D-Pad (Left Deck)**: `↑` Jump · `←` Move Left · `GUARD` Block · `→` Move Right · `↓` Crouch
- **Action Buttons (Right Deck)**: `PUNCH` (Light) · `KICK` (Heavy) · `SPECIAL` (20 Meter) · `SUPER` (100 Meter)

### Keyboard Shortcuts
- **Player 1**: `A` / `D` Move · `W` Jump · `S` Crouch · `J` Punch · `K` Kick · `L` Special · `U` / `Left Shift` Guard
- **Player 2 (Local 2P Mode)**: `←` / `→` Move · `↑` Jump · `↓` Crouch · `1` / `Numpad 1` Punch · `2` / `Numpad 2` Kick · `3` / `Numpad 3` Special · `0` / `Numpad 0` Guard

---

## Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server (Express + WebSocket Matchmaker + Vite)
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. Open a second browser tab to test live WebSocket/WebRTC P2P matchmaking in the **Online Matchmaker** tab.

### 3. Run Deterministic Engine Verification & Typecheck
```bash
npm run lint
npm test
```

### 4. Production Build & Start
```bash
npm run build
npm start
```

---

## Pushing to GitHub

```bash
git init
git add .
git commit -m "feat: Logos Arena 60Hz deterministic philosopher fighting game"
git branch -M main
git remote add origin https://github.com/<your-username>/logos-arena.git
git push -u origin main
```

---

## License

Released under the [MIT License](./LICENSE).
