import React, { useState } from 'react';
import { ERA_LIST, PHILOSOPHER_LIST, PHILOSOPHER_ROSTER } from '../engine/FighterRoster';
import { EraCategory, PhilosopherProfile } from '../engine/types';
import { PhilosopherPortrait } from './PhilosopherPortrait';
import { SoundEngine } from '../engine/SoundEngine';
import { Volume2, Swords, ShieldAlert } from 'lucide-react';

interface RosterCodexViewProps {
  selectedP1: string;
  selectedP2: string;
  onSelectP1: (key: string) => void;
  onSelectP2: (key: string) => void;
  onLaunchMatch: () => void;
}

export const RosterCodexView: React.FC<RosterCodexViewProps> = ({
  selectedP1,
  selectedP2,
  onSelectP1,
  onSelectP2,
  onLaunchMatch,
}) => {
  const [eraFilter, setEraFilter] = useState<'ALL' | EraCategory>('ALL');
  const [inspectedKey, setInspectedKey] = useState<string>(selectedP1 || 'SOCRATES');

  const filteredPhilosophers = PHILOSOPHER_LIST.filter(
    (p) => eraFilter === 'ALL' || p.era === eraFilter
  );

  const inspected: PhilosopherProfile =
    PHILOSOPHER_ROSTER[inspectedKey] || PHILOSOPHER_ROSTER.SOCRATES;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Top Section Header & Interactive Era Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          <p className="text-xs text-amber-400/90 font-medium tracking-wide">
            21 Historical Fighters · 4 Philosophical Eras · Deterministic Frame Profiles
          </p>
          <h1 className="text-3xl font-bold text-slate-100 font-display">
            Philosopher Fighter Roster & Frame Data Codex
          </h1>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setEraFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              eraFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All Eras ({PHILOSOPHER_LIST.length})
          </button>
          {ERA_LIST.map((era) => (
            <button
              key={era}
              type="button"
              onClick={() => setEraFilter(era)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                eraFilter === era
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {era}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Roster Grid (7 cols on lg) + Right Detailed Frame Data & Lore Inspector (5 cols on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Roster Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/70">
            <span>
              Active Matchup: <strong className="text-sky-400">{PHILOSOPHER_ROSTER[selectedP1]?.name}</strong> vs{' '}
              <strong className="text-rose-400">{PHILOSOPHER_ROSTER[selectedP2]?.name}</strong>
            </span>
            <span>Click any philosopher to inspect frame data & assign fighter slot</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPhilosophers.map((phil) => {
              const isInspected = phil.key === inspectedKey;
              const isP1 = phil.key === selectedP1;
              const isP2 = phil.key === selectedP2;

              return (
                <div
                  key={phil.key}
                  onClick={() => setInspectedKey(phil.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setInspectedKey(phil.key);
                  }}
                  className={`p-3.5 rounded-lg border transition-colors cursor-pointer text-left flex flex-col justify-between gap-3 ${
                    isInspected
                      ? 'bg-slate-900 border-amber-500/80'
                      : 'bg-slate-900/45 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <PhilosopherPortrait philosopherKey={phil.key} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                          {phil.name}
                        </h3>
                        {(isP1 || isP2) && (
                          <span className="text-[11px] font-mono font-semibold text-amber-400 shrink-0">
                            {isP1 && isP2 ? 'P1 · P2' : isP1 ? 'P1' : 'P2'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {phil.years} · {phil.origin}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                        {phil.specialAbilityName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      HP {phil.maxHealth} · Spd {phil.walkSpeed}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectP1(phil.key);
                          setInspectedKey(phil.key);
                        }}
                        className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                          isP1
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Set P1
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectP2(phil.key);
                          setInspectedKey(phil.key);
                        }}
                        className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                          isP2
                            ? 'bg-rose-500 text-slate-950 font-semibold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Set P2
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Philosopher Inspector & Frame Data Sheet */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex items-start gap-4">
            <PhilosopherPortrait philosopherKey={inspected.key} size="lg" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="text-xs text-slate-400">
                <span>{inspected.era}</span>
                <span aria-hidden="true"> · </span>
                <span>{inspected.years}</span>
                <span aria-hidden="true"> · </span>
                <span>{inspected.origin}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-100 font-display">
                {inspected.name}
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                {inspected.fightingStyle}
              </p>
            </div>
          </div>

          {/* Signature Philosophy Quote & Neural Voice Preview */}
          <div className="py-3 px-4 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Signature Philosophy</span>
              <button
                type="button"
                onClick={() =>
                  SoundEngine.speakQuote(inspected.name, inspected.signaturePhilosophy)
                }
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Speak Quote
              </button>
            </div>
            <p className="text-sm italic text-slate-200">
              “{inspected.signaturePhilosophy}”
            </p>
          </div>

          {/* Stage & Timeline Attire Metadata */}
          <div className="space-y-3 text-sm border-t border-slate-800 pt-4">
            <div>
              <span className="text-xs text-slate-400 block">Stage Arena</span>
              <span className="font-semibold text-slate-200">{inspected.stageBackground}</span>
              <p className="text-xs text-slate-400 mt-0.5">{inspected.stageDescription}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Timeline Attire</span>
              <p className="text-xs text-slate-300 mt-0.5">{inspected.attireDescription}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">
                Signature Mechanic · {inspected.specialAbilityName}
              </span>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {inspected.specialMechanicSummary}
              </p>
            </div>
          </div>

          {/* Explicit Frame Data Table (60Hz Deterministic) */}
          <div className="space-y-2 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                60 FPS Frame Data Specification
              </span>
              <span className="font-mono tabular-nums">
                Max HP: {inspected.maxHealth} · Walk: {inspected.walkSpeed} px/f
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2 font-sans font-medium">Attack</th>
                    <th className="py-2 px-2">Startup</th>
                    <th className="py-2 px-2">Active</th>
                    <th className="py-2 px-2">Recovery</th>
                    <th className="py-2 px-2">Hit/Blk</th>
                    <th className="py-2 pl-2 text-right">Dmg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-sky-300">
                      Light ({inspected.lightMove.name})
                    </td>
                    <td className="py-2 px-2">{inspected.lightMove.startupFrames}f</td>
                    <td className="py-2 px-2">{inspected.lightMove.activeFrames}f</td>
                    <td className="py-2 px-2">{inspected.lightMove.recoveryFrames}f</td>
                    <td className="py-2 px-2">
                      +{inspected.lightMove.hitstunDuration - inspected.lightMove.recoveryFrames} /{' '}
                      {inspected.lightMove.blockstunDuration - inspected.lightMove.recoveryFrames}
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold">
                      {inspected.lightMove.damage}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-amber-300">
                      Heavy ({inspected.heavyMove.name})
                    </td>
                    <td className="py-2 px-2">{inspected.heavyMove.startupFrames}f</td>
                    <td className="py-2 px-2">{inspected.heavyMove.activeFrames}f</td>
                    <td className="py-2 px-2">{inspected.heavyMove.recoveryFrames}f</td>
                    <td className="py-2 px-2">
                      +{inspected.heavyMove.hitstunDuration - inspected.heavyMove.recoveryFrames} /{' '}
                      {inspected.heavyMove.blockstunDuration - inspected.heavyMove.recoveryFrames}
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold">
                      {inspected.heavyMove.damage}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-emerald-300">
                      Special ({inspected.specialMove.name})
                    </td>
                    <td className="py-2 px-2">{inspected.specialMove.startupFrames}f</td>
                    <td className="py-2 px-2">{inspected.specialMove.activeFrames}f</td>
                    <td className="py-2 px-2">{inspected.specialMove.recoveryFrames}f</td>
                    <td className="py-2 px-2">
                      +{inspected.specialMove.hitstunDuration - inspected.specialMove.recoveryFrames} /{' '}
                      +{inspected.specialMove.blockstunDuration - inspected.specialMove.recoveryFrames}
                    </td>
                    <td className="py-2 pl-2 text-right font-semibold">
                      {inspected.specialMove.damage}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onSelectP1(inspected.key)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 transition-colors whitespace-nowrap shrink-0"
            >
              Assign {inspected.name} to P1
            </button>
            <button
              type="button"
              onClick={() => onSelectP2(inspected.key)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors whitespace-nowrap shrink-0"
            >
              Assign {inspected.name} to P2
            </button>
            <button
              type="button"
              onClick={onLaunchMatch}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              <Swords className="w-3.5 h-3.5" />
              Enter Arena With Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
