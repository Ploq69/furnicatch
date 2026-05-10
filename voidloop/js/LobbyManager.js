/**
 * LobbyManager — Handles multiplayer lobby UI and connection flow.
 * Shows before the game starts. Creates the Game when ready.
 */

import { net } from './NetworkManager.js';
import { Game } from './Game.js';

export class LobbyManager {
  constructor(container) {
    this.container = container;
    this.overlay = document.getElementById('lobby-overlay');
    this.connectPanel = document.getElementById('lobby-connect-panel');
    this.actionPanels = document.getElementById('lobby-action-panels');
    this.approvalPopup = document.getElementById('approval-popup');

    this.urlInput = document.getElementById('lobby-url');
    this.connectBtn = document.getElementById('lobby-connect-btn');
    this.connectStatus = document.getElementById('lobby-connect-status');

    this.hostPassword = document.getElementById('host-password');
    this.hostBtn = document.getElementById('host-btn');
    this.hostStatus = document.getElementById('host-status');
    this.hostCodeRow = document.getElementById('host-code-row');
    this.hostCodeDisplay = document.getElementById('host-code');

    this.joinCode = document.getElementById('join-code');
    this.joinPassword = document.getElementById('join-password');
    this.joinName = document.getElementById('join-name');
    this.joinBtn = document.getElementById('join-btn');
    this.joinStatus = document.getElementById('join-status');

    this.startBtn = document.getElementById('lobby-start-btn');

    this.approvalText = document.getElementById('approval-text');
    this.approvalAccept = document.getElementById('approval-accept');
    this.approvalReject = document.getElementById('approval-reject');

    this.pendingApproval = null;
    this.game = null;

    this._bindEvents();
  }

  _bindEvents() {
    // Connect to relay server
    this.connectBtn.addEventListener('click', () => this._onConnect());

    // Host room
    this.hostBtn.addEventListener('click', () => this._onHost());

    // Join room
    this.joinBtn.addEventListener('click', () => this._onJoin());

    // Copy code on click
    this.hostCodeDisplay.addEventListener('click', () => {
      const code = this.hostCodeDisplay.textContent;
      if (code) navigator.clipboard?.writeText(code).catch(() => {});
    });

    // Approval buttons
    this.approvalAccept.addEventListener('click', () => this._onApproval(true));
    this.approvalReject.addEventListener('click', () => this._onApproval(false));

    // Start game
    this.startBtn.addEventListener('click', () => this._onStartGame());

    // Network events
    net.on('connected', () => {
      this.connectStatus.textContent = 'Connected!';
      this.connectStatus.className = 'lobby-status ok';
      this.connectBtn.disabled = true;
      this.connectPanel.style.display = 'none';
      this.actionPanels.style.display = 'flex';
    });

    net.on('disconnected', ({ reason }) => {
      this.connectStatus.textContent = `Disconnected: ${reason}`;
      this.connectStatus.className = 'lobby-status err';
      this.connectBtn.disabled = false;
      this.connectPanel.style.display = 'flex';
      this.actionPanels.style.display = 'none';
      this.startBtn.style.display = 'none';
    });

    net.on('join_request', (data) => {
      this._showApproval(data);
    });

    net.on('join_approved', () => {
      this.joinStatus.textContent = 'Joined! Waiting for host to start...';
      this.joinStatus.className = 'lobby-status ok';
    });

    net.on('join_rejected', ({ reason }) => {
      this.joinStatus.textContent = reason || 'Host declined';
      this.joinStatus.className = 'lobby-status err';
    });

    net.on('player_joined', (data) => {
      if (net.isHost) {
        this.hostStatus.textContent = `${data.name} joined!`;
        this.hostStatus.className = 'lobby-status ok';
        this.startBtn.style.display = 'block';
      }
    });

    net.on('player_left', (data) => {
      if (net.isHost) {
        this.hostStatus.textContent = `${data.name} left.`;
        this.hostStatus.className = 'lobby-status warn';
        this.startBtn.style.display = 'none';
      }
    });

    net.on('host_left', () => {
      this.joinStatus.textContent = 'Host disconnected.';
      this.joinStatus.className = 'lobby-status err';
      this.startBtn.style.display = 'none';
    });
  }

  async _onConnect() {
    const url = this.urlInput.value.trim() || 'ws://localhost:3000';
    this.connectStatus.textContent = 'Connecting...';
    this.connectStatus.className = 'lobby-status warn';
    this.connectBtn.disabled = true;

    try {
      await net.connect(url);
    } catch (err) {
      this.connectStatus.textContent = `Failed: ${err.message}`;
      this.connectStatus.className = 'lobby-status err';
      this.connectBtn.disabled = false;
    }
  }

  async _onHost() {
    const password = this.hostPassword.value.trim() || undefined;
    this.hostStatus.textContent = 'Creating room...';
    this.hostStatus.className = 'lobby-status warn';
    this.hostBtn.disabled = true;

    try {
      const res = await net.hostRoom({ password, name: 'Host', maxPlayers: 2 });
      this.hostCodeDisplay.textContent = res.code;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Waiting for player...';
      this.hostStatus.className = 'lobby-status ok';
      // Also show start button immediately (single player fallback)
      this.startBtn.style.display = 'block';
    } catch (err) {
      this.hostStatus.textContent = err.message;
      this.hostStatus.className = 'lobby-status err';
      this.hostBtn.disabled = false;
    }
  }

  async _onJoin() {
    const code = this.joinCode.value.trim().toUpperCase();
    const password = this.joinPassword.value.trim();
    const name = this.joinName.value.trim() || 'Guest';

    if (!code) {
      this.joinStatus.textContent = 'Enter a room code';
      this.joinStatus.className = 'lobby-status err';
      return;
    }

    this.joinStatus.textContent = 'Requesting to join...';
    this.joinStatus.className = 'lobby-status warn';
    this.joinBtn.disabled = true;

    try {
      const res = await net.joinRoom(code, password, name);
      if (res.status === 'waiting_for_approval') {
        this.joinStatus.textContent = 'Waiting for host approval...';
        this.joinStatus.className = 'lobby-status warn';
      }
    } catch (err) {
      this.joinStatus.textContent = err.message;
      this.joinStatus.className = 'lobby-status err';
      this.joinBtn.disabled = false;
    }
  }

  _showApproval(data) {
    this.pendingApproval = data.socketId;
    this.approvalText.textContent = `${data.name} wants to join your game.`;
    this.approvalPopup.classList.add('active');
  }

  async _onApproval(approve) {
    this.approvalPopup.classList.remove('active');
    if (!this.pendingApproval) return;

    try {
      await net.approvePlayer(this.pendingApproval, approve);
      this.pendingApproval = null;
    } catch (err) {
      console.error('[Lobby] Approval error:', err);
    }
  }

  _onStartGame() {
    // Hide lobby, show loading
    this.overlay.classList.add('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    // Start the game
    this.game = new Game(this.container);

    // Store multiplayer state on game for later phases
    this.game.isMultiplayer = true;
    this.game.isHost = net.isHost;
    this.game.net = net;
  }
}
