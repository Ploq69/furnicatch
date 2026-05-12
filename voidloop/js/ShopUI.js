// ==========================================
// Voidloop — Shop UI Overlay
// ==========================================

import { SHOP_ITEMS, SHOP_UPGRADES, PICKAXE_TIER_UPGRADES } from './ShopManager.js';
import { SFXMapper } from './SFXMapper.js';
import { LoadoutPreview } from './LoadoutPreview.js';
import { cloneLoadout } from './KayKitLoadout.js';
import { getZoneById } from './ZoneData.js';

// Map shop item IDs to visual loadout item IDs for preview
const SHOP_ITEM_PREVIEW_MAP = {
  fire_pickaxe:     { slot: 'rightHand', item: 'pickaxe' },
  ice_pickaxe:      { slot: 'rightHand', item: 'pickaxe' },
  desert_pickaxe:   { slot: 'rightHand', item: 'pickaxe' },
  steel_pickaxe:    { slot: 'rightHand', item: 'pickaxe' },
  mire_pickaxe:     { slot: 'rightHand', item: 'pickaxe' },
  royal_pickaxe:    { slot: 'rightHand', item: 'pickaxe' },
  fire_staff:       { slot: 'rightHand', item: 'staff' },
  ice_staff:        { slot: 'rightHand', item: 'staff' },
  desert_staff:     { slot: 'rightHand', item: 'staff' },
  tesla_staff:      { slot: 'rightHand', item: 'staff' },
  vine_staff:       { slot: 'rightHand', item: 'staff' },
  scepter:          { slot: 'rightHand', item: 'staff' },
};

export class ShopUI {
  constructor(shopManager, onBuyItem, onBuyUpgrade, onClose, getResources, onSellResource, getLoadout, onOpenLoadout, onBuyPickaxeTier) {
    this.shop = shopManager;
    this.onBuyItem = onBuyItem;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onClose = onClose;
    this.getResources = getResources;
    this.onSellResource = onSellResource;
    this.getLoadout = getLoadout;
    this.onOpenLoadout = onOpenLoadout;
    this.onBuyPickaxeTier = onBuyPickaxeTier;
    this.activeTab = 'tools';
    this.preview = null;
    this.previewBaseLoadout = null;
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
          <div class="shop-header-actions">
            ${this.onOpenLoadout ? '<button class="shop-appearance-btn" id="shop-appearance-btn" title="Customize appearance (I)">👤 Appearance</button>' : ''}
            <div class="shop-coins">💰 <span id="shop-coin-display">0</span></div>
          </div>
          <button class="shop-close" id="shop-close-btn">✕</button>
        </div>
        <div class="shop-body">
          <div class="shop-main">
            <div class="shop-tabs">
              <button class="shop-tab" data-tab="tools">Tools</button>
              <button class="shop-tab" data-tab="armor">Armor</button>
              <button class="shop-tab" data-tab="weapons">Weapons</button>
              <button class="shop-tab" data-tab="upgrades">Upgrades</button>
              <button class="shop-tab" data-tab="resources">Resources</button>
            </div>
            <div class="shop-content" id="shop-content"></div>
          </div>
          <div class="shop-preview-col">
            <div class="shop-preview-label">Preview</div>
            <div class="shop-preview-area" id="shop-preview-area"></div>
            <div class="shop-preview-hint">Hover items to preview</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.elCoinDisplay = this.el.querySelector('#shop-coin-display');
    this.elContent = this.el.querySelector('#shop-content');
    this.elTabs = this.el.querySelectorAll('.shop-tab');
    this.elPreviewArea = this.el.querySelector('#shop-preview-area');
  }

