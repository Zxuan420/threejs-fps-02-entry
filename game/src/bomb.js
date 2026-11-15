import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { SOUNDS } from './audio.js';

export function createBomb(scene, state) {
  const geom = new THREE.BoxGeometry(0.4, 0.2, 0.3);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.8 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.visible = false;
  scene.add(mesh);

  let plantProgress = 0;
  let defuseProgress = 0;

  function reset() {
    state.bomb.carrier = 'jackal'; // Random Jackal starts with bomb
    state.bomb.dropped = false;
    state.bomb.planted = false;
    state.bomb.site = null;
    state.bomb.fuseTimer = 35;
    state.bomb.defuseTimer = 0;
    state.bomb.defusing = false;
    mesh.visible = false;
    plantProgress = 0;
    defuseProgress = 0;
  }

  function plant(siteName, pos) {
    if (state.bomb.planted) return;
    state.bomb.planted = true;
    state.bomb.site = siteName;
    state.bomb.fuseTimer = 35;
    mesh.position.copy(pos);
    mesh.position.y = 0.1;
    mesh.visible = true;
    SOUNDS.beep();
  }

  function step(dt, playerPos, sites, onDetonate, onDefuse) {
    if (state.phase !== 'round') return;

    if (state.bomb.planted) {
      state.bomb.fuseTimer -= dt;
      if (state.bomb.fuseTimer <= 0) {
        SOUNDS.explosion();
        onDetonate();
        return;
      }

      // Check player defuse at bomb position
      const sitePos = sites[state.bomb.site];
      if (playerPos && sitePos && playerPos.distanceTo(sitePos) < 2.5) {
        state.bomb.defusing = true;
        defuseProgress += dt;
        if (Math.random() < 0.3) SOUNDS.beep();
        if (defuseProgress >= 5.0) {
          SOUNDS.stinger(true);
          onDefuse();
        }
      } else {
        state.bomb.defusing = false;
        defuseProgress = Math.max(0, defuseProgress - dt * 2);
      }
    }
  }

  return {
    mesh,
    reset,
    plant,
    step,
    getPlantProgress() { return plantProgress; },
    getDefuseProgress() { return defuseProgress; },
    setPlantProgress(val) { plantProgress = val; },
    setDefuseProgress(val) { defuseProgress = val; },
  };
}
