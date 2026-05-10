/**
 * NetworkManager — Client-side multiplayer networking
 * Wraps Socket.io with host approval flow and game message routing.
 */

// Socket.io client is loaded via CDN script tag (global `io`)
const _io = typeof window !== 'undefined' ? window.io : null;

export class NetworkManager {
  constructor() {
    this.socket = null;
    this.isHost = false;
    this.roomCode = null;
    this.connected = false;
    this._handlers = new Map();
  }

  // ── Connection ──
  connect(url) {
    return new Promise((resolve, reject) => {
      if (!_io) {
        reject(new Error('Socket.io client not loaded. Add <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script> to HTML.'));
        return;
      }

      this.socket = _io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Net] Connected:', this.socket.id);
        this.connected = true;
        this._emit('connected', { socketId: this.socket.id });
        resolve({ socketId: this.socket.id });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Net] Disconnected:', reason);
        this.connected = false;
        this._emit('disconnected', { reason });
      });

      this.socket.on('connect_error', (err) => {
        console.error('[Net] Connect error:', err.message);
        reject(err);
      });

      // ── Room / Approval events ──
      this.socket.on('join_request', (data) => {
        this._emit('join_request', data); // host receives this
      });

      this.socket.on('join_approved', (data) => {
        this._emit('join_approved', data);
      });

      this.socket.on('join_rejected', (data) => {
        this._emit('join_rejected', data);
      });

      this.socket.on('player_joined', (data) => {
        this._emit('player_joined', data);
      });

      this.socket.on('player_left', (data) => {
        this._emit('player_left', data);
      });

      this.socket.on('host_left', (data) => {
        this._emit('host_left', data);
        this.isHost = false;
        this.roomCode = null;
      });

      // ── Game messages ──
      this.socket.on('game_msg', (payload) => {
        this._emit('game_msg', payload);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.isHost = false;
    this.roomCode = null;
  }

  // ── Room management ──
  hostRoom(opts = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) { reject(new Error('Not connected')); return; }
      this.socket.emit('host_room', opts, (res) => {
        if (res.ok) {
          this.isHost = true;
          this.roomCode = res.code;
          resolve(res);
        } else {
          reject(new Error(res.error || 'Failed to host room'));
        }
      });
    });
  }

  joinRoom(code, password = '', name = 'Guest') {
    return new Promise((resolve, reject) => {
      if (!this.socket) { reject(new Error('Not connected')); return; }
      this.socket.emit('join_request', { code, password, name }, (res) => {
        if (res.ok) {
          this.roomCode = code;
          resolve(res);
        } else {
          reject(new Error(res.error || 'Failed to join room'));
        }
      });
    });
  }

  approvePlayer(socketId, approve = true) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isHost) { reject(new Error('Not host')); return; }
      this.socket.emit('approve_player', { socketId, approve }, (res) => {
        if (res?.ok) resolve(res);
        else reject(new Error(res?.error || 'Approval failed'));
      });
    });
  }

  // ── Game message passing ──
  send(msg) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('game_msg', msg);
  }

  broadcast(msg) {
    if (!this.socket || !this.connected || !this.isHost) return;
    this.socket.emit('game_broadcast', msg);
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

// Singleton instance
export const net = new NetworkManager();
