import React, { useState } from 'react';
import { CombatArenaView, CombatMode } from './components/CombatArenaView';
import { StoryCampaignView } from './components/StoryCampaignView';
import { OnlineLobbyView, OnlineMatchConfig } from './components/OnlineLobbyView';
import { RosterCodexView } from './components/RosterCodexView';
import { TournamentAndLabView } from './components/TournamentAndLabView';
import {
  CampaignSaveProgress,
  StoryCampaignManager,
} from './engine/StoryCampaign';
import { CampaignStage } from './engine/types';

type ActiveTab = 'ARENA' | 'STORY' | 'ONLINE' | 'ROSTER' | 'TOURNAMENT';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ARENA');
  const [combatMode, setCombatMode] = useState<CombatMode>('VERSUS_AI');
  const [p1Key, setP1Key] = useState<string>('SOCRATES');
  const [p2Key, setP2Key] = useState<string>('NIETZSCHE');

  const [campaignProgress, setCampaignProgress] = useState<CampaignSaveProgress>(() =>
    StoryCampaignManager.loadProgress()
  );
  const [activeCampaignStage, setActiveCampaignStage] = useState<CampaignStage>(() =>
    StoryCampaignManager.getStageById(campaignProgress.currentStageId)
  );
  const [onlineConfig, setOnlineConfig] = useState<OnlineMatchConfig | null>(null);

  const handleStartCampaignStage = (stage: CampaignStage) => {
    setActiveCampaignStage(stage);
    setP2Key(stage.opponentKey);
    setCombatMode('STORY');
    setActiveTab('ARENA');
  };

  const handleCampaignMatchComplete = (
    stage: CampaignStage,
    won: boolean,
    winMethod: 'LOGICAL_COUNTER' | 'WILLPOWER_BREAK' | 'TIME_OUT' | null
  ) => {
    if (!won) {
      setActiveTab('STORY');
      return;
    }

    const updatedCompleted = Array.from(
      new Set([...campaignProgress.completedStageIds, stage.stageId])
    );

    const isLogical = winMethod === 'LOGICAL_COUNTER';
    const nextStageId = isLogical
      ? stage.nextStageOnLogicalWin
      : stage.nextStageOnWillpowerWin;

    const updated: CampaignSaveProgress = {
      currentStageId: nextStageId || 1,
      completedStageIds: updatedCompleted,
      logicalWinsCount: campaignProgress.logicalWinsCount + (isLogical ? 1 : 0),
      willpowerWinsCount: campaignProgress.willpowerWinsCount + (!isLogical ? 1 : 0),
      unlockedSecretLore: [
        ...campaignProgress.unlockedSecretLore,
        `${stage.opponentName} Treatise Cleared`,
      ],
    };

    StoryCampaignManager.saveProgress(updated);
    setCampaignProgress(updated);

    if (nextStageId) {
      const nextStage = StoryCampaignManager.getStageById(nextStageId);
      setActiveCampaignStage(nextStage);
      setP2Key(nextStage.opponentKey);
      setCombatMode('STORY');
      setActiveTab('ARENA');
    } else {
      setActiveTab('STORY');
    }
  };

  const handleStartOnlineMatch = (config: OnlineMatchConfig) => {
    setOnlineConfig(config);
    setP1Key(config.p1Philosopher);
    setP2Key(config.p2Philosopher);
    setCombatMode('ONLINE_P2P');
    setActiveTab('ARENA');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#F1F5F9]">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0B0F17]/95 sticky top-0 z-30 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#arena"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('ARENA');
          }}
          className="text-xl font-bold tracking-tight text-amber-400 font-display whitespace-nowrap shrink-0"
        >
          Logos Arena
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-300 overflow-x-auto">
          <a
            href="#arena"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('ARENA');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'ARENA'
                ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Combat Arena
          </a>
          <a
            href="#story"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('STORY');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'STORY'
                ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Story Campaign
          </a>
          <a
            href="#online"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('ONLINE');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'ONLINE'
                ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Online Matchmaker
          </a>
          <a
            href="#roster"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('ROSTER');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'ROSTER'
                ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Philosopher Roster
          </a>
          <a
            href="#tournament"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('TOURNAMENT');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'TOURNAMENT'
                ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Tournament & Repo
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setCombatMode('STORY');
              setActiveTab('ARENA');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Play Story Chapter
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'ARENA' && (
          <CombatArenaView
            mode={combatMode}
            p1Key={p1Key}
            p2Key={p2Key}
            onChangeP1={setP1Key}
            onChangeP2={setP2Key}
            onChangeMode={(m) => {
              setCombatMode(m);
              if (m === 'STORY') {
                const stg = StoryCampaignManager.getStageById(
                  campaignProgress.currentStageId
                );
                setActiveCampaignStage(stg);
                setP2Key(stg.opponentKey);
              }
            }}
            campaignStage={activeCampaignStage}
            onlineConfig={onlineConfig}
            onCampaignMatchComplete={handleCampaignMatchComplete}
          />
        )}

        {activeTab === 'STORY' && (
          <StoryCampaignView
            playerPhilosopherKey={p1Key}
            onSelectPlayerPhilosopher={setP1Key}
            progress={campaignProgress}
            onResetProgress={() => {
              const fresh = StoryCampaignManager.resetProgress();
              setCampaignProgress(fresh);
              setActiveCampaignStage(StoryCampaignManager.getStageById(1));
            }}
            onStartCampaignStage={handleStartCampaignStage}
          />
        )}

        {activeTab === 'ONLINE' && (
          <OnlineLobbyView
            selectedPhilosopher={p1Key}
            onSelectPhilosopher={setP1Key}
            onStartOnlineMatch={handleStartOnlineMatch}
            onStartSimulatedNetcodeMatch={() => {
              setCombatMode('NETCODE_SANDBOX');
              setActiveTab('ARENA');
            }}
          />
        )}

        {activeTab === 'ROSTER' && (
          <RosterCodexView
            selectedP1={p1Key}
            selectedP2={p2Key}
            onSelectP1={setP1Key}
            onSelectP2={setP2Key}
            onLaunchMatch={() => {
              setCombatMode('VERSUS_AI');
              setActiveTab('ARENA');
            }}
          />
        )}

        {activeTab === 'TOURNAMENT' && (
          <TournamentAndLabView
            onLaunchBracketMatch={(p1, p2) => {
              setP1Key(p1);
              setP2Key(p2);
              setCombatMode('VERSUS_AI');
              setActiveTab('ARENA');
            }}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1360px] w-full mx-auto">
        <span>
          Logos Arena · MIT Licensed Open-Source 60Hz Fighting Engine · 21 Historical Philosophers
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('ROSTER')}
            className="hover:text-slate-200 transition-colors"
          >
            Frame Data Codex
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('TOURNAMENT')}
            className="hover:text-slate-200 transition-colors"
          >
            Tournament & Repo Suite
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveTab('ONLINE')}
            className="hover:text-slate-200 transition-colors"
          >
            Online Rollback Lobby
          </button>
        </div>
      </footer>
    </div>
  );
}
