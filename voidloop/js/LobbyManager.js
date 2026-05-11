/**
 * LobbyManager — Multiplayer lobby UI
 */

import { net } from './NetworkManager.js';

export class LobbyManager {
  constructor(container, onStartGame) {
    this.container = container;
    this.onStartGame = onStartGame;
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

    this._hasStarted = false;

    this._bindEvents();
  }

  _bindEvents() {
    // Solo play button goes back to main menu
    this.soloBtn?.addEventListener('click', () => this._onBackToMenu());

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

  _onBackToMenu() {
    this.overlay.classList.add('hidden');
    this.approvalPopup.classList.remove('active');
    // Notify parent to show main menu
    document.dispatchEvent(new CustomEvent('show-main-menu'));
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

    await net.startGame();
    this._startGame();
  }

  _startGameAsClient() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this._startGame();
  }

  _startGame() {
    this.overlay.classList.add('hidden');
    this.approvalPopup.classList.remove('active');
    const tc = document.getElementById('touch-controls');
    if (tc) tc.style.display = 'none';

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    if (this.onStartGame) {
      this.onStartGame(net, net.isHost);
    }
  }
}
