import { GAME_STATE } from './state.js';
import { WEAPONS_DATA } from './weapon.js';

export function createHud() {
  const ammoEl = document.getElementById('ammo');
  const scoreEl = document.getElementById('score');
  const moneyEl = document.getElementById('money');
  const timerEl = document.getElementById('timer');
  const healthNumEl = document.getElementById('health-num');
  const healthBarEl = document.getElementById('health-bar');
  const aliveSentinelsEl = document.getElementById('alive-sentinels');
  const aliveJackalsEl = document.getElementById('alive-jackals');
  const bombStatusEl = document.getElementById('bomb-status');
  const killFeedEl = document.getElementById('kill-feed');
  const crosshairEl = document.getElementById('crosshair');
  const hitMarkerEl = document.getElementById('hit-marker');
  const buyMenuEl = document.getElementById('buy-menu');
  const overlayEl = document.getElementById('overlay');
  const playBtn = document.getElementById('play');

  let hitMarkerTimer = 0;

  function setAmmo(mag, reserve) {
    if (ammoEl) ammoEl.textContent = `${mag} / ${reserve}`;
  }

  function setScore(sentinels, jackals) {
    if (scoreEl) scoreEl.textContent = `Sentinels ${sentinels} - ${jackals} Jackals`;
  }

  function setMoney(money) {
    if (moneyEl) moneyEl.textContent = `$${money}`;
  }

  function setTimer(seconds, phase) {
    if (timerEl) {
      const mins = Math.floor(Math.max(0, seconds) / 60);
      const secs = Math.floor(Math.max(0, seconds) % 60);
      const prefix = phase === 'buy' ? 'BUY: ' : '';
      timerEl.textContent = `${prefix}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  function hitMarker(killed, holdMs) {
    if (hitMarkerEl) {
      hitMarkerEl.style.opacity = '1';
      hitMarkerEl.style.borderColor = killed ? 'var(--red, #e14d4d)' : 'var(--accent, #f0a830)';
      hitMarkerTimer = holdMs;
    }
  }

  function showOverlay(kind, scoreSentinels) {
    if (overlayEl) {
      overlayEl.style.display = 'flex';
      const title = overlayEl.querySelector('h1') || overlayEl.querySelector('#overlay-title');
      if (title) {
        if (kind === 'paused') title.textContent = 'GAME PAUSED';
        else if (kind === 'ended') title.textContent = 'MATCH ENDED';
        else title.textContent = 'SANDLINE';
      }
    }
  }

  function hideOverlay() {
    if (overlayEl) {
      overlayEl.style.display = 'none';
    }
  }

  function showBuyMenu(open, state = GAME_STATE, weaponSystem = null, buyItemFn = null) {
    if (!buyMenuEl) return;
    buyMenuEl.style.display = open ? 'flex' : 'none';
    if (!open) return;

    buyMenuEl.innerHTML = `
      <div class="buy-container" style="background:var(--surface, #242b3d);padding:24px;border-radius:8px;border:1px solid var(--hairline, #343f56);width:400px;color:var(--ink, #f4f1ea);font-family:inherit;">
        <h2 style="margin-top:0;color:var(--accent, #f0a830);">TACTICAL BUY MENU</h2>
        <div style="margin-bottom:12px;font-size:16px;">Funds: <span style="color:var(--accent, #f0a830);font-weight:bold;">$${state.money}</span></div>
        <div class="buy-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        <button id="resume-btn" style="margin-top:16px;width:100%;padding:10px;background:var(--accent, #f0a830);color:#1a1f2c;border:none;font-weight:bold;cursor:pointer;border-radius:4px;">Resume / Close [B]</button>
      </div>
    `;

    const listEl = buyMenuEl.querySelector('.buy-list');
    const items = [
      { name: 'P9 Sidearm', price: 0, index: 0, type: 'weapon' },
      { name: 'VK-9 Rifle', price: 0, index: 1, type: 'weapon' },
      { name: 'Wasp SMG', price: 1200, index: 2, type: 'weapon' },
      { name: 'Longshot', price: 2500, index: 3, type: 'weapon' },
      { name: 'Frag Grenade', price: 300, index: 4, type: 'grenade' },
      { name: 'Combat Armor', price: 650, index: 5, type: 'armor' },
    ];

    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.style.cssText = 'padding:10px;display:flex;justify-content:space-between;align-items:center;background:#1a1f2c;border:1px solid #343f56;color:#f4f1ea;cursor:pointer;border-radius:4px;font-family:inherit;';
      
      let statusText = `$${item.price}`;
      let disabled = false;
      let equipped = false;

      if (item.type === 'weapon') {
        const owned = state.weaponsOwned[item.index];
        const active = weaponSystem && weaponSystem.activeIndex === item.index;
        if (active) {
          statusText = 'EQUIPPED';
          btn.style.borderColor = 'var(--accent, #f0a830)';
        } else if (owned) {
          statusText = 'OWNED';
        } else if (state.money < item.price) {
          statusText = `$${item.price} (NO FUNDS)`;
          disabled = true;
          btn.style.opacity = '0.5';
        }
      } else if (item.type === 'grenade') {
        if (state.grenadesCount >= 1) {
          statusText = 'OWNED (1/1)';
        } else if (state.money < item.price) {
          statusText = `$${item.price} (NO FUNDS)`;
          disabled = true;
          btn.style.opacity = '0.5';
        }
      } else if (item.type === 'armor') {
        if (state.armor >= 100) {
          statusText = 'MAX ARMOR';
        } else if (state.money < item.price) {
          statusText = `$${item.price} (NO FUNDS)`;
          disabled = true;
          btn.style.opacity = '0.5';
        }
      }

      btn.innerHTML = `<span>${item.name}</span><span style="font-weight:bold;color:var(--accent, #f0a830);">${statusText}</span>`;
      if (!disabled && buyItemFn) {
        btn.onclick = () => buyItemFn(item.index);
      }
      listEl.appendChild(btn);
    });

    const resumeBtn = buyMenuEl.querySelector('#resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = () => {
        state.buyMenuOpen = false;
        buyMenuEl.style.display = 'none';
      };
    }
  }

  function onPlay(fn) {
    if (playBtn) {
      playBtn.onclick = fn;
    }
  }

  // Periodic UI refresher for alive counts, bomb status, hitmarker fade, etc.
  setInterval(() => {
    if (aliveSentinelsEl) aliveSentinelsEl.textContent = GAME_STATE.aliveSentinels;
    if (aliveJackalsEl) aliveJackalsEl.textContent = GAME_STATE.aliveJackals;

    if (bombStatusEl) {
      if (GAME_STATE.bomb.planted) {
        bombStatusEl.textContent = `BOMB PLANTED (${Math.ceil(GAME_STATE.bomb.fuseTimer)}s)`;
        bombStatusEl.style.color = 'var(--red, #e14d4d)';
      } else {
        bombStatusEl.textContent = 'BOMB AVAILABLE';
        bombStatusEl.style.color = 'var(--accent, #f0a830)';
      }
    }

    if (killFeedEl && GAME_STATE.killFeed) {
      killFeedEl.innerHTML = GAME_STATE.killFeed.slice(-4).map(k => `<div style="font-size:12px;opacity:0.8;background:rgba(0,0,0,0.4);padding:2px 6px;margin-bottom:2px;border-radius:2px;">${k}</div>`).join('');
    }

    if (hitMarkerEl && hitMarkerTimer > 0) {
      hitMarkerTimer -= 50;
      if (hitMarkerTimer <= 0) {
        hitMarkerEl.style.opacity = '0';
      }
    }
  }, 50);

  return {
    setAmmo,
    setScore,
    setMoney,
    setTimer,
    hitMarker,
    showOverlay,
    hideOverlay,
    showBuyMenu,
    onPlay,
  };
}
