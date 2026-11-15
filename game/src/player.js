import * as THREE from 'three';
import { slideMove, checkOverlap } from './collision.js';
import { GAME_STATE } from './state.js';
import { SOUNDS } from './audio.js';

const dir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

export function createPlayer(colliders) {
  const state = {
    position: new THREE.Vector3(0, 0, 24),
    pitch: 0,
    yaw: 0,
    eye: 1.6,
    health: 100,
  };

  const velocity = new THREE.Vector3();
  let crouching = false;
  let onGround = false;

  const RADIUS = 0.35;
  const STAND_HEIGHT = 1.7;
  const CROUCH_HEIGHT = 1.1;
  const STAND_EYE = 1.6;
  const CROUCH_EYE = 1.0;
  const WALK_SPEED = 4.2;
  const CROUCH_SPEED = 2.1;
  const JUMP_SPEED = 6.5;
  const GRAVITY = 22;
  const GROUND_ACCEL = 14;
  const AIR_ACCEL = 4;
  const SENSITIVITY = 0.0022;

  function updateHealthUI() {
    const numEl = document.getElementById('health-num');
    const barEl = document.getElementById('health-bar');
    if (numEl) numEl.textContent = Math.max(0, state.health);
    if (barEl) barEl.style.width = `${Math.max(0, state.health)}%`;
  }

  function look(dx, dy) {
    state.yaw -= dx * SENSITIVITY;
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - dy * SENSITIVITY));
  }

  function recoil(pitchKick, yawKick) {
    state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch + pitchKick));
    state.yaw += yawKick;
  }

  function damage(amount) {
    if (state.health <= 0) return;
    let effectiveDamage = amount;
    if (GAME_STATE.armor > 0) {
      const absorbed = Math.min(GAME_STATE.armor, Math.round(amount * 0.5));
      GAME_STATE.armor -= absorbed;
      effectiveDamage -= absorbed;
    }
    state.health = Math.max(0, state.health - effectiveDamage);
    SOUNDS.hit();
    updateHealthUI();
  }

  function reset() {
    state.position.set(0, 0, 24);
    state.pitch = 0;
    state.yaw = 0;
    state.eye = STAND_EYE;
    state.health = 100;
    velocity.set(0, 0, 0);
    crouching = false;
    onGround = true;
    updateHealthUI();
  }

  function step(dt, keys) {
    const wantCrouch = keys.has('ControlLeft') || keys.has('ControlRight');
    const height = crouching ? CROUCH_HEIGHT : STAND_HEIGHT;

    if (wantCrouch && !crouching) {
      crouching = true;
    } else if (!wantCrouch && crouching) {
      if (!checkOverlap(state.position.x, state.position.y, state.position.z, RADIUS, STAND_HEIGHT, 0.02, colliders)) {
        crouching = false;
      }
    }

    const currentHeight = crouching ? CROUCH_HEIGHT : STAND_HEIGHT;
    const eyeTarget = crouching ? CROUCH_EYE : STAND_EYE;
    state.eye += (eyeTarget - state.eye) * Math.min(1, dt * 12);

    dir.set(0, 0, 0);
    forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));

    if (keys.has('KeyW') || keys.has('ArrowUp')) dir.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) dir.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) dir.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dir.sub(right);
    dir.normalize();

    const speed = crouching ? CROUCH_SPEED : WALK_SPEED;
    const accel = onGround ? GROUND_ACCEL : AIR_ACCEL;
    const blend = Math.min(1, accel * dt);

    velocity.x += (dir.x * speed - velocity.x) * blend;
    velocity.z += (dir.z * speed - velocity.z) * blend;

    if (onGround && !dir.lengthSq()) {
      velocity.x *= 0.8;
      velocity.z *= 0.8;
    }

    if (keys.has('Space') && onGround && !crouching) {
      velocity.y = JUMP_SPEED;
      onGround = false;
    }

    velocity.y -= GRAVITY * dt;

    onGround = slideMove(state.position, velocity, RADIUS, currentHeight, colliders, dt);
    velocity.y = Math.max(-30, velocity.y);
  }

  return {
    state,
    get health() { return state.health; },
    step,
    look,
    groundSpeed() {
      return Math.hypot(velocity.x, velocity.z);
    },
    recoil,
    damage,
    reset,
  };
}
