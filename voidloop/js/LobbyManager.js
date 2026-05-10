/**
 * LobbyManager — Multiplayer lobby UI
 */

import { net } from './NetworkManager.js';
import { Game } from './Game.js';

export class LobbyManager {
  constructor(container) {
    this.container = container;
    this.overlay = document.getElementById('lobby-overlay');
    this.approvalPopup = document.getElementById('approval-popup');

    this.connectPanel = document.getElementById('lobby-connect-panel');
    this.actionPanels = document.getElementById('lobby-action-panels');
    if (this.connectPanel) this.connectPanel.style.display = 'none';
    if (this.actionPanels) this.actionPanels.style.display = 'flex';

    this.hostBtn = document.getElementById('host-btn');
    this.hostStatus = document.getElementById('host-status');
    this.hostCodeRow = document.getElementById('host-code-row');
    this.hostCodeDisplay = document.getElementById('host-code');
    this.hostPassword = document.getElementById('host-password');

    this.joinCode = document.getElementById('join-code');
    this.joinName = document.getElementById('join-name');
    this.joinBtn = document.getElementById('join-btn');
    this.joinStatus = document.getElementById('join-status');
    this._joinOriginalText = this.joinBtn?.textContent || 'Join Room';

    this.startBtn = document.getElementById('lobby-start-btn');
    this.soloBtn = document.getElementById('solo-btn');

    this.approvalText = document.getElementById('approval-text');
    this.approvalAccept = document.getElementById('approval-accept');
    this.approvalReject = document.getElementById('approval-reject');

    this.game = null;
    this._hasStarted = false;

    this._bindEvents();
  }

