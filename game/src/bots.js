import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { SOUNDS } from './audio.js';
import { slideMove } from './collision.js';

export function createBots(scene, waypoints, sites, colliders) {
  const sentinelMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.teal), roughness: 0.6 });
  const jackalMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.orangeRed), roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.4 });
  const gunMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1f232a'), roughness: 0.5 });
  const visorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#111827'), roughness: 0.3 });
  const bandMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#111827'), roughness: 0.7 });

  const torsoGeom = new THREE.BoxGeometry(0.5, 0.8, 0.3);
  const headGeom = new THREE.SphereGeometry(0.16, 12, 10);
  const gunGeom = new THREE.BoxGeometry(0.06, 0.08, 0.45);
  const visorGeom = new THREE.BoxGeometry(0.22, 0.04, 0.1);
  const bandGeom = new THREE.BoxGeometry(0.51, 0.15, 0.31);

  const bots = [];
  const hitMeshes = [];

  function spawnBot(team, index, spawnPos) {
    const group = new THREE.Group();
    group.position.copy(spawnPos);

    const mat = team === 'sentinel' ? sentinelMat : jackalMat;
    const torso = new THREE.Mesh(torsoGeom, mat);
    torso.position.y = 0.9;
    torso.userData.botPart = 'torso';

    const band = new THREE.Mesh(bandGeom, bandMat);
    band.position.set(0, 0.1, 0);
    torso.add(band);

    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.48;
    head.userData.botPart = 'head';

    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 0, -0.11);
    head.add(visor);

    const gun = new THREE.Mesh(gunGeom, gunMat);
    gun.position.set(0.16, 0.75, -0.28);

    group.add(torso, head, gun);
    scene.add(group);

    const bot = {
      id: `${team}_${index}`,
      team,
      group,
      torso,
      head,
      position: group.position,
      velocity: new THREE.Vector3(),
      health: 100,
      alive: true,
      currentWaypoint: Math.floor(Math.random() * waypoints.length),
      state: 'patrol',
      shootCooldown: 0,
      damageTimer: 0,
      carriesBomb: team === 'jackal' && index === 0,
    };

    torso.userData.bot = bot;
    head.userData.bot = bot;
    hitMeshes.push(torso, head);
    bots.push(bot);
    return bot;
  }

  // 3 Sentinels + 4 Jackals
  spawnBot('sentinel', 0, new THREE.Vector3(0, 0, 22));
  spawnBot('sentinel', 1, new THREE.Vector3(-4, 0, 22));
  spawnBot('sentinel', 2, new THREE.Vector3(4, 0, 22));

  spawnBot('jackal', 0, new THREE.Vector3(0, 0, -26));
  spawnBot('jackal', 1, new THREE.Vector3(-6, 0, -26));
  spawnBot('jackal', 2, new THREE.Vector3(6, 0, -26));
  spawnBot('jackal', 3, new THREE.Vector3(-12, 0, -20));

  function reset() {
    const sentinelSpawns = [
      new THREE.Vector3(0, 0, 22),
      new THREE.Vector3(-4, 0, 22),
      new THREE.Vector3(4, 0, 22),
    ];
    const jackalSpawns = [
      new THREE.Vector3(0, 0, -26),
      new THREE.Vector3(-6, 0, -26),
      new THREE.Vector3(6, 0, -26),
      new THREE.Vector3(-12, 0, -20),
    ];

    let sIdx = 0, jIdx = 0;
    for (const b of bots) {
      b.alive = true;
      b.health = 100;
      b.state = 'patrol';
      b.damageTimer = 0;
      b.velocity.set(0, 0, 0);
      if (b.team === 'sentinel') {
        b.position.copy(sentinelSpawns[sIdx++ % sentinelSpawns.length]);
      } else {
        b.position.copy(jackalSpawns[jIdx++ % jackalSpawns.length]);
      }
      b.group.position.copy(b.position);
      b.group.visible = true;
    }
    bots[3].carriesBomb = true;
  }

  function damage(mesh, amount) {
    const bot = mesh.userData.bot;
    if (!bot || !bot.alive) return false;
    bot.health -= amount;
    bot.damageTimer = 3.0;
    if (bot.health > 0) return false;
    bot.alive = false;
    bot.group.visible = false;
    return true;
  }

  function step(dt, playerPos, playerAlive, onBotShot, bombState, plantCallback) {
    for (const b of bots) {
      if (!b.alive) continue;
      b.damageTimer = Math.max(0, b.damageTimer - dt);

      const targetPos = playerAlive ? playerPos : null;
      const distToPlayer = targetPos ? b.position.distanceTo(targetPos) : 999;

      if (distToPlayer < 20) {
        b.state = 'combat';
        b.group.lookAt(targetPos.x, b.position.y, targetPos.z);
        b.shootCooldown -= dt;
        if (b.shootCooldown <= 0) {
          b.shootCooldown = 0.18 + Math.random() * 0.25;
          SOUNDS.shot(1.2);
          if (onBotShot) onBotShot(b.team, 12);
        }
      } else {
        b.state = 'patrol';
        const wp = waypoints[b.currentWaypoint];
        if (wp) {
          const dir = new THREE.Vector3().subVectors(wp.pos, b.position);
          dir.y = 0;
          if (dir.length() < 1.6) {
            const nexts = wp.connections;
            b.currentWaypoint = nexts[Math.floor(Math.random() * nexts.length)];
          } else {
            dir.normalize();
            const speed = 2.6;
            b.velocity.x = dir.x * speed;
            b.velocity.z = dir.z * speed;
            b.velocity.y -= 20 * dt;
            slideMove(b.position, b.velocity, 0.34, 1.6, colliders, dt);
            b.group.position.copy(b.position);
            b.group.lookAt(wp.pos.x, b.position.y, wp.pos.z);
          }
        }

        if (b.team === 'jackal' && b.carriesBomb && !bombState.planted) {
          const siteA = sites.A;
          if (b.position.distanceTo(siteA) < 3.0) {
            plantCallback('A', siteA);
          }
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    reset,
    damage,
    step,
    aliveCount(team) {
      return bots.filter((b) => b.team === team && b.alive).length;
    },
  };
}