  _bindEvents() {
    this.el.querySelector('#shop-close-btn').addEventListener('click', () => {
      SFXMapper.uiClick();
      this.hide();
      if (this.onClose) this.onClose();
    });

    const appearanceBtn = this.el.querySelector('#shop-appearance-btn');
    if (appearanceBtn) {
      appearanceBtn.addEventListener('click', () => {
        SFXMapper.uiClick();
        if (this.onOpenLoadout) this.onOpenLoadout();
      });
    }

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
        <button class="shop-buy-btn" data-id="${item.id}" ${(item.owned && item.equipped) || (!item.owned && !item.canAfford) ? 'disabled' : ''}>
          ${item.owned ? (item.equipped ? 'Equipped' : 'Equip') : 'Buy'}
        </button>
      `;

      // Preview on hover
      card.addEventListener('mouseenter', () => {
        this._previewItem(item.id);
      });
      card.addEventListener('mouseleave', () => {
        this._resetPreview();
      });

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

      // Try/VFX preview button for tools and weapons
      if ((item.type === 'tool' || item.type === 'weapon') && this.preview) {
        const tryBtn = document.createElement('button');
        tryBtn.className = 'shop-try-btn';
        tryBtn.textContent = '⚔ Try';
        tryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._previewItem(item.id);
          this.preview.playItemVFX(item.id);
        });
        card.appendChild(tryBtn);
      }

      grid.appendChild(card);
    }

    this.elContent.appendChild(grid);
  }

  _previewItem(itemId) {
    if (!this.preview || !this.previewBaseLoadout) return;
    const mapping = SHOP_ITEM_PREVIEW_MAP[itemId];
    if (!mapping) return; // Armor/suits have no visual preview
    const previewLoadout = cloneLoadout(this.previewBaseLoadout);
    previewLoadout[mapping.slot] = mapping.item;
    this.preview.setLoadout(previewLoadout);
  }

  _resetPreview() {
    if (!this.preview || !this.previewBaseLoadout) return;
    this.preview.setLoadout(this.previewBaseLoadout);
  }

  _renderUpgrades() {
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    this._renderPickaxeTierUpgrades(grid);

    const upgrades = this.shop.getAllUpgrades();

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

  _renderPickaxeTierUpgrades(grid) {
    for (const zoneUpgrades of PICKAXE_TIER_UPGRADES) {
      const zone = getZoneById(zoneUpgrades.zoneId);
      const status = this.shop.getPickaxeTierStatus(zoneUpgrades.zoneId);
      const nextUpgrade = zoneUpgrades.tiers.find(t => t.tier === status.currentTier + 1);
      const ownedBase = status.currentTier > 0;
      const recommended = ownedBase && !status.maxed && status.canAfford;
      const card = document.createElement('div');
      card.className = 'shop-card pickaxe-tier-card' + (status.maxed ? ' maxed' : '') + (recommended ? ' recommended' : '');
      const pips = Array.from({ length: 4 }, (_, i) => i < status.currentTier ? '●' : '○').join(' ');
      card.innerHTML = `
        <div class="shop-card-icon">⛏️</div>
        <div class="shop-card-name">${zone?.name || zoneUpgrades.zoneId}</div>
        <div class="shop-card-desc pickaxePip">Tier ${status.currentTier}/4 ${pips}</div>
        <div class="shop-card-cost">${status.maxed ? 'MAXED' : (ownedBase ? `💰 ${nextUpgrade?.cost ?? status.nextCost}` : '🔒')}</div>
        <button class="shop-buy-btn" data-zone-id="${zoneUpgrades.zoneId}" ${!ownedBase || status.maxed || !status.canAfford ? 'disabled' : ''}>
          ${status.maxed ? 'Maxed' : 'Upgrade'}
        </button>
      `;

      const btn = card.querySelector('.shop-buy-btn');
      btn.addEventListener('click', () => {
        const result = this.onBuyPickaxeTier ? this.onBuyPickaxeTier(zoneUpgrades.zoneId) : { success: false };
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

  async show() {
    this.isOpen = true;
    this.el.classList.add('active');
    this._updateTabs();
    this._renderContent();
    document.addEventListener('keydown', this._escHandler);

    // Initialize preview
    if (this.getLoadout && this.elPreviewArea) {
      const loadout = this.getLoadout();
      this.previewBaseLoadout = cloneLoadout(loadout);
      if (!this.preview) {
        this.preview = new LoadoutPreview(this.elPreviewArea);
        await this.preview.init(this.previewBaseLoadout);
      } else {
        this.preview.resize();
        await this.preview.setLoadout(this.previewBaseLoadout);
      }
    }
  }

  hide() {
    this.isOpen = false;
    this.el.classList.remove('active');
    document.removeEventListener('keydown', this._escHandler);
  }

  updatePreview(dt) {
    if (this.isOpen && this.preview) {
      this.preview.resize();
      this.preview.update(dt);
    }
  }

  setCoins(coins) {
    if (this.elCoinDisplay) {
      this.elCoinDisplay.textContent = coins;
    }
  }

  destroy() {
    this.hide();
    if (this.preview) {
      // Clean up renderer
      if (this.preview.renderer) {
        this.preview.renderer.dispose();
      }
      this.preview = null;
    }
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