  _bindEvents() {
    // Solo play (diagnostic — bypasses all multiplayer)
    this.soloBtn?.addEventListener('click', () => this._onSolo());

    // Host
    this.hostBtn?.addEventListener('click', () => this._onHost());

    // Join
    this.joinBtn?.addEventListener('click', () => this._onJoin());

    // Enter key in join code input
    this.joinCode?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onJoin();
    });

    // Copy code
    this.hostCodeDisplay?.addEventListener('click', () => {
      const code = this.hostCodeDisplay.textContent;
      if (code) navigator.clipboard?.writeText(code).catch(() => {});
    });

    // Approval
    this.approvalAccept?.addEventListener('click', () => this._onApproval(true));
    this.approvalReject?.addEventListener('click', () => this._onApproval(false));

    // Start game
    this.startBtn?.addEventListener('click', () => this._onStartGame());

    // Network events
    net.on('host_ready', ({ code }) => {
      this.hostCodeDisplay.textContent = code;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Share this code.';
      this.hostStatus.className = 'lobby-status ok';
      this.hostBtn.disabled = true;
      this.startBtn.style.display = 'block';
    });

    net.on('join_request', () => {
      this._showApproval();
    });

    net.on('join_approved', () => {
      this.joinStatus.textContent = 'Connected! Waiting for host to start...';
      this.joinStatus.className = 'lobby-status ok';
    });

    net.on('player_joined', () => {
      if (net.isHost) {
        this.hostStatus.textContent = 'Player joined! Click Start Game when ready.';
        this.hostStatus.className = 'lobby-status ok';
        this.startBtn.style.display = 'block';
      }
    });

    net.on('disconnected', () => {
      if (net.isHost) {
        this.hostStatus.textContent = 'Player disconnected.';
        this.hostStatus.className = 'lobby-status warn';
      } else {
        this.joinStatus.textContent = 'Disconnected from host.';
        this.joinStatus.className = 'lobby-status err';
      }
    });

    net.on('data', (data) => {
      if (data._type === 'start_game') {
        this._startGameAsClient();
      }
    });

    net.on('error', ({ message }) => {
      if (net.isHost) {
        this.hostStatus.textContent = 'Error: ' + message;
        this.hostStatus.className = 'lobby-status err';
      } else {
        this.joinStatus.textContent = 'Error: ' + message;
        this.joinStatus.className = 'lobby-status err';
      }
    });
  }

  // ── Solo play: bypass all multiplayer, start game immediately ──
  _onSolo() {
    if (this._hasStarted) return;
    this.soloBtn.disabled = true;
    this.soloBtn.textContent = 'Loading...';
    this._hasStarted = true;

    // Hide lobby and touch controls
    this.overlay.classList.add('hidden');
    this.approvalPopup.classList.remove('active');
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'none';
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
      this.game = new Game(this.container);
      this.game.isMultiplayer = false;
      this.game.isHost = true;
      this.game.net = null;
    } catch (err) {
      this._showStartError(err);
    }
  }

  async _onHost() {
    this.hostStatus.textContent = 'Creating room...';
    this.hostStatus.className = 'lobby-status warn';
    this.hostBtn.disabled = true;

    try {
      const res = await net.host({ name: 'Dad' });
      this.hostCodeDisplay.textContent = res.code;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Share this code.';
      this.hostStatus.className = 'lobby-status ok';
      this.startBtn.style.display = 'block';
    } catch (err) {
      this.hostStatus.textContent = err.message;
      this.hostStatus.className = 'lobby-status err';
      this.hostBtn.disabled = false;
    }
  }

  async _onJoin() {
    const code = this.joinCode.value.trim().toUpperCase();
    if (!code) {
      this._showJoinError('Enter the room code');
      return;
    }

    this._setJoinState('connecting');

    try {
      // Race against a 10s timeout so the user never hangs forever
      const res = await this._joinWithTimeout(code, 10000);
      if (res.status === 'waiting_for_approval') {
        this._setJoinState('waiting');
      }
    } catch (err) {
      this._setJoinState('idle');
      this._showJoinError(err.message || 'Could not connect');
    }
  }

  _joinWithTimeout(code, ms) {
    return Promise.race([
      net.join(code, { name: this.joinName.value.trim() || 'Guest' }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out — check internet or room code')), ms)
      ),
    ]);
  }

  _setJoinState(state) {
    if (state === 'connecting') {
      this.joinStatus.textContent = 'Connecting to room...';
      this.joinStatus.className = 'lobby-status warn';
      this.joinBtn.disabled = true;
      this.joinBtn.textContent = 'Joining...';
      this.joinBtn.classList.add('lobby-btn-loading');
    } else if (state === 'waiting') {
      this.joinStatus.textContent = 'Waiting for host to approve...';
      this.joinStatus.className = 'lobby-status ok';
      this.joinBtn.disabled = true;
      this.joinBtn.textContent = 'Pending...';
      this.joinBtn.classList.remove('lobby-btn-loading');
    } else {
      // idle / error
      this.joinBtn.disabled = false;
      this.joinBtn.textContent = this._joinOriginalText;
      this.joinBtn.classList.remove('lobby-btn-loading');
    }
  }

  _showJoinError(msg) {
    this.joinStatus.textContent = msg;
    this.joinStatus.className = 'lobby-status err';
    this.joinBtn.classList.add('lobby-btn-shake');
    setTimeout(() => this.joinBtn.classList.remove('lobby-btn-shake'), 500);
  }

  _showApproval() {
    this.approvalText.textContent = 'Someone wants to join your game.';
    this.approvalPopup.classList.add('active');
  }

  _onApproval(approve) {
    this.approvalPopup.classList.remove('active');
    net.approve(approve);

    if (!approve && net.isHost) {
      this.hostStatus.textContent = 'Join request rejected.';
      this.hostStatus.className = 'lobby-status warn';
    }
  }

  async _onStartGame() {
    if (this._hasStarted) return;
    this._hasStarted = true;

    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Starting...';
    this.hostStatus.textContent = 'Starting game...';

    // Signal guest via persistent flag
    await net.startGame();

    this._startGame();
  }

  _startGameAsClient() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this._startGame();
  }

  _startGame() {
    // Hide ALL overlays before starting
    this.overlay.classList.add('hidden');
    this.approvalPopup.classList.remove('active');
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'none';

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    // Safety timeout: if game doesn't start in 10s, show error
    const timeoutId = setTimeout(() => {
      if (this._hasStarted && !this.game) {
        this._showStartError(new Error('Game loading timed out. Check console for details.'));
      }
    }, 10000);

    try {
      this.game = new Game(this.container);
      this.game.isMultiplayer = true;
      this.game.isHost = net.isHost;
      this.game.net = net;
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      this._showStartError(err);
    }
  }

  _showStartError(err) {
    console.error('[Lobby] Game start failed:', err);
    const msg = err?.message || 'Unknown error';
    const statusEl = net.isHost ? this.hostStatus : this.joinStatus;
    statusEl.textContent = 'Failed to start: ' + msg;
    statusEl.className = 'lobby-status err';

    // Bring lobby back so user can retry
    this.overlay.classList.remove('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    // Hide touch controls so they don't block the lobby
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'none';

    // Reset buttons
    this._hasStarted = false;
    this.startBtn.disabled = false;
    this.startBtn.textContent = 'Start Game';
    this.soloBtn.disabled = false;
    this.soloBtn.textContent = 'Play Solo';
  }
}
