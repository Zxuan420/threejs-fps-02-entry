import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { GAME_STATE } from './state.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeaponSystem, WEAPONS_DATA } from './weapon.js';
import { createBots } from './bots.js';
import { createBomb } from './bomb.js';
import { createRoundManager } from './rounds.js';
import { createHud } from './hud.js';
import { createGrenadeSystem } from './grenade.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const player = createPlayer(world.colliders);
const weaponSystem = createWeaponSystem(camera, scene);
const bots = createBots(scene, world.waypoints, world.sites, world.colliders);
const bomb = createBomb(scene, GAME_STATE);
const grenadeSystem = createGrenadeSystem(scene, world.colliders, bots, player);
const hud = createHud();

const roundManager = createRoundManager(GAME_STATE, weaponSystem, player, bots, bomb, hud);

const input = createInput(
  renderer.domElement,
  (locked) => {
    if (shot) return;
    if (locked) {
      hud.hideOverlay();
    } else if (GAME_STATE.phase !== 'match_end') {
      hud.showOverlay('paused', GAME_STATE.scoreSentinels);
    }
  },
  () => {
    if (GAME_STATE.phase === 'buy') {
      GAME_STATE.buyMenuOpen = !GAME_STATE.buyMenuOpen;
      hud.showBuyMenu(GAME_STATE.buyMenuOpen, GAME_STATE, weaponSystem, (idx) => roundManager.buyItem(idx));
    }
  },
  (idx) => {
    roundManager.buyItem(idx);
  },
  () => {
    // Grenade throw
    if (GAME_STATE.grenadesCount > 0 && GAME_STATE.phase === 'round') {
      GAME_STATE.grenadesCount -= 1;
      grenadeSystem.throwGrenade(camera, () => {
        GAME_STATE.money += 300;
      });
    }
  }
);

const raycaster = new THREE.Raycaster();
raycaster.far = 90;
const shootables = world.shootables.concat(bots.hitMeshes);
const direction = new THREE.Vector3();
const body = player.state;
const markerHoldMs = shot ? 4000 : 90;
let frozen = false;
let started = false;
let accumulator = 0;
let lastTime = performance.now();

hud.setAmmo(weaponSystem.state.mag, weaponSystem.state.reserve);
hud.setScore(GAME_STATE.scoreSentinels, GAME_STATE.scoreJackals);
hud.setMoney(GAME_STATE.money);

hud.onPlay(() => {
  if (shot) return;
  if (GAME_STATE.phase === 'match_end') {
    window.location.reload();
  }
  input.requestLock();
  started = true;
});

function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}

function shoot(spread) {
  if (!weaponSystem.ready() || GAME_STATE.phase !== 'round') return false;
  if (!weaponSystem.takeRound()) return false;
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  const hit = raycaster.intersectObjects(shootables, false)[0];
  if (hit && hit.object.userData.bot) {
    const isHead = hit.object.userData.botPart === 'head';
    const damageVal = isHead ? weaponSystem.currentData().damage * 2.5 : weaponSystem.currentData().damage;
    const killed = bots.damage(hit.object, damageVal);
    hud.hitMarker(killed, markerHoldMs);
    if (killed) {
      GAME_STATE.money += 300;
    }
  }
  weaponSystem.pullTrigger();
  player.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  hud.setAmmo(weaponSystem.state.mag, weaponSystem.state.reserve);
  hud.setMoney(GAME_STATE.money);
  return true;
}

function step(dt) {
  roundManager.step(dt);
  player.step(dt, input.state.keys);
  weaponSystem.step(dt, player.groundSpeed());
  grenadeSystem.step(dt, () => {
    GAME_STATE.money += 300;
  });
  bots.step(dt, body.position, player.health > 0, (team, dmg) => {
    if (team === 'jackal') player.damage(dmg);
  }, GAME_STATE.bomb, (siteName, pos) => {
    bomb.plant(siteName, pos);
  });
  bomb.step(dt, body.position, world.sites, () => {
    roundManager.endRound('jackal');
  }, () => {
    roundManager.endRound('sentinel');
  });

  hud.setTimer(GAME_STATE.phase === 'buy' ? GAME_STATE.buyTimer : GAME_STATE.roundTimer, GAME_STATE.phase);
  hud.setScore(GAME_STATE.scoreSentinels, GAME_STATE.scoreJackals);
  hud.setMoney(GAME_STATE.money);
  hud.setAmmo(weaponSystem.state.mag, weaponSystem.state.reserve);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);
    if (input.state.firing && weaponSystem.ready()) shoot(shot ? 0 : weaponSystem.spread(player.groundSpeed()));
    if (input.state.keys.has('KeyR')) weaponSystem.reload();
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let i = 0; i < steps; i++) step(FIXED_STEP);
}

function runShot(name) {
  hud.hideOverlay();
  body.pitch = 0;
  body.yaw = 0;
  if (name === 'buy') {
    body.position.set(0, 0, 20);
    GAME_STATE.phase = 'buy';
    hud.showBuyMenu(true, GAME_STATE, weaponSystem, (idx) => roundManager.buyItem(idx));
    settle(10);
  } else if (name === 'play') {
    body.position.set(0, 0, 10);
    body.pitch = 0;
    body.yaw = 0;
    roundManager.startRoundAction();
    if (bots.bots.length > 3) {
      bots.bots[3].position.set(0, 0, -2);
      bots.bots[3].group.position.copy(bots.bots[3].position);
      bots.bots[3].alive = true;
      bots.bots[3].group.visible = true;
    }
    scene.updateMatrixWorld(true);
    let botGunPos = new THREE.Vector3(0.16, 1.75, -2.28);
    if (bots.bots.length > 3 && bots.bots[3].group.children[2]) {
      bots.bots[3].group.children[2].getWorldPosition(botGunPos);
    }
    // Visible tracer toward player
    const points = [
      botGunPos,
      new THREE.Vector3(0, 1.6, 9.5),
    ];
    const tracerGeom = new THREE.BufferGeometry().setFromPoints(points);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffb020 });
    const tracer = new THREE.Line(tracerGeom, tracerMat);
    scene.add(tracer);

    // Muzzle-flash glow at bot's gun
    const flashGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
    const flashMesh = new THREE.Mesh(flashGeom, flashMat);
    flashMesh.position.copy(botGunPos);
    scene.add(flashMesh);

    const flashLight = new THREE.PointLight(0xff9900, 6, 4);
    flashLight.position.copy(botGunPos);
    scene.add(flashLight);

    settle(20);
  } else if (name === 'start') {
    body.position.set(0, 0, 24);
    body.pitch = 0;
    body.yaw = 0;
    roundManager.startBuyPhase();
    if (bots.bots.length >= 2) {
      bots.bots[0].position.set(-1.2, 0, 20);
      bots.bots[0].group.position.copy(bots.bots[0].position);
      bots.bots[1].position.set(1.2, 0, 20);
      bots.bots[1].group.position.copy(bots.bots[1].position);
    }
    settle(10);
  } else if (name === 'end') {
    body.position.set(0, 0, 10);
    body.pitch = 0;
    body.yaw = 0;
    roundManager.startRoundAction();
    roundManager.endRound('sentinel');
    settle(25);
  }
  paintTwiceThenReady();
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    renderer.render(scene, camera);
    painted++;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
if (shot) {
  runShot(shot);
} else {
  roundManager.startBuyPhase();
  requestAnimationFrame(frame);
}
