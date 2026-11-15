import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { SOUNDS } from './audio.js';

export const WEAPONS_DATA = [
  { id: 0, name: 'P9 Sidearm', price: 0, magSize: 15, reserve: 60, fireGap: 0.14, damage: 24, spreadStill: 0.003, spreadMove: 0.035, recoil: 0.006 },
  { id: 1, name: 'VK-9 Rifle', price: 0, magSize: 30, reserve: 90, fireGap: 0.096, damage: 34, spreadStill: 0.0022, spreadMove: 0.028, recoil: 0.009 },
  { id: 2, name: 'Wasp SMG', price: 1200, magSize: 30, reserve: 120, fireGap: 0.07, damage: 22, spreadStill: 0.004, spreadMove: 0.032, recoil: 0.005 },
  { id: 3, name: 'Longshot', price: 2500, magSize: 10, reserve: 40, fireGap: 0.45, damage: 85, spreadStill: 0.0005, spreadMove: 0.06, recoil: 0.025 },
];

export function createWeaponSystem(camera, scene) {
  const mats = {
    gunmetal: new THREE.MeshStandardMaterial({ color: new THREE.Color('#272d38'), roughness: 0.4, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: new THREE.Color('#3b4252'), roughness: 0.5, metalness: 0.5 }),
    accent: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.3, emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.4 }),
    grip: new THREE.MeshStandardMaterial({ color: new THREE.Color('#1f232a'), roughness: 0.8, metalness: 0.1 }),
  };

  const model = new THREE.Group();

  // Compact Rifle Viewmodel
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.28), mats.gunmetal);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), mats.steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.28);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.025, 0.01), mats.gunmetal);
  frontSight.position.set(0, 0.035, -0.42);

  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.06), mats.steel);
  magazine.position.set(0, -0.09, -0.05);
  magazine.rotation.x = -0.15;

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.18), mats.grip);
  stock.position.set(0, -0.01, 0.2);

  const accentBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.04), mats.accent);
  accentBand.position.set(0, 0.02, -0.08);

  model.add(receiver, barrel, frontSight, magazine, stock, accentBand);
  model.scale.set(0.6, 0.6, 0.6);
  model.position.set(0.24, -0.22, -0.34);
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.21, -0.65);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.21, -0.4);
  camera.add(flashLight);

  const inventory = WEAPONS_DATA.map((w) => ({ mag: w.magSize, reserve: w.reserve }));
  let activeIndex = 1; // Start with VK-9

  const state = {
    mag: inventory[1].mag,
    reserve: inventory[1].reserve,
    cooldown: 0,
    reloadLeft: 0,
    flashTimer: 0,
    kick: 0,
  };

  function selectWeapon(index, ownedList) {
    if (!ownedList[index]) return;
    inventory[activeIndex] = { mag: state.mag, reserve: state.reserve };
    activeIndex = index;
    state.mag = inventory[index].mag;
    state.reserve = inventory[index].reserve;
    state.cooldown = 0;
    state.reloadLeft = 0;
  }

  function step(dt, speed) {
    const data = WEAPONS_DATA[activeIndex];
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flashTimer = Math.max(0, state.flashTimer - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 16);

    // Weapon bob while moving
    const bob = speed > 0.5 ? Math.sin(performance.now() * 0.015) * 0.008 : 0;
    model.position.y = -0.22 + bob - state.kick * 0.6;
    model.position.z = -0.34 + state.kick;
    model.rotation.x = state.kick * 2.5;
    model.rotation.z = speed > 0.5 ? Math.cos(performance.now() * 0.007) * 0.03 : 0;

    flash.visible = state.flashTimer > 0;
    flashLight.intensity = state.flashTimer > 0 ? 15 : 0;

    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.6 * Math.min(1, (1.9 - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const need = data.magSize - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
        inventory[activeIndex] = { mag: state.mag, reserve: state.reserve };
      }
    }
  }

  return {
    state,
    activeIndex,
    selectWeapon,
    step,
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      const data = WEAPONS_DATA[activeIndex];
      state.cooldown = data.fireGap;
      state.flashTimer = 0.05;
      state.kick = data.recoil * 7;
      SOUNDS.shot(activeIndex === 3 ? 0.7 : 1.0);
    },
    takeRound() {
      if (state.mag <= 0) return false;
      state.mag -= 1;
      inventory[activeIndex].mag = state.mag;
      return true;
    },
    reload() {
      const data = WEAPONS_DATA[activeIndex];
      if (state.reloadLeft > 0 || state.mag === data.magSize || state.reserve === 0) return;
      state.reloadLeft = 1.9;
      SOUNDS.reload();
    },
    spread(speed) {
      const data = WEAPONS_DATA[activeIndex];
      return data.spreadStill + Math.min(1, speed / 5.2) * data.spreadMove;
    },
    currentData() {
      return WEAPONS_DATA[activeIndex];
    },
    refill() {
      for (let i = 0; i < WEAPONS_DATA.length; i++) {
        inventory[i].mag = WEAPONS_DATA[i].magSize;
        inventory[i].reserve = WEAPONS_DATA[i].reserve;
      }
      state.mag = inventory[activeIndex].mag;
      state.reserve = inventory[activeIndex].reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
    },
  };
}
