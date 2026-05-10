/**
 * NetworkManager — Firebase Realtime Database multiplayer
 * Zero servers. Zero terminals. Works across any network.
 */

import {
  ref,
  set,
  onValue,
  push,
  onChildAdded,
  onDisconnect,
  remove,
  get,
  off,
} from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';
import { db } from './firebase-config.js';

function generateRoomCode() {
  const words = ['WOLF','BEAR','LION','FROG','DUCK','FISH','BIRD','MOON','STAR','SUN','FIRE','WIND','RAIN','SNOW','LEAF','TREE','ROCK','GOLD','RUBY','JADE'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 8999) + 1000;
  return `${w}-${n}`;
}

export class NetworkManager {
  constructor() {
    this.isHost = false;
    this.roomCode = null;
    this.role = null;
    this.connected = false;
    this._handlers = new Map();
    this._unsubs = [];
  }

  // ── Host: create a room ──
  async host(opts = {}) {
    if (!db) throw new Error('Firebase not initialized');

    let code;
    for (let attempts = 0; attempts < 10; attempts++) {
      code = generateRoomCode();
      const snap = await get(ref(db, `voidloop-rooms/${code}`));
      if (!snap.exists()) break;
    }

    this.roomCode = code;
    this.isHost = true;
    this.role = 'host';

    const roomRef = ref(db, `voidloop-rooms/${code}`);
    await set(roomRef, {
      host: { connected: true, name: opts.name || 'Host', joinedAt: Date.now() },
      guest: { connected: false },
      approval: 'pending',
      gameStarted: false,
      createdAt: Date.now(),
    });

    onDisconnect(roomRef).remove();

    // Listen for guest join requests
    const guestRef = ref(db, `voidloop-rooms/${code}/guest/connected`);
    const onGuestJoin = (snap) => {
      if (snap.val() === true) this._emit('join_request', {});
    };
    const unsubGuest = onValue(guestRef, onGuestJoin);
    this._unsubs.push(() => { off(guestRef, 'value', onGuestJoin); unsubGuest(); });

    // Listen for messages from guest (for future gameplay sync)
    const msgRef = ref(db, `voidloop-rooms/${code}/messages`);
    const onGuestMsg = (snap) => {
      const msg = snap.val();
      if (msg && msg.from === 'guest') this._emit('data', msg.data);
    };
    const unsubMsg = onChildAdded(msgRef, onGuestMsg);
    this._unsubs.push(() => { off(msgRef, 'child_added', onGuestMsg); unsubMsg(); });

    this._emit('host_ready', { code });
    return { code };
  }

  // ── Host: approve or reject guest ──
  async approve(approve) {
    if (!this.isHost || !this.roomCode) return;
    await set(ref(db, `voidloop-rooms/${this.roomCode}/approval`), approve ? 'approved' : 'rejected');
    if (approve) {
      this.connected = true;
      this._emit('player_joined', {});
    }
  }

  // ── Host: signal game start ──
  async startGame() {
    if (!this.isHost || !this.roomCode) return false;
    await set(ref(db, `voidloop-rooms/${this.roomCode}/gameStarted`), true);
    return true;
  }

  // ── Guest: join a room ──
  async join(code, opts = {}) {
    if (!db) throw new Error('Firebase not initialized');

    const roomRef = ref(db, `voidloop-rooms/${code}`);
    const snap = await get(roomRef);
    if (!snap.exists()) throw new Error('Room not found');

    const room = snap.val();
    if (room.guest && room.guest.connected) throw new Error('Room is full');
    if (room.approval === 'rejected') throw new Error('You were rejected from this room');

    this.roomCode = code;
    this.isHost = false;
    this.role = 'guest';

    await set(ref(db, `voidloop-rooms/${code}/guest`), {
      connected: true,
      name: opts.name || 'Guest',
      joinedAt: Date.now(),
    });

    onDisconnect(ref(db, `voidloop-rooms/${code}/guest`)).set({ connected: false });

    // Listen for approval
    const approvalRef = ref(db, `voidloop-rooms/${code}/approval`);
    const onApproval = (snap) => {
      const val = snap.val();
      if (val === 'approved') {
        this.connected = true;
        this._emit('join_approved', {});
      } else if (val === 'rejected') {
        this._emit('join_rejected', { reason: 'Host declined your request' });
      }
    };
    const unsubApproval = onValue(approvalRef, onApproval);
    this._unsubs.push(() => { off(approvalRef, 'value', onApproval); unsubApproval(); });

    // Listen for game start flag (PRIMARY mechanism for guest)
    const gameStartedRef = ref(db, `voidloop-rooms/${code}/gameStarted`);
    const onGameStarted = (snap) => {
      if (snap.val() === true) {
        this._emit('data', { _type: 'start_game' });
      }
    };
    const unsubGameStarted = onValue(gameStartedRef, onGameStarted);
    this._unsubs.push(() => { off(gameStartedRef, 'value', onGameStarted); unsubGameStarted(); });

    // Listen for messages from host (for future gameplay sync)
    const msgRef = ref(db, `voidloop-rooms/${code}/messages`);
    const onHostMsg = (snap) => {
      const msg = snap.val();
      if (msg && msg.from === 'host') this._emit('data', msg.data);
    };
    const unsubMsg = onChildAdded(msgRef, onHostMsg);
    this._unsubs.push(() => { off(msgRef, 'child_added', onHostMsg); unsubMsg(); });

    // Listen for host disconnect
    const hostRef = ref(db, `voidloop-rooms/${code}/host/connected`);
    const onHostDisconnect = (snap) => {
      if (snap.val() === false) this._emit('disconnected', { reason: 'Host left' });
    };
    const unsubHost = onValue(hostRef, onHostDisconnect);
    this._unsubs.push(() => { off(hostRef, 'value', onHostDisconnect); unsubHost(); });

    return { status: 'waiting_for_approval' };
  }

  // ── Send message to other player ──
  async send(msg) {
    if (!this.roomCode) return false;
    const from = this.isHost ? 'host' : 'guest';
    const msgRef = ref(db, `voidloop-rooms/${this.roomCode}/messages`);
    try {
      await push(msgRef, { from, data: msg, timestamp: Date.now() });
      return true;
    } catch (e) {
      console.error('[Net] Send failed:', e);
      return false;
    }
  }

  // ── Disconnect and cleanup ──
  async disconnect() {
    this._unsubs.forEach(u => u());
    this._unsubs = [];

    if (this.roomCode) {
      if (this.isHost) {
        await remove(ref(db, `voidloop-rooms/${this.roomCode}`));
      } else {
        await set(ref(db, `voidloop-rooms/${this.roomCode}/guest`), { connected: false });
      }
    }

    this.connected = false;
    this.isHost = false;
    this.roomCode = null;
    this.role = null;
  }

  // ── Event system ──
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const list = this._handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  _emit(event, data) {
    const list = this._handlers.get(event);
    if (list) list.forEach(h => {
      try { h(data); } catch (e) { console.error('[Net] Handler error:', e); }
    });
  }
}

// Singleton
export const net = new NetworkManager();
