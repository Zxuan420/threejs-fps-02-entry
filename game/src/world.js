import * as THREE from 'three';
import { PALETTE } from './palette.js';

function createProceduralTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  if (type === 'ground') {
    ctx.fillStyle = '#423730';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#54443b';
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = '#635043';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
  } else if (type === 'crate') {
    ctx.fillStyle = PALETTE.surface;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = PALETTE.hairline;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 232);
    ctx.beginPath();
    ctx.moveTo(12, 12); ctx.lineTo(244, 244);
    ctx.moveTo(244, 12); ctx.lineTo(12, 244);
    ctx.stroke();
  } else if (type === 'siteA' || type === 'siteB') {
    ctx.fillStyle = type === 'siteA' ? '#1d4ed8' : '#b91c1c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type === 'siteA' ? 'A' : 'B', 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const groundTex = createProceduralTexture('ground');
  groundTex.repeat.set(20, 20);
  const crateTex = createProceduralTexture('crate');
  const siteATex = createProceduralTexture('siteA');
  const siteBTex = createProceduralTexture('siteB');

  const materials = {
    canvas: new THREE.MeshStandardMaterial({ color: new THREE.Color('#423730'), map: groundTex, roughness: 0.8, metalness: 0.05 }),
    surface: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.surface), roughness: 0.75, metalness: 0.1 }),
    hairline: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), map: crateTex, roughness: 0.65, metalness: 0.2 }),
    containerTeal: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.containerTeal), roughness: 0.5, metalness: 0.3 }),
    containerRust: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.containerRust), roughness: 0.6, metalness: 0.25 }),
    containerOlive: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.containerOlive), roughness: 0.55, metalness: 0.25 }),
    accent: new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.3, emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.5 }),
    siteA: new THREE.MeshStandardMaterial({ map: siteATex, roughness: 0.3, emissive: new THREE.Color('#1d4ed8'), emissiveIntensity: 0.6 }),
    siteB: new THREE.MeshStandardMaterial({ map: siteBTex, roughness: 0.3, emissive: new THREE.Color('#b91c1c'), emissiveIntensity: 0.6 }),
  };

  const colliders = [];
  const shootables = [];
  const waypoints = [
    { id: 0, pos: new THREE.Vector3(0, 0, 20), connections: [1, 2] },
    { id: 1, pos: new THREE.Vector3(-12, 0, 0), connections: [0, 3, 5] },
    { id: 2, pos: new THREE.Vector3(12, 0, 0), connections: [0, 4, 6] },
    { id: 3, pos: new THREE.Vector3(-12, 0, -20), connections: [1, 5, 7] },
    { id: 4, pos: new THREE.Vector3(12, 0, -20), connections: [2, 6, 8] },
    { id: 5, pos: new THREE.Vector3(-4, 0, -8), connections: [1, 3, 6] },
    { id: 6, pos: new THREE.Vector3(4, 0, -8), connections: [2, 4, 5] },
    { id: 7, pos: new THREE.Vector3(-16, 0, -26), connections: [3] },
    { id: 8, pos: new THREE.Vector3(16, 0, -26), connections: [4] },
  ];

  function box(width, height, depth, x, y, z, matName) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[matName] || materials.surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Ground
  box(52, 0.4, 70, 0, -0.2, 0, 'canvas');

  // Outer Perimeter Walls
  box(1.4, 6.5, 70, -26, 3.25, 0, 'surface');
  box(1.4, 6.5, 70, 26, 3.25, 0, 'surface');
  box(52, 6.5, 1.4, 0, 3.25, -35, 'surface');
  box(52, 6.5, 1.4, 0, 3.25, 35, 'surface');

  // Lane A (Warehouse / Teal & Rust containers)
  box(12, 5.5, 1.4, -18, 2.75, -8, 'containerTeal');
  box(1.4, 5.5, 18, -12, 2.75, -16, 'containerRust');

  // Lane B (Container Yard - Olive & Teal containers)
  box(4.5, 2.8, 9, 12, 1.4, -6, 'containerOlive');
  box(4.5, 2.8, 9, 15, 1.4, -18, 'containerTeal');
  box(3.5, 2.5, 7, 10, 1.25, 10, 'containerRust');

  // Mid Connector and Cover Crates
  box(2.2, 1.6, 2.2, -3, 0.8, -2, 'hairline');
  box(2.2, 1.6, 2.2, 3, 0.8, -2, 'hairline');
  box(4.5, 2.0, 1.4, 0, 1.0, -12, 'hairline');

  // Bomb Sites A & B with floor markers and floating site letters
  const siteAMesh = box(6.5, 0.08, 6.5, -14, 0.04, -26, 'siteA');
  const siteBMesh = box(6.5, 0.08, 6.5, 14, 0.04, -26, 'siteB');
  siteAMesh.userData.site = 'A';
  siteBMesh.userData.site = 'B';

  // Floating Site Letters A & B
  function createFloatingLetter(letter, x, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = letter === 'A' ? '#3b82f6' : '#ef4444';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, 3.5, z);
    sprite.scale.set(2.2, 2.2, 2.2);
    group.add(sprite);
  }
  createFloatingLetter('A', -14, -26);
  createFloatingLetter('B', 14, -26);

  // Dusk Sky Gradient Dome and Lighting
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#1e3a8a'); // deep blue at top
  gradient.addColorStop(0.5, '#334155');
  gradient.addColorStop(1, '#f97316'); // warm orange at horizon
  skyCtx.fillStyle = gradient;
  skyCtx.fillRect(0, 0, 512, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(95, 16, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  group.add(skyDome);

  scene.background = new THREE.Color('#1e293b');
  scene.fog = new THREE.FogExp2(new THREE.Color('#334155'), 0.012);

  const ambient = new THREE.HemisphereLight(new THREE.Color('#ffcc80'), new THREE.Color('#2a3b52'), 1.8);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(new THREE.Color('#ffb020'), 2.6);
  sun.position.set(-20, 30, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // 6 Warm Sodium Point Lights along lanes
  const lampPositions = [
    [-12, 5.2, -22],
    [12, 5.2, -22],
    [-12, 5.2, 2],
    [12, 5.2, 2],
    [0, 5.2, -10],
    [0, 5.2, 16],
  ];
  for (const [lx, ly, lz] of lampPositions) {
    const lamp = new THREE.PointLight(new THREE.Color('#ff9900'), 2.5, 22);
    lamp.position.set(lx, ly, lz);
    scene.add(lamp);
  }

  return {
    colliders,
    shootables,
    waypoints,
    sites: {
      A: new THREE.Vector3(-14, 0, -26),
      B: new THREE.Vector3(14, 0, -26),
    },
    group,
  };
}
