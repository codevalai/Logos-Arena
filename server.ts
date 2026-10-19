import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomPeer {
  id: string;
  name: string;
  philosopherKey: string;
  slot: 1 | 2;
  ws: WebSocket;
}

interface MatchRoom {
  roomId: string;
  stageKey: string;
  peers: RoomPeer[];
  createdAt: number;
  lastChecksumFrame: number;
  checksums: Record<number, Record<string, number>>;
}

const rooms = new Map<string, MatchRoom>();
const matchmakingQueue: { id: string; name: string; philosopherKey: string; ws: WebSocket }[] = [];

function broadcastRoomList(wss: WebSocketServer) {
  const publicRooms = Array.from(rooms.values()).map((r) => ({
    roomId: r.roomId,
    stageKey: r.stageKey,
    playerCount: r.peers.length,
    players: r.peers.map((p) => ({ id: p.id, name: p.name, philosopherKey: p.philosopherKey, slot: p.slot })),
    createdAt: r.createdAt,
  }));
  const payload = JSON.stringify({ type: 'ROOMS_UPDATE', rooms: publicRooms, queueSize: matchmakingQueue.length });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  app.use(express.json());

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values()).map((r) => ({
      roomId: r.roomId,
      stageKey: r.stageKey,
      playerCount: r.peers.length,
      players: r.peers.map((p) => ({ id: p.id, name: p.name, philosopherKey: p.philosopherKey, slot: p.slot })),
      createdAt: r.createdAt,
    }));
    res.json({ rooms: publicRooms, queueSize: matchmakingQueue.length });
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '/ws', 'http://localhost:3000');
    let currentRoomId = url.searchParams.get('room') || '';
    let peerId = url.searchParams.get('peerId') || `peer_${Math.random().toString(36).slice(2, 9)}`;
    let peerName = url.searchParams.get('name') || 'Challenger';
    let philosopherKey = url.searchParams.get('philosopher') || 'SOCRATES';

    const joinRoom = (targetRoomId: string, preferredPhilosopher?: string) => {
      if (preferredPhilosopher) philosopherKey = preferredPhilosopher;
      // Leave previous room if any
      if (currentRoomId && rooms.has(currentRoomId)) {
        const oldRoom = rooms.get(currentRoomId)!;
        oldRoom.peers = oldRoom.peers.filter((p) => p.id !== peerId);
        if (oldRoom.peers.length === 0) {
          rooms.delete(currentRoomId);
        }
      }

      currentRoomId = targetRoomId.toUpperCase();
      let room = rooms.get(currentRoomId);
      if (!room) {
        room = {
          roomId: currentRoomId,
          stageKey: philosopherKey,
          peers: [],
          createdAt: Date.now(),
          lastChecksumFrame: 0,
          checksums: {},
        };
        rooms.set(currentRoomId, room);
      }

      // Idempotency guard: check if peer already exists
      const existing = room.peers.find((p) => p.id === peerId);
      if (!existing && room.peers.length < 2) {
        const slot: 1 | 2 = room.peers.some((p) => p.slot === 1) ? 2 : 1;
        room.peers.push({
          id: peerId,
          name: peerName,
          philosopherKey,
          slot,
          ws,
        });
      }

      // Notify all peers in the room
      const roomSnapshot = {
        type: 'ROOM_JOINED',
        roomId: room.roomId,
        stageKey: room.stageKey,
        peers: room.peers.map((p) => ({
          id: p.id,
          name: p.name,
          philosopherKey: p.philosopherKey,
          slot: p.slot,
        })),
      };

      room.peers.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(JSON.stringify({ ...roomSnapshot, assignedSlot: p.slot, localId: p.id }));
        }
      });

      if (room.peers.length === 2) {
        const [p1, p2] = room.peers;
        room.peers.forEach((p) => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(
              JSON.stringify({
                type: 'MATCH_READY',
                roomId: room!.roomId,
                hostId: p1.id,
                guestId: p2.id,
                p1Philosopher: p1.philosopherKey,
                p2Philosopher: p2.philosopherKey,
                isHost: p.id === p1.id,
              })
            );
          }
        });
      }

      broadcastRoomList(wss);
    };

    if (currentRoomId) {
      joinRoom(currentRoomId, philosopherKey);
    } else {
      broadcastRoomList(wss);
    }

    ws.on('message', (raw, isBinary) => {
      // Binary frame packet relay (5-byte BinaryStreamer payload)
      if (isBinary) {
        if (!currentRoomId || !rooms.has(currentRoomId)) return;
        const room = rooms.get(currentRoomId)!;
        room.peers.forEach((p) => {
          if (p.id !== peerId && p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(raw, { binary: true });
          }
        });
        return;
      }

      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'JOIN_ROOM') {
          if (msg.peerId) peerId = msg.peerId;
          if (msg.name) peerName = msg.name;
          joinRoom(msg.roomId || 'AGORA-01', msg.philosopherKey);
          return;
        }

        if (msg.type === 'JOIN_QUEUE') {
          if (msg.peerId) peerId = msg.peerId;
          if (msg.name) peerName = msg.name;
          if (msg.philosopherKey) philosopherKey = msg.philosopherKey;

          const alreadyQueued = matchmakingQueue.some((q) => q.id === peerId);
          if (!alreadyQueued) {
            matchmakingQueue.push({ id: peerId, name: peerName, philosopherKey, ws });
          }

          if (matchmakingQueue.length >= 2) {
            const playerA = matchmakingQueue.shift()!;
            const playerB = matchmakingQueue.shift()!;
            const autoRoomId = `ARENA-${Math.floor(1000 + Math.random() * 9000)}`;

            // Send assignment to both players
            [playerA, playerB].forEach((pl) => {
              if (pl.ws.readyState === WebSocket.OPEN) {
                pl.ws.send(JSON.stringify({ type: 'QUEUE_MATCHED', roomId: autoRoomId }));
              }
            });
          } else {
            broadcastRoomList(wss);
          }
          return;
        }

        if (msg.type === 'FIGHTER_SELECT' && currentRoomId && rooms.has(currentRoomId)) {
          const room = rooms.get(currentRoomId)!;
          const peer = room.peers.find((p) => p.id === peerId);
          if (peer && msg.philosopherKey) {
            peer.philosopherKey = msg.philosopherKey;
            room.peers.forEach((p) => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(
                  JSON.stringify({
                    type: 'FIGHTER_SELECTED',
                    peerId,
                    slot: peer.slot,
                    philosopherKey: peer.philosopherKey,
                  })
                );
              }
            });
          }
          return;
        }

        if (msg.type === 'CHECKSUM' && currentRoomId && rooms.has(currentRoomId)) {
          const room = rooms.get(currentRoomId)!;
          const frame = Number(msg.frame);
          const checksum = Number(msg.checksum);
          if (!room.checksums[frame]) room.checksums[frame] = {};
          room.checksums[frame][peerId] = checksum;

          // Prune old checksum frames
          const keys = Object.keys(room.checksums).map(Number);
          if (keys.length > 30) {
            delete room.checksums[Math.min(...keys)];
          }
        }

        // Relay WebRTC Signaling (OFFER, ANSWER, ICE) and Rollback Frame Inputs (INPUT, CHECKSUM, REMATCH)
        if (currentRoomId && rooms.has(currentRoomId)) {
          const room = rooms.get(currentRoomId)!;
          room.peers.forEach((p) => {
            if (p.id !== peerId && p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({ ...msg, senderId: peerId }));
            }
          });
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    });

    ws.on('close', () => {
      const qIdx = matchmakingQueue.findIndex((q) => q.id === peerId);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);

      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId)!;
        room.peers = room.peers.filter((p) => p.id !== peerId);
        room.peers.forEach((p) => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ type: 'PEER_LEFT', peerId }));
          }
        });
        if (room.peers.length === 0) {
          rooms.delete(currentRoomId);
        }
      }
      broadcastRoomList(wss);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Logos Arena Server & Matchmaking Broker listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
