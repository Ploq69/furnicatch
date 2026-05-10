/**
 * NetworkManager — PeerJS-based P2P multiplayer
 * Zero servers. Zero terminals. Just browsers talking directly.
 * Uses PeerJS cloud (free) for initial handshake, then WebRTC data channels.
 */

const _Peer = typeof window !== 'undefined' ? window.Peer : null;

export class NetworkManager {
  constructor() {
    this.peer = null;        // Our PeerJS peer
    this.conn = null;        // Active data connection to remote peer
    this.isHost = false;
    this.remoteId = null;    // The other player's peer ID
    this.myId = null;
    this.connected = false;
    this._handlers = new Map();
  }

  // ── Host: create a peer and get an ID ──
  host() {
    return new Promise((resolve, reject) => {
      if (!_Peer) { reject(new Error('PeerJS not loaded')); return; }

      this.peer = new Peer({
        host: 'peerjs.com',
        port: 443,
        secure: true,
        debug: 1,
      });

      this.peer.on('open', (id) => {
        this.myId = id;
        this.isHost = true;
        console.log('[Net] Hosting as', id);
        this._emit('host_ready', { id });
        resolve({ id });
      });

      this.peer.on('error', (err) => {
        console.error('[Net] Peer error:', err);
        this._emit('error', { message: err.message });
        reject(err);
      });

      // Listen for incoming connections
      this.peer.on('connection', (conn) => {
        console.log('[Net] Incoming connection from', conn.peer);
        // Don't accept yet — wait for host approval
        this._emit('join_request', { peerId: conn.peer, conn });
      });
    });
  }

  // ── Host: approve or reject a pending connection ──
  approveConnection(conn, approve) {
    if (!this.isHost) return;

    if (!approve) {
      conn.close();
      return;
    }

    this.conn = conn;
    this.remoteId = conn.peer;
    this._setupConnection(conn);
    this._emit('player_joined', { peerId: conn.peer });
  }

  // ── Client: connect to a host's peer ID ──
  join(hostId) {
    return new Promise((resolve, reject) => {
      if (!_Peer) { reject(new Error('PeerJS not loaded')); return; }

      this.peer = new Peer({
        host: 'peerjs.com',
        port: 443,
        secure: true,
        debug: 1,
      });

      this.peer.on('open', (id) => {
        this.myId = id;
        this.isHost = false;
        console.log('[Net] Joining as', id, '→ host', hostId);

        const conn = this.peer.connect(hostId, {
          reliable: true,
          serialization: 'json',
        });

        conn.on('open', () => {
          console.log('[Net] Connected to host!');
          this.conn = conn;
          this.remoteId = hostId;
          this.connected = true;
          this._setupConnection(conn);
          this._emit('connected', { peerId: hostId });
          resolve({ peerId: hostId });
        });

        conn.on('error', (err) => {
          console.error('[Net] Connection error:', err);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Net] Peer error:', err);
        this._emit('error', { message: err.message });
        reject(err);
      });
    });
  }

  // ── Setup data channel handlers ──
  _setupConnection(conn) {
    conn.on('data', (data) => {
      this._emit('data', data);
    });

    conn.on('close', () => {
      console.log('[Net] Connection closed');
      this.connected = false;
      this.conn = null;
      this._emit('disconnected', { reason: 'Connection closed' });
    });

    conn.on('error', (err) => {
      console.error('[Net] Data channel error:', err);
      this._emit('error', { message: err.message });
    });
  }

  disconnect() {
    if (this.conn) { this.conn.close(); this.conn = null; }
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.connected = false;
    this.isHost = false;
    this.remoteId = null;
    this.myId = null;
  }

  // ── Send data to remote peer ──
  send(msg) {
    if (!this.conn || !this.connected) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch (e) {
      console.error('[Net] Send failed:', e);
      return false;
    }
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
