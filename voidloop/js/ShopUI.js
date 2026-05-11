// ==========================================
// Voidloop — Shop UI Overlay
// ==========================================

import { SHOP_ITEMS, SHOP_UPGRADES } from './ShopManager.js';
import { SFXMapper } from './SFXMapper.js';

export class ShopUI {
  constructor(shopManager, onBuyItem, onBuyUpgrade, onClose, getResources, onSellResource) {
    this.shop = shopManager;
    this.onBuyItem = onBuyItem;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onClose = onClose;
    this.getResources = getResources;
    this.onSellResource = onSellResource;
    this.activeTab = 'tools';
    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    this.el = document.createElement('div');
    this.el.id = 'shop-overlay';
    this.el.className = 'shop-overlay';
    this.el.innerHTML = `
      <div class="shop-panel">
        <div class="shop-header">
          <h2>🛒 Shop</h2>
          <div class="shop-coins">💰 <span id="shop-coin-display">0</span></div>
          <button class="shop-close" id="shop-close-btn">✕</button>
        </div>
        <div class="shop-tabs">
          <button class="shop-tab" data-tab="tools">Tools</button>
          <button class="shop-tab" data-tab="armor">Armor</button>
          <button class="shop-tab" data-tab="weapons">Weapons</button>
          <button class="shop-tab" data-tab="upgrades">Upgrades</button>
          <button class="shop-tab" data-tab="resources">Resources</button>
        </div>
        <div class="shop-content" id="shop-content"></div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.elCoinDisplay = this.el.querySelector('#shop-coin-display');
    this.elContent = this.el.querySelector('#shop-content');
    this.elTabs = this.el.querySelectorAll('.shop-tab');
  }

  _bindEvents() {
    this.el.querySelector('#shop-close-btn').addEventListener('click', () => {
      SFXMapper.uiClick();
      this.hide();
      if (this.onClose) this.onClose();
    });

    this.elTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        SFXMapper.uiClick();
        this.activeTab = tab.dataset.tab;
        this._updateTabs();
        this._renderContent();
      });
    });

    // Close on Escape
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
        if (this.onClose) this.onClose();
      }
    };
  }

  _updateTabs() {
    this.elTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === this.activeTab);
    });
  }

  _renderContent() {
    this.elContent.innerHTML = '';

    if (this.activeTab === 'tools') {
      this._renderItems('tool');
    } else if (this.activeTab === 'armor') {
      this._renderItems('armor');
    } else if (this.activeTab === 'weapons') {
      this._renderItems('weapon');
    } else if (this.activeTab === 'upgrades') {
      this._renderUpgrades();
    } else if (this.activeTab === 'resources') {
      this._renderResources();
    }
  }

  _renderItems(itemType) {
    const items = this.shop.getAllItems().filter(i => i.type === itemType);
    if (items.length === 0) {
      this.elContent.innerHTML = '<div class="shop-empty">No items available.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'shop-card' + (item.owned ? ' owned' : '') + (item.equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="shop-card-icon">${item.icon}</div>
        <div class="shop-card-name">${item.name}</div>
        <div class="shop-card-desc">${item.description}</div>
        <div class="shop-card-cost">${item.owned ? (item.equipped ? '✅ Equipped' : '✓ Owned') : `💰 ${item.cost}`}</div>
        <button class="shop-buy-btn" data-id="${item.id}" ${item.owned || !item.canAfford ? 'disabled' : ''}>
          ${item.owned ? (item.equipped ? 'Equipped' : 'Equip') : 'Buy'}
        </button>
      `;

      const btn = card.querySelector('.shop-buy-btn');
      btn.addEventListener('click', () => {
        if (item.owned) {
          // Equip/unequip
          this.onBuyItem(item.id, true);
          this._renderContent();
        } else {
          const result = this.onBuyItem(item.id, false);
          if (result.success) {
            SFXMapper.upgradeBuy();
            this.setCoins(this.shop.coins);
            this._renderContent();
          } else {
            btn.style.animation = 'none';
            btn.offsetHeight;
            btn.style.animation = 'shake 0.3s';
            SFXMapper.uiDenied();
          }
        }
      });

      grid.appendChild(card);
    }

