/**
 * LobbyManager — PeerJS multiplayer lobby
 * Zero servers. Dad clicks "Host Game", gets a code. Daughter enters code. Done.
 */

import { net } from './NetworkManager.js';
import { Game } from './Game.js';

export class LobbyManager {
  constructor(container) {
    this.container = container;
    this.overlay = document.getElementById('lobby-overlay');
    this.approvalPopup = document.getElementById('approval-popup');

    // No server URL needed for PeerJS — hide connect panel, show actions immediately
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
    this.joinPassword = document.getElementById('join-password');
    this.joinName = document.getElementById('join-name');
    this.joinBtn = document.getElementById('join-btn');
    this.joinStatus = document.getElementById('join-status');

    this.startBtn = document.getElementById('lobby-start-btn');

    this.approvalText = document.getElementById('approval-text');
    this.approvalAccept = document.getElementById('approval-accept');
    this.approvalReject = document.getElementById('approval-reject');

    this.pendingConn = null; // PeerJS connection waiting for approval
    this.game = null;

    this._bindEvents();
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
    net.on('host_ready', ({ id }) => {
      this.hostCodeDisplay.textContent = id;
      this.hostCodeRow.style.display = 'flex';
      this.hostStatus.textContent = 'Room created! Share this code.';
      this.hostStatus.className = 'lobby-status ok';
      this.hostBtn.disabled = true;
      // Allow host to start solo if no one joins
      this.startBtn.style.display = 'block';
    });

    net.on('join_request', ({ peerId, conn }) => {
      this.pendingConn = conn;
      this._showApproval(peerId);
    });

    net.on('connected', () => {
      this.joinStatus.textContent = 'Connected! Waiting for host to start...';
      this.joinStatus.className = 'lobby-status ok';
    });

    net.on('player_joined', ({ peerId }) => {
      if (net.isHost) {
        this.hostStatus.textContent = 'Player joined! Ready to start.';
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
      // Game messages will be handled by Game.js in later phases
      // For now, just log them
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
      await net.host();
    } catch (err) {
      this.hostStatus.textContent = err.message;
      this.hostStatus.className = 'lobby-status err';
      this.hostBtn.disabled = false;
    }
  }

  async _onJoin() {
    const code = this.joinCode.value.trim();
    if (!code) {
      this.joinStatus.textContent = 'Enter a room code';
      this.joinStatus.className = 'lobby-status err';
      return;
    }

    this.joinStatus.textContent = 'Connecting...';
    this.joinStatus.className = 'lobby-status warn';
    this.joinBtn.disabled = true;

    try {
      await net.join(code);
    } catch (err) {
      this.joinStatus.textContent = 'Failed: ' + err.message;
      this.joinStatus.className = 'lobby-status err';
      this.joinBtn.disabled = false;
    }
  }

  _showApproval(peerId) {
    this.approvalText.textContent = `Player ${peerId} wants to join.`;
    this.approvalPopup.classList.add('active');
  }

  _onApproval(approve) {
    this.approvalPopup.classList.remove('active');
    if (!this.pendingConn) return;

    net.approveConnection(this.pendingConn, approve);
    this.pendingConn = null;

    if (!approve && net.isHost) {
      this.hostStatus.textContent = 'Join request rejected.';
      this.hostStatus.className = 'lobby-status warn';
    }
  }

  _onStartGame() {
    // Tell the other player to start too
    if (net.connected) {
      net.send({ _type: 'start_game' });
    }
    this._startGame();
  }

  _startGameAsClient() {
    this._startGame();
  }

  _startGame() {
    // Hide lobby, show loading
    this.overlay.classList.add('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    // Start the game
    this.game = new Game(this.container);

    // Attach multiplayer state
    this.game.isMultiplayer = true;
    this.game.isHost = net.isHost;
    this.game.net = net;
  }
}
