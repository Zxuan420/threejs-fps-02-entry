import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { SOUNDS } from './audio.js';
import { checkOverlap } from './collision.js';

export function createGrenadeSystem(scene, colliders, bots, player) {
  const geom = new THREE.SphereGeometry(0.12, 10, 8);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#222831'), roughness: 0.6, metalness: 0.8 });

  const activeGrenades = [];
  const raycaster = new THREE.Raycaster();

  // Explosion visual effect helper (reusable)
  function triggerExplosion(pos, radius, damageVal, onDamageTarget) {
    SOUNDS.explosion();

    // 1. Point light flash
    const light = new THREE.PointLight(new THREE.Color(PALETTE.accent), 25, radius * 2.5);
    light.position.copy(pos);
    scene.add(light);
    let lightTimer = 0.25;

    // 2. Expanding transparent sphere
    const sphereGeom = new THREE.SphereGeometry(0.2, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.position.copy(pos);
    scene.add(sphere);
    let sphereScale = 0.2;

    // Damage check against player and bots with LoS
    const distToPlayer = player.state.position.distanceTo(pos);
    if (distToPlayer <= radius) {
      // LoS check
      raycaster.set(pos, player.state.position.clone().sub(pos).normalize());
      raycaster.far = distToPlayer;
      const hits = raycaster.intersectObjects(colliders, false);
      if (hits.length === 0) {
        const falloff = 1 - distToPlayer / radius;
        player.damage(Math.round(damageVal * falloff));
      }
    }

    for (const b of bots.bots) {
      if (!b.alive) continue;
      const distToBot = b.position.distanceTo(pos);
      if (distToBot <= radius) {
        raycaster.set(pos, b.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(pos).normalize());
        raycaster.far = distToBot;
        const hits = raycaster.intersectObjects(colliders, false);
        if (hits.length === 0) {
          const falloff = 1 - distToBot / radius;
          const killed = bots.damage(b.torso, Math.round(damageVal * falloff));
          if (killed && onDamageTarget) onDamageTarget();
        }
      }
    }

    const interval = setInterval(() => {
      lightTimer -= 0.05;
      sphereScale += radius * 0.2;
      sphere.scale.set(sphereScale, sphereScale, sphereScale);
      sphereMat.opacity = Math.max(0, sphereMat.opacity - 0.15);
      if (lightTimer <= 0) {
        scene.remove(light);
        scene.remove(sphere);
        sphereGeom.dispose();
        sphereMat.dispose();
        clearInterval(interval);
      }
    }, 50);
  }

  function throwGrenade(camera, onKill) {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(camera.position);
    scene.add(mesh);

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const velocity = dir.multiplyScalar(15).add(new THREE.Vector3(0, 5, 0));

    activeGrenades.push({
      mesh,
      position: mesh.position,
      velocity,
      fuse: 1.6,
      bounced: false,
    });
  }

  function step(dt, onKill) {
    for (let i = activeGrenades.length - 1; i >= 0; i--) {
      const g = activeGrenades[i];
      g.fuse -= dt;
      g.velocity.y -= 20 * dt;

      g.position.addScaledVector(g.velocity, dt);

      // Check collision with colliders
      if (checkOverlap(g.position.x, g.position.y, g.position.z, 0.15, 0.3, 0, colliders)) {
        if (!g.bounced) {
          g.bounced = true;
          g.velocity.y = -g.velocity.y * 0.45;
          g.velocity.x *= 0.6;
          g.velocity.z *= 0.6;
        } else {
          g.velocity.set(0, 0, 0);
        }
      }

      g.mesh.position.copy(g.position);

      if (g.fuse <= 0) {
        triggerExplosion(g.position, 6.0, 90, onKill);
        scene.remove(g.mesh);
        activeGrenades.splice(i, 1);
      }
    }
  }

  return {
    throwGrenade,
    step,
    triggerExplosion,
  };
}