    this.elContent.appendChild(grid);
  }

  _renderUpgrades() {
    const upgrades = this.shop.getAllUpgrades();
    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    for (const upg of upgrades) {
      const card = document.createElement('div');
      card.className = 'shop-card' + (upg.maxed ? ' maxed' : '');
      card.innerHTML = `
        <div class="shop-card-name">${upg.name}</div>
        <div class="shop-card-desc">${upg.desc}</div>
        <div class="shop-card-level">Lv.${upg.level}${upg.maxed ? '' : ` / ${upg.max}`}</div>
        <div class="shop-card-cost">${upg.maxed ? 'MAXED' : `💰 ${upg.nextCost}`}</div>
        <button class="shop-buy-btn" data-id="${upg.id}" ${upg.maxed || !upg.canAfford ? 'disabled' : ''}>
          ${upg.maxed ? 'Maxed' : 'Upgrade'}
        </button>
      `;

      const btn = card.querySelector('.shop-buy-btn');
      btn.addEventListener('click', () => {
        const result = this.onBuyUpgrade(upg.id);
        if (result.success) {
          SFXMapper.upgradeBuy();
          this.setCoins(this.shop.coins);
          this._renderContent();
        } else {
          btn.style.animation = 'none';
          btn.offsetHeight;
          btn.style.animation = 'shake 0.3s';
          SFXMapper.uiDenied();
        }
      });

      grid.appendChild(card);
    }

    this.elContent.appendChild(grid);
  }

  _renderResources() {
    const resources = this.getResources ? this.getResources() : [];
    const owned = resources.filter(r => r.count > 0);

    if (owned.length === 0) {
      this.elContent.innerHTML = `
        <div class="shop-empty">
          <div style="font-size:48px;margin-bottom:12px;">📦</div>
          <div>No resources yet.</div>
          <div style="font-size:13px;color:#888;margin-top:8px;">Mine floating blocks to collect resources!</div>
        </div>
      `;
      return;
    }

    const totalValue = owned.reduce((sum, r) => sum + r.count * r.value, 0);

    const header = document.createElement('div');
    header.className = 'resource-header';
    header.innerHTML = `<div class="resource-total">Total Value: 💰 ${totalValue}</div>`;
    this.elContent.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    for (const res of owned) {
      const card = document.createElement('div');
      card.className = 'shop-card resource-card';
      card.innerHTML = `
        <div class="shop-card-name">${res.name}</div>
        <div class="shop-card-desc">Owned: <strong>${res.count}</strong></div>
        <div class="shop-card-cost">💰 ${res.value} each</div>
        <div class="resource-sell-row">
          <button class="shop-buy-btn resource-sell-btn" data-type="${res.type}" data-amount="1">Sell 1</button>
          <button class="shop-buy-btn resource-sell-btn" data-type="${res.type}" data-amount="${res.count}">Sell All</button>
        </div>
      `;

      const btns = card.querySelectorAll('.resource-sell-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const amount = parseInt(btn.dataset.amount, 10);
          const result = this.onSellResource(type, amount);
          if (result.success) {
            SFXMapper.upgradeBuy();
            this.setCoins(this.shop.coins);
            this._renderContent();
          } else {
            btn.style.animation = 'none';
            btn.offsetHeight;
            btn.style.animation = 'shake 0.3s';
            SFXMapper.uiDenied();
          }
        });
      });

      grid.appendChild(card);
    }

    this.elContent.appendChild(grid);
  }

  show() {
    this.isOpen = true;
    this.el.classList.add('active');
    this._updateTabs();
    this._renderContent();
    document.addEventListener('keydown', this._escHandler);
  }

  hide() {
    this.isOpen = false;
    this.el.classList.remove('active');
    document.removeEventListener('keydown', this._escHandler);
  }

  setCoins(coins) {
    if (this.elCoinDisplay) {
      this.elCoinDisplay.textContent = coins;
    }
  }

  destroy() {
    this.hide();
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
