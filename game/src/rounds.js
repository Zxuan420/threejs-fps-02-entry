import { SOUNDS } from './audio.js';

export function createRoundManager(state, weaponSystem, player, bots, bomb, hud) {
  function startBuyPhase() {
    state.phase = 'buy';
    state.buyTimer = 15;
    state.roundTimer = 100;
    state.buyMenuOpen = false;
    bomb.reset();
    player.reset();
    bots.reset();
    weaponSystem.refill();
    hud.showBuyMenu(false);
  }

  function startRoundAction() {
    state.phase = 'round';
    state.buyMenuOpen = false;
    hud.showBuyMenu(false);
    SOUNDS.beep();
  }

  function endRound(winner) {
    state.phase = 'ended';
    if (winner === 'sentinel') {
      state.scoreSentinels += 1;
      state.money += 325;
      SOUNDS.stinger(true);
      state.roundBannerText = 'SENTINELS WIN THE ROUND';
    } else {
      state.scoreJackals += 1;
      state.money += 150;
      SOUNDS.stinger(false);
      state.roundBannerText = 'JACKALS WIN THE ROUND';
    }

    let banner = document.getElementById('round-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'round-banner';
      banner.style.cssText = 'position:fixed;top:35%;left:50%;transform:translate(-50%, -50%);font-size:36px;font-weight:700;color:var(--accent);font-family:var(--font-readout);text-align:center;text-shadow:0 4px 16px rgba(0,0,0,0.8);z-index:150;';
      document.body.appendChild(banner);
    }
    banner.textContent = state.roundBannerText;

    if (state.scoreSentinels >= 5 || state.scoreJackals >= 5 || state.round >= state.maxRounds) {
      state.phase = 'match_end';
      state.matchWinner = state.scoreSentinels >= state.scoreJackals ? 'Sentinels' : 'Jackals';
      state.roundBannerText = `${state.matchWinner.toUpperCase()} WIN MATCH!`;
      banner.textContent = state.roundBannerText;
    } else {
      setTimeout(() => {
        state.round += 1;
        if (banner) banner.textContent = '';
        startBuyPhase();
      }, 4000);
    }
  }

  function buyItem(itemIndex) {
    if (state.phase !== 'buy') return;
    const prices = [0, 0, 1200, 2500, 300, 650]; // P9, VK-9, Wasp, Longshot, Grenade, Armor
    const price = prices[itemIndex];
    if (state.money < price) return;

    if (itemIndex <= 3) {
      state.weaponsOwned[itemIndex] = true;
      state.money -= price;
      weaponSystem.selectWeapon(itemIndex, state.weaponsOwned);
      SOUNDS.beep();
    } else if (itemIndex === 4 && state.grenadesCount < 1) {
      state.grenadesCount += 1;
      state.money -= price;
      SOUNDS.beep();
    } else if (itemIndex === 5 && state.armor < 100) {
      state.armor = 100;
      state.money -= price;
      SOUNDS.beep();
    }
    hud.setMoney(state.money);
    hud.showBuyMenu(true, state, weaponSystem, buyItem);
  }

  function step(dt) {
    if (state.phase === 'buy') {
      state.buyTimer -= dt;
      if (state.buyTimer <= 0) {
        startRoundAction();
      }
    } else if (state.phase === 'round') {
      state.roundTimer -= dt;
      if (state.roundTimer <= 0) {
        endRound(state.bomb.planted ? 'jackal' : 'sentinel');
      }

      const sAlive = bots.aliveCount('sentinel') + (player.state.health > 0 ? 1 : 0);
      const jAlive = bots.aliveCount('jackal');
      state.aliveSentinels = sAlive;
      state.aliveJackals = jAlive;

      if (sAlive === 0) {
        endRound('jackal');
      } else if (jAlive === 0 && !state.bomb.planted) {
        endRound('sentinel');
      }
    }
  }

  return {
    startBuyPhase,
    startRoundAction,
    endRound,
    buyItem,
    step,
  };
}
