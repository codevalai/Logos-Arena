import React from 'react';
import {
  PHILOSOPHER_CAMPAIGN_GRAPH,
  CampaignSaveProgress,
  StoryCampaignManager,
} from '../engine/StoryCampaign';
import { PHILOSOPHER_LIST, PHILOSOPHER_ROSTER } from '../engine/FighterRoster';
import { CampaignStage } from '../engine/types';
import { PhilosopherPortrait } from './PhilosopherPortrait';
import { Play, RotateCcw, CheckCircle2, Lock, GitBranch } from 'lucide-react';

interface StoryCampaignViewProps {
  playerPhilosopherKey: string;
  onSelectPlayerPhilosopher: (key: string) => void;
  progress: CampaignSaveProgress;
  onResetProgress: () => void;
  onStartCampaignStage: (stage: CampaignStage) => void;
}

export const StoryCampaignView: React.FC<StoryCampaignViewProps> = ({
  playerPhilosopherKey,
  onSelectPlayerPhilosopher,
  progress,
  onResetProgress,
  onStartCampaignStage,
}) => {
  const activeStage = StoryCampaignManager.getStageById(progress.currentStageId);
  const playerProfile =
    PHILOSOPHER_ROSTER[playerPhilosopherKey] || PHILOSOPHER_ROSTER.SOCRATES;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          <p className="text-xs text-amber-400 font-medium">
            Branching Narrative Campaign · Win via Logical Special Counter or Willpower Strike to Alter Your Route
          </p>
          <h1 className="text-3xl font-bold text-slate-100 font-display">
            Story Mode: The Dialectical Odyssey
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
          <span>
            Cleared Chapters: <strong>{progress.completedStageIds.length}/9</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>Logical Wins: {progress.logicalWinsCount}</span>
          <span aria-hidden="true">·</span>
          <span>Willpower Wins: {progress.willpowerWinsCount}</span>
          <button
            type="button"
            onClick={onResetProgress}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Campaign
          </button>
        </div>
      </div>

      {/* Main Split: Active Chapter Briefing (Left 5 cols) + Branching Campaign Progression Tree (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Protagonist Selector & Current Chapter Briefing */}
        <div className="lg:col-span-5 space-y-6">
          {/* Protagonist Selection with Faces & Names */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Choose Your Campaign Protagonist (21 Philosophers)</span>
              <span className="text-xs font-mono text-amber-400">{playerProfile.era}</span>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
              <PhilosopherPortrait philosopherKey={playerProfile.key} size="md" />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-100 font-display truncate">
                  {playerProfile.name}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  {playerProfile.specialAbilityName} · {playerProfile.fightingStyle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {PHILOSOPHER_LIST.map((p) => {
                const isSelected = playerPhilosopherKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onSelectPlayerPhilosopher(p.key)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-slate-100 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <PhilosopherPortrait philosopherKey={p.key} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {p.era.split(' ')[0]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Stage Briefing & Dialogue Preview */}
          <div className="bg-slate-900/80 border border-amber-500/50 rounded-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-amber-400 font-medium">
                  Active Stage · {activeStage.era} · AI Tier {activeStage.aiDifficulty}/5
                </p>
                <h2 className="text-2xl font-bold text-slate-100 font-display mt-1">
                  {activeStage.chapterTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Arena: {activeStage.stageBackground} · Opponent: {activeStage.opponentName}
                </p>
              </div>
              <PhilosopherPortrait philosopherKey={activeStage.opponentKey} size="md" />
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <span className="text-xs font-semibold text-amber-300 block">
                Stage Condition & Philosophical Hazard
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeStage.matchRuleDescription}
              </p>
            </div>

            {/* Intro Dialogue Excerpt */}
            <div className="space-y-2.5 border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400 block">
                Pre-Match Dialectical Exchange
              </span>
              {activeStage.introDialogue.map((node, i) => (
                <div
                  key={i}
                  className="text-xs leading-relaxed p-2.5 rounded bg-slate-950/60 border border-slate-800/60"
                >
                  <strong
                    className={
                      node.role === 'opponent' ? 'text-rose-400' : 'text-sky-400'
                    }
                  >
                    {node.speaker}:
                  </strong>{' '}
                  <span className="text-slate-200">“{node.text}”</span>
                </div>
              ))}
            </div>

            {/* Branching Path Notice */}
            <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
              <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Finish final round with a <strong>Special / Super Move</strong> for the{' '}
                <strong className="text-sky-300">Logical Counter Route</strong>, or with a{' '}
                <strong>Light / Heavy Strike</strong> for the{' '}
                <strong className="text-amber-300">Willpower Route</strong>.
              </span>
            </div>

            <button
              type="button"
              onClick={() => onStartCampaignStage(activeStage)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              Start {activeStage.chapterTitle}
            </button>
          </div>
        </div>

        {/* Right: Branching Node Graph of all 9 Chapters */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-slate-100">
              Campaign Progression Graph (4 Historical Eras)
            </h3>
            <span className="text-xs text-slate-400">
              Click any unlocked stage to replay or branch
            </span>
          </div>

          <div className="space-y-3">
            {PHILOSOPHER_CAMPAIGN_GRAPH.map((stage) => {
              const isCompleted = progress.completedStageIds.includes(stage.stageId);
              const isCurrent = progress.currentStageId === stage.stageId;
              const isUnlocked =
                stage.stageId === 1 ||
                isCompleted ||
                isCurrent ||
                progress.completedStageIds.length >= stage.stageId - 2;

              return (
                <div
                  key={stage.stageId}
                  className={`p-4 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-slate-900 border-amber-500/80'
                      : isCompleted
                      ? 'bg-slate-900/50 border-emerald-500/40'
                      : 'bg-slate-950/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <PhilosopherPortrait philosopherKey={stage.opponentKey} size="sm" />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-amber-400">
                          Stage 0{stage.stageId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{stage.era}</span>
                        <span aria-hidden="true">·</span>
                        <span>AI Tier {stage.aiDifficulty}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-100 truncate">
                        {stage.chapterTitle} — vs. {stage.opponentName}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {stage.stageBackground} ·{' '}
                        {stage.nextStageOnLogicalWin
                          ? `Branches to Stage 0${stage.nextStageOnLogicalWin} (Logical) / Stage 0${stage.nextStageOnWillpowerWin} (Willpower)`
                          : 'Grand Finale of the Odyssey'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cleared
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => onStartCampaignStage(stage)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : isUnlocked
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          {isCompleted ? 'Replay Stage' : 'Fight Stage'}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
