import React, { useEffect, useState } from 'react';
import { PHILOSOPHER_LIST, PHILOSOPHER_ROSTER } from '../engine/FighterRoster';
import { PhilosopherPortrait } from './PhilosopherPortrait';
import { Globe, Users, Play, RefreshCw, Copy, Check } from 'lucide-react';

export interface OnlineMatchConfig {
  roomId: string;
  localId: string;
  localName: string;
  localSlot: 1 | 2;
  p1Philosopher: string;
  p2Philosopher: string;
  isHost: boolean;
  ws: WebSocket;
}

interface RoomSummary {
  roomId: string;
  stageKey: string;
  playerCount: number;
  players: { id: string; name: string; philosopherKey: string; slot: 1 | 2 }[];
  createdAt: number;
}

interface OnlineLobbyViewProps {
  selectedPhilosopher: string;
  onSelectPhilosopher: (key: string) => void;
  onStartOnlineMatch: (config: OnlineMatchConfig) => void;
  onStartSimulatedNetcodeMatch: () => void;
}

export const OnlineLobbyView: React.FC<OnlineLobbyViewProps> = ({
  selectedPhilosopher,
  onSelectPhilosopher,
  onStartOnlineMatch,
  onStartSimulatedNetcodeMatch,
}) => {
  const [playerName, setPlayerName] = useState('Dialectician');
  const [roomCodeInput, setRoomCodeInput] = useState('AGORA-01');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [localSlot, setLocalSlot] = useState<1 | 2>(1);
  const [localId] = useState(() => `peer_${Math.random().toString(36).slice(2, 9)}`);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [isQueued, setIsQueued] = useState(false);
  const [roomPeers, setRoomPeers] = useState<
    { id: string; name: string; philosopherKey: string; slot: 1 | 2 }[]
  >([]);
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?peerId=${encodeURIComponent(
      localId
    )}&name=${encodeURIComponent(playerName)}&philosopher=${encodeURIComponent(
      selectedPhilosopher
    )}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ROOMS_UPDATE') {
          setRooms(msg.rooms || []);
          setQueueSize(msg.queueSize || 0);
        } else if (msg.type === 'ROOM_JOINED') {
          setActiveRoomId(msg.roomId);
          setRoomPeers(msg.peers || []);
          if (msg.assignedSlot) setLocalSlot(msg.assignedSlot);
          setIsQueued(false);
        } else if (msg.type === 'QUEUE_MATCHED') {
          setIsQueued(false);
          setRoomCodeInput(msg.roomId);
          ws.send(
            JSON.stringify({
              type: 'JOIN_ROOM',
              roomId: msg.roomId,
              peerId: localId,
              name: playerName,
              philosopherKey: selectedPhilosopher,
            })
          );
        } else if (msg.type === 'MATCH_READY') {
          onStartOnlineMatch({
            roomId: msg.roomId,
            localId,
            localName: playerName,
            localSlot: msg.isHost ? 1 : 2,
            p1Philosopher: msg.p1Philosopher,
            p2Philosopher: msg.p2Philosopher,
            isHost: msg.isHost,
            ws,
          });
        }
      } catch {
        // Ignore non-JSON frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    setWsInstance(ws);

    return () => {
      // Only close if we are not transitioning into an active match
    };
  }, [localId]);

  const handleJoinRoom = (targetCode: string) => {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return;
    const code = targetCode.trim().toUpperCase() || 'AGORA-01';
    setRoomCodeInput(code);
    wsInstance.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: code,
        peerId: localId,
        name: playerName,
        philosopherKey: selectedPhilosopher,
      })
    );
  };

  const handleJoinQueue = () => {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return;
    setIsQueued(true);
    wsInstance.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        peerId: localId,
        name: playerName,
        philosopherKey: selectedPhilosopher,
      })
    );
  };

  const handleCopyRoom = () => {
    if (!activeRoomId) return;
    navigator.clipboard.writeText(activeRoomId).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const currentPhil =
    PHILOSOPHER_ROSTER[selectedPhilosopher] || PHILOSOPHER_ROSTER.SOCRATES;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-2">
          <p className="text-xs text-amber-400 font-medium">
            WebRTC Peer-to-Peer + WebSocket Signaling Broker · 5-Byte BinaryStreamer Packets · 30-Frame CRC32 Checksum
          </p>
          <h1 className="text-3xl font-bold text-slate-100 font-display">
            Online Rollback Netcode Matchmaker
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
          <span>
            Signaling Server: <strong>{connected ? 'CONNECTED (/ws)' : 'RECONNECTING'}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>Queue Waiting: {queueSize}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Room Creation, Quick Match Queue & Active Lobby */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-100">
              01. Configure Fighter & Matchmaking Room
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Challenger Handle
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Room Code (Open in 2nd tab to pair live)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(roomCodeInput)}
                    className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    Create / Join Room
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Match & Rollback Sandbox Trigger */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleJoinQueue}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                {isQueued ? 'Searching Matchmaking Queue...' : 'Join Quick-Match Queue'}
              </button>

              <button
                type="button"
                onClick={onStartSimulatedNetcodeMatch}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 text-amber-400" />
                Launch Rollback Netcode Stress-Test Sandbox
              </button>
            </div>
          </div>

          {/* Active Room Status */}
          {activeRoomId && (
            <div className="bg-slate-900/80 border border-amber-500/60 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-amber-400 font-mono">
                    ACTIVE LOBBY ROOM · SLOT P{localSlot}
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 font-mono">
                    {activeRoomId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRoom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Room Code
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((slotNum) => {
                  const peer = roomPeers.find((p) => p.slot === slotNum);
                  return (
                    <div
                      key={slotNum}
                      className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-3"
                    >
                      {peer ? (
                        <>
                          <PhilosopherPortrait philosopherKey={peer.philosopherKey} size="sm" />
                          <div>
                            <div className="text-xs font-mono text-amber-400">
                              Player {slotNum} ({peer.name})
                            </div>
                            <div className="text-sm font-semibold text-slate-100">
                              {PHILOSOPHER_ROSTER[peer.philosopherKey]?.name}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 py-2">
                          Waiting for Player {slotNum} to join room <strong>{activeRoomId}</strong>...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                Tip: Open a second browser tab to this URL and join room{' '}
                <strong className="text-slate-200 font-mono">{activeRoomId}</strong> to start a live P2P WebRTC/WebSocket rollback match immediately, or click{' '}
                <button
                  type="button"
                  onClick={onStartSimulatedNetcodeMatch}
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  Launch Rollback Netcode Stress-Test Sandbox
                </button>{' '}
                to test packet rollback & CRC32 verification right now.
              </p>
            </div>
          )}

          {/* Open Rooms Directory */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">
                02. Open Signaling Rooms ({rooms.length})
              </h2>
              <span className="text-xs text-slate-400">
                Real-time WebSocket room state
              </span>
            </div>

            {rooms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                No active public rooms yet. Enter a room code above and click "Create / Join Room" to host a match.
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {rooms.map((rm) => (
                  <div
                    key={rm.roomId}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-sm font-mono font-semibold text-slate-100">
                        {rm.roomId}
                      </span>
                      <span className="text-xs text-slate-400 ml-3">
                        {rm.players.map((p) => `${p.name} (${PHILOSOPHER_ROSTER[p.philosopherKey]?.name})`).join(' vs ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        {rm.playerCount}/2 Peers
                      </span>
                      <button
                        type="button"
                        onClick={() => handleJoinRoom(rm.roomId)}
                        disabled={rm.playerCount >= 2 && rm.roomId !== activeRoomId}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Philosopher Selection for Online Match */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-lg p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <PhilosopherPortrait philosopherKey={currentPhil.key} size="md" />
            <div>
              <span className="text-xs text-amber-400">Selected Online Fighter</span>
              <h3 className="text-xl font-bold text-slate-100 font-display">
                {currentPhil.name}
              </h3>
              <p className="text-xs text-slate-400">
                {currentPhil.specialAbilityName} · {currentPhil.stageBackground}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {PHILOSOPHER_LIST.map((phil) => (
              <button
                key={phil.key}
                type="button"
                onClick={() => {
                  onSelectPhilosopher(phil.key);
                  if (wsInstance && wsInstance.readyState === WebSocket.OPEN && activeRoomId) {
                    wsInstance.send(
                      JSON.stringify({
                        type: 'FIGHTER_SELECT',
                        philosopherKey: phil.key,
                      })
                    );
                  }
                }}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  selectedPhilosopher === phil.key
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <PhilosopherPortrait philosopherKey={phil.key} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{phil.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{phil.era.split(' ')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
