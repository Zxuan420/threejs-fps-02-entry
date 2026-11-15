import * as THREE from 'three';

const probe = new THREE.Box3();

export function checkOverlap(x, y, z, radius, height, lift = 0.02, colliders) {
  probe.min.set(x - radius, y + lift, z - radius);
  probe.max.set(x + radius, y + height - lift, z + radius);
  for (let i = 0; i < colliders.length; i++) {
    if (probe.intersectsBox(colliders[i])) return colliders[i];
  }
  return null;
}

export function slideMove(pos, vel, radius, height, colliders, dt) {
  // Move X
  const nextX = pos.x + vel.x * dt;
  if (!checkOverlap(nextX, pos.y, pos.z, radius, height, 0.04, colliders)) {
    pos.x = nextX;
  } else {
    vel.x = 0;
  }

  // Move Z
  const nextZ = pos.z + vel.z * dt;
  if (!checkOverlap(pos.x, pos.y, nextZ, radius, height, 0.04, colliders)) {
    pos.z = nextZ;
  } else {
    vel.z = 0;
  }

  // Move Y
  pos.y += vel.y * dt;
  const hit = checkOverlap(pos.x, pos.y, pos.z, radius, height, 0, colliders);
  let onGround = false;
  if (hit && vel.y <= 0) {
    pos.y = hit.max.y;
    vel.y = 0;
    onGround = true;
  } else if (hit) {
    pos.y = hit.min.y - height;
    vel.y = 0;
  }
  if (pos.y < 0) {
    pos.y = 0;
    vel.y = 0;
    onGround = true;
  }
  return onGround;
}
