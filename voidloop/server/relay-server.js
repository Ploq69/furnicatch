/**
 * Voidloop Relay Server
 * Lightweight message relay for dad+daughter co-op.
 * No game logic — just routes messages between players.
 */

import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = 2;
const JOIN_RATE_LIMIT = 5; // attempts per minute per IP
const RATE_WINDOW_MS = 60_000;

// In-memory state (no database needed for 2-player co-op)
const rooms = new Map(); // roomCode -> Room
const joinAttempts = new Map(); // ip -> [{timestamp}]

function generateRoomCode() {
  const words = ['WOLF', 'BEAR', 'LION', 'FROG', 'DUCK', 'FISH', 'BIRD', 'MOON', 'STAR', 'SUN', 'FIRE', 'WIND', 'RAIN', 'SNOW', 'LEAF', 'TREE', 'ROCK', 'GOLD', 'RUBY', 'JADE'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 8999) + 1000; // 1000-9999
  return `${word}-${num}`;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = joinAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < RATE_WINDOW_MS);
  joinAttempts.set(ip, recent);
  return recent.length < JOIN_RATE_LIMIT;
}

function recordAttempt(ip) {
  const attempts = joinAttempts.get(ip) || [];
  attempts.push(Date.now());
  joinAttempts.set(ip, attempts);
}

function cleanupEmptyRooms() {
  for (const [code, room] of rooms) {
    if (room.sockets.size === 0) {
      rooms.delete(code);
      console.log(`[Cleanup] Removed empty room: ${code}`);
    }
  }
}

// Clean up empty rooms every 30 seconds
setInterval(cleanupEmptyRooms, 30_000);

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Allow large messages for initial state sync if needed
  maxHttpBufferSize: 1e6,
});

io.on('connection', (socket) => {
  const clientIp = socket.handshake.address;
  console.log(`[Connect] ${socket.id} from ${clientIp}`);

  let currentRoom = null;
  let playerName = 'Player';

  // ── Host: create a room ──
  socket.on('host_room', (opts = {}, cb) => {
    if (currentRoom) {
      cb({ ok: false, error: 'Already in a room' });
      return;
    }

    let code;
    do { code = generateRoomCode(); } while (rooms.has(code));

    const room = {
      code,
      hostId: socket.id,
      password: opts.password || null,
      maxPlayers: opts.maxPlayers || MAX_PLAYERS_PER_ROOM,
      sockets: new Map(), // socketId -> { socket, name, approved }
      banned: new Set(),
    };
    rooms.set(code, room);
    currentRoom = code;
    playerName = opts.name || 'Host';
    room.sockets.set(socket.id, { socket, name: playerName, approved: true, isHost: true });
    socket.join(code);

    console.log(`[Host] ${playerName} created room ${code}`);
    cb({ ok: true, code });
  });

  // ── Client: request to join ──
  socket.on('join_request', (opts = {}, cb) => {
    const { code, password, name = 'Guest' } = opts;

    if (!checkRateLimit(clientIp)) {
      cb({ ok: false, error: 'Too many attempts. Try again in a minute.' });
      return;
    }
    recordAttempt(clientIp);

    const room = rooms.get(code);
    if (!room) {
      cb({ ok: false, error: 'Room not found' });
      return;
    }

    if (room.banned.has(socket.id)) {
      cb({ ok: false, error: 'You were rejected from this room' });
      return;
    }

    if (room.sockets.size >= room.maxPlayers) {
      cb({ ok: false, error: 'Room is full' });
      return;
    }

    if (room.password && room.password !== password) {
      cb({ ok: false, error: 'Wrong password' });
      return;
    }

    if (room.sockets.has(socket.id)) {
      cb({ ok: false, error: 'Already in this room' });
      return;
    }

    // All checks passed — send approval request to host
    playerName = name;
    currentRoom = code; // tentatively mark, but not approved yet
    room.sockets.set(socket.id, { socket, name, approved: false, isHost: false });
    socket.join(code);

    // Notify host
    const host = room.sockets.get(room.hostId);
    if (host) {
      host.socket.emit('join_request', {
        socketId: socket.id,
        name: playerName,
      });
    }

    console.log(`[Join] ${name} requested to join ${code}`);
    cb({ ok: true, status: 'waiting_for_approval' });
  });

  // ── Host: approve or reject join ──
  socket.on('approve_player', ({ socketId, approve }, cb) => {
    const room = rooms.get(currentRoom);
    if (!room || room.hostId !== socket.id) {
      cb?.({ ok: false, error: 'Not authorized' });
      return;
    }

    const pending = room.sockets.get(socketId);
    if (!pending || pending.approved) {
      cb?.({ ok: false, error: 'Player not found or already handled' });
      return;
    }

    if (approve) {
      pending.approved = true;
      pending.socket.emit('join_approved', {
        roomCode: room.code,
        hostName: room.sockets.get(room.hostId)?.name || 'Host',
      });

      // Notify everyone in room about new player
      io.to(room.code).emit('player_joined', {
        socketId,
        name: pending.name,
        isHost: false,
      });

      // Send existing players to the new player
      for (const [sid, info] of room.sockets) {
        if (sid !== socketId && info.approved) {
          pending.socket.emit('player_joined', {
            socketId: sid,
            name: info.name,
            isHost: info.isHost,
          });
        }
      }

      console.log(`[Approve] ${pending.name} joined ${room.code}`);
      cb?.({ ok: true });
    } else {
      // Reject: ban and disconnect
      room.banned.add(socketId);
      pending.socket.emit('join_rejected', { reason: 'Host declined your request' });
      pending.socket.leave(room.code);
      room.sockets.delete(socketId);
      console.log(`[Reject] ${pending.name} rejected from ${room.code}`);
      cb?.({ ok: true });
    }
  });

  // ── Relay game messages ──
  socket.on('game_msg', (payload) => {
    const room = rooms.get(currentRoom);
    if (!room) return;

    const self = room.sockets.get(socket.id);
    if (!self || !self.approved) return; // only approved players can send

    // Attach sender id and broadcast to all OTHER players in room
    const enriched = { ...payload, _from: socket.id };
    socket.to(room.code).emit('game_msg', enriched);
  });

  // ── Host broadcasts to all (including self if needed) ──
  socket.on('game_broadcast', (payload) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (room.hostId !== socket.id) return; // only host can broadcast

    const enriched = { ...payload, _from: socket.id };
    io.to(room.code).emit('game_msg', enriched);
  });

  // ── Disconnect ──
  socket.on('disconnect', (reason) => {
    console.log(`[Disconnect] ${socket.id} (${playerName}) reason: ${reason}`);

    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        const wasHost = room.hostId === socket.id;
        room.sockets.delete(socket.id);

        if (wasHost) {
          // Host left — destroy room, notify all
          io.to(currentRoom).emit('host_left', { reason: 'Host disconnected' });
          for (const [, info] of room.sockets) {
            info.socket.leave(currentRoom);
          }
          rooms.delete(currentRoom);
          console.log(`[Room] ${currentRoom} destroyed (host left)`);
        } else {
          // Player left — notify others
          socket.to(currentRoom).emit('player_left', { socketId: socket.id, name: playerName });
        }
      }
    }
  });
});

io.listen(PORT);
console.log(`[Voidloop Relay] Listening on port ${PORT}`);
console.log(`[Voidloop Relay] Connect clients to: ws://localhost:${PORT}`);
