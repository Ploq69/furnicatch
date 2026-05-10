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
    console.log('[Lobby] Initialized');
  }

  _bindEvents() {
    // Host
    this.hostBtn?.addEventListener('click', () => this._onHost());

    // Join
    this.joinBtn?.addEventListener('click', () => this._onJoin());

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
      console.log('[Lobby] host_ready event, code:', code);
      this.hostCodeDisplay.textContent = code;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Share this code.';
      this.hostStatus.className = 'lobby-status ok';
      this.hostBtn.disabled = true;
      this.startBtn.style.display = 'block';
    });

    net.on('join_request', () => {
      console.log('[Lobby] join_request event');
      this._showApproval();
    });

    net.on('join_approved', () => {
      console.log('[Lobby] join_approved event (guest side)');
      this.joinStatus.textContent = 'Connected! Waiting for host to start...';
      this.joinStatus.className = 'lobby-status ok';
    });

    net.on('player_joined', () => {
      console.log('[Lobby] player_joined event (host side), isHost:', net.isHost);
      if (net.isHost) {
        this.hostStatus.textContent = 'Player joined! Ready to start.';
        this.hostStatus.className = 'lobby-status ok';
        this.startBtn.style.display = 'block';
      }
    });

    net.on('disconnected', () => {
      console.log('[Lobby] disconnected event');
      if (net.isHost) {
        this.hostStatus.textContent = 'Player disconnected.';
        this.hostStatus.className = 'lobby-status warn';
      } else {
        this.joinStatus.textContent = 'Disconnected from host.';
        this.joinStatus.className = 'lobby-status err';
      }
    });

    net.on('data', (data) => {
      console.log('[Lobby] data event:', data);
      if (data._type === 'start_game') {
        console.log('[Lobby] Received start_game, starting as client');
        this._startGameAsClient();
      }
    });

    net.on('error', ({ message }) => {
      console.log('[Lobby] error event:', message);
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
    console.log('[Lobby] _onHost called');
    this.hostStatus.textContent = 'Creating room...';
    this.hostStatus.className = 'lobby-status warn';
    this.hostBtn.disabled = true;

    try {
      const res = await net.host({ name: 'Dad' });
      console.log('[Lobby] Host created room:', res.code);
      // host_ready event handler above also sets these, but set them here too for safety
      this.hostCodeDisplay.textContent = res.code;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Share this code.';
      this.hostStatus.className = 'lobby-status ok';
      this.startBtn.style.display = 'block';
    } catch (err) {
      console.error('[Lobby] Host error:', err);
      this.hostStatus.textContent = err.message;
      this.hostStatus.className = 'lobby-status err';
      this.hostBtn.disabled = false;
    }
  }

  async _onJoin() {
    const code = this.joinCode.value.trim().toUpperCase();
    console.log('[Lobby] _onJoin called, code:', code);
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
      console.log('[Lobby] Join result:', res);
      if (res.status === 'waiting_for_approval') {
        this.joinStatus.textContent = 'Waiting for dad to approve...';
        this.joinStatus.className = 'lobby-status warn';
      }
    } catch (err) {
      console.error('[Lobby] Join error:', err);
      this.joinStatus.textContent = 'Failed: ' + err.message;
      this.joinStatus.className = 'lobby-status err';
      this.joinBtn.disabled = false;
    }
  }

  _showApproval() {
    console.log('[Lobby] Showing approval popup');
    this.approvalText.textContent = 'Someone wants to join your game.';
    this.approvalPopup.classList.add('active');
  }

  _onApproval(approve) {
    console.log('[Lobby] Approval:', approve);
    this.approvalPopup.classList.remove('active');
    net.approve(approve);

    if (!approve && net.isHost) {
      this.hostStatus.textContent = 'Join request rejected.';
      this.hostStatus.className = 'lobby-status warn';
    }
  }

  async _onStartGame() {
    console.log('[Lobby] Start Game clicked. connected:', net.connected, 'hasStarted:', this._hasStarted);
    if (this._hasStarted) {
      console.log('[Lobby] Already started, ignoring');
      return;
    }
    this._hasStarted = true;

    // Tell the other player to start too
    if (net.connected) {
      console.log('[Lobby] Sending start_game message');
      const sent = await net.send({ _type: 'start_game' });
      console.log('[Lobby] start_game send result:', sent);
    } else {
      console.log('[Lobby] Not connected, skipping send');
    }

    this._startGame();
  }

  _startGameAsClient() {
    console.log('[Lobby] _startGameAsClient called. hasStarted:', this._hasStarted);
    if (this._hasStarted) {
      console.log('[Lobby] Already started, ignoring client start');
      return;
    }
    this._hasStarted = true;
    this._startGame();
  }

  _startGame() {
    console.log('[Lobby] _startGame called. isHost:', net.isHost);
    // Hide lobby, show loading
    this.overlay.classList.add('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
      // Start the game
      this.game = new Game(this.container);

      // Attach multiplayer state
      this.game.isMultiplayer = true;
      this.game.isHost = net.isHost;
      this.game.net = net;

      console.log('[Lobby] Game started successfully. isHost:', net.isHost);
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
