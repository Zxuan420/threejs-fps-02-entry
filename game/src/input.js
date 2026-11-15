export function createInput(canvas, onLockChange, onBuyToggle, onSelectWeapon, onGrenade) {
  const state = {
    keys: new Set(),
    firing: false,
  };

  let lookX = 0;
  let lookY = 0;
  let isLocked = false;
  let lockTime = 0;

  canvas.addEventListener('mousedown', () => {
    if (document.pointerLockElement === canvas) {
      state.firing = true;
    } else {
      lockTime = performance.now();
      canvas.requestPointerLock();
    }
  });

  window.addEventListener('mouseup', () => {
    state.firing = false;
  });

  // Guards: ignore mousemove within 250ms of lock acquisition, filter single-event spikes (|delta| > 150), and clamp takeLook deltas to +/- 250
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      if (performance.now() - lockTime < 250) {
        return;
      }
      const dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
      const dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
      if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
        return;
      }
      lookX += dx;
      lookY += dy;
    }
  });

  window.addEventListener('keydown', (e) => {
    state.keys.add(e.code);

    if (e.code === 'KeyB') {
      if (onBuyToggle) onBuyToggle();
    } else if (e.code === 'Digit1') {
      if (onSelectWeapon) onSelectWeapon(0);
    } else if (e.code === 'Digit2') {
      if (onSelectWeapon) onSelectWeapon(1);
    } else if (e.code === 'Digit3') {
      if (onSelectWeapon) onSelectWeapon(2);
    } else if (e.code === 'Digit4') {
      if (onSelectWeapon) onSelectWeapon(3);
    } else if (e.code === 'Digit5') {
      if (onSelectWeapon) onSelectWeapon(4);
    } else if (e.code === 'Digit6') {
      if (onSelectWeapon) onSelectWeapon(5);
    } else if (e.code === 'KeyG') {
      if (onGrenade) onGrenade();
    }
  });

  window.addEventListener('keyup', (e) => {
    state.keys.delete(e.code);
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === canvas;
    if (isLocked) {
      // Record timestamp to ignore synthetic post-lock mousemove jumps within 250ms
      lockTime = performance.now();
    }
    if (onLockChange) {
      onLockChange(isLocked);
    }
  });

  return {
    state,
    takeLook() {
      const x = Math.max(-250, Math.min(250, lookX));
      const y = Math.max(-250, Math.min(250, lookY));
      lookX = 0;
      lookY = 0;
      return { x, y };
    },
    requestLock() {
      lockTime = performance.now();
      canvas.requestPointerLock();
    },
  };
}
