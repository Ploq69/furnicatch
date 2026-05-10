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

    this.startBtn = document.getElementById('lobby-start-btn');

    this.approvalText = document.getElementById('approval-text');
    this.approvalAccept = document.getElementById('approval-accept');
    this.approvalReject = document.getElementById('approval-reject');

    this.game = null;
    this._hasStarted = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.hostBtn?.addEventListener('click', () => this._onHost());
    this.joinBtn?.addEventListener('click', () => this._onJoin());

    this.hostCodeDisplay?.addEventListener('click', () => {
      const code = this.hostCodeDisplay.textContent;
      if (code) navigator.clipboard?.writeText(code).catch(() => {});
    });

    this.approvalAccept?.addEventListener('click', () => this._onApproval(true));
    this.approvalReject?.addEventListener('click', () => this._onApproval(false));

    this.startBtn?.addEventListener('click', () => this._onStartGame());

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
      this.joinStatus.textContent = 'Enter the code from dad';
      this.joinStatus.className = 'lobby-status err';
      return;
    }

    this.joinStatus.textContent = 'Connecting...';
    this.joinStatus.className = 'lobby-status warn';
    this.joinBtn.disabled = true;

    try {
      const res = await net.join(code, { name: this.joinName.value.trim() || 'Guest' });
      if (res.status === 'waiting_for_approval') {
        this.joinStatus.textContent = 'Waiting for dad to approve...';
        this.joinStatus.className = 'lobby-status warn';
      }
    } catch (err) {
      this.joinStatus.textContent = 'Failed: ' + err.message;
      this.joinStatus.className = 'lobby-status err';
      this.joinBtn.disabled = false;
    }
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

    // Use the robust startGame method that writes a persistent flag + sends message
    const sent = await net.startGame();
    if (!sent) {
      this.hostStatus.textContent = 'Failed to signal guest. Starting solo...';
    }

    this._startGame();
  }

  _startGameAsClient() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this._startGame();
  }

  _startGame() {
    this.overlay.classList.add('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
      this.game = new Game(this.container);
      this.game.isMultiplayer = true;
      this.game.isHost = net.isHost;
      this.game.net = net;
    } catch (err) {
      console.error('[Lobby] Game start error:', err);
      this.joinStatus.textContent = 'Failed to start game: ' + err.message;
      this.joinStatus.className = 'lobby-status err';
      this.overlay.classList.remove('hidden');
      if (loading) loading.style.display = 'none';
      this._hasStarted = false;
    }
  }
}
