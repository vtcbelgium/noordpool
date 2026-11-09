import * as THREE from 'three';
import { createMoonTexture, createSnowTexture, createSoftParticleTexture } from './textures.js';

export function seededRandom(seed = 143) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

export function snowHeight(x, z) {
  // Flat around the workshop, with broad wind-carved banks toward the horizon.
  const distance = Math.sqrt(x * x + (z + 2) * (z + 2));
  const edge = THREE.MathUtils.smoothstep(distance, 12, 34);
  const ripples = Math.sin(x * .21 + z * .1) * .42 + Math.cos(z * .19 - x * .08) * .38;
  return -.08 + edge * (ripples + .35);
}

export function createLandscape(scene) {
  const snowTexture = createSnowTexture();
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xdbe8f0, roughness: .96, metalness: .025,
    bumpMap: snowTexture, bumpScale: .075,
  });
  const groundGeometry = new THREE.PlaneGeometry(220, 220, 150, 150);
  groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, snowHeight(positions.getX(i), positions.getZ(i)));
  }
  groundGeometry.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeometry, snowMaterial);
  ground.receiveShadow = true; scene.add(ground);

  const random = seededRandom(39);
  const hillGeometries = Array.from({ length: 4 }, (_, variant) => {
    const geometry = new THREE.SphereGeometry(1, 48, 28);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const ridge = Math.sin(x * 7 + variant * 1.8) * .16 + Math.cos(z * 5 + x * 3 + variant) * .11;
      vertices.setY(i, y * (1 + ridge) + Math.max(y, 0) * Math.sin(z * 11 + variant) * .045);
    }
    geometry.computeVertexNormals();
    return geometry;
  });
  const hillMaterial = new THREE.MeshStandardMaterial({ color: 0xabc5dc, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const angle = Math.PI * .05 + i / 13 * Math.PI * .91;
    const radius = 54 + random() * 26;
    const hill = new THREE.Mesh(hillGeometries[i % hillGeometries.length], hillMaterial);
    hill.position.set(Math.cos(angle) * radius, -5.4, -Math.sin(angle) * radius - 10);
    hill.scale.set(15 + random() * 16, 8 + random() * 8, 14 + random() * 15);
    hill.receiveShadow = true; scene.add(hill);
  }

  // Two gently raised snowbanks frame the foreground without concealing the gift.
  const bankGeometry = new THREE.SphereGeometry(1, 32, 16);
  [[-12, -.8, 7, 7, 1.15, 4], [13, -1.3, 1, 8, 1.8, 5], [-9, -1, -8, 8, 1.2, 4]].forEach((v) => {
    const bank = new THREE.Mesh(bankGeometry, snowMaterial);
    bank.position.set(v[0], v[1], v[2]); bank.scale.set(v[3], v[4], v[5]);
    bank.receiveShadow = true; scene.add(bank);
  });

  // A short path of stepping stones and subtle footprints leads to the entrance.
  const stoneGeometry = new THREE.CylinderGeometry(.8, .85, .065, 12);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x6a797e, roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
    stone.position.set(Math.sin(i * 1.1) * .16, -.015, 2.4 + i * 1.05);
    stone.scale.set(1, 1, .58); stone.rotation.y = i * .6;
    stone.receiveShadow = true; scene.add(stone);
  }

  const footGeometry = new THREE.SphereGeometry(1, 12, 8);
  const footMaterial = new THREE.MeshStandardMaterial({ color: 0xb6ccd8, roughness: 1 });
  const feet = new THREE.InstancedMesh(footGeometry, footMaterial, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    dummy.position.set(1.3 + (i % 2) * .32 + i * .055, -.036, 3.1 + i * .32);
    dummy.scale.set(.12, .016, .25); dummy.rotation.set(0, -.2, 0); dummy.updateMatrix();
    feet.setMatrixAt(i, dummy.matrix);
  }
  scene.add(feet);
  return { snowMaterial };
}

export function createSky(scene) {
  const random = seededRandom(471);
  const positions = new Float32Array(1900 * 3);
  const colors = new Float32Array(1900 * 3);
  for (let i = 0; i < 1900; i++) {
    const azimuth = random() * Math.PI * 2;
    const elevation = .08 + random() * 1.4;
    const radius = 125;
    positions[i * 3] = Math.cos(azimuth) * Math.cos(elevation) * radius;
    positions[i * 3 + 1] = Math.sin(elevation) * radius;
    positions[i * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * radius;
    const brightness = .35 + random() * .65;
    colors[i * 3] = brightness * .82;
    colors[i * 3 + 1] = brightness * .9;
    colors[i * 3 + 2] = brightness;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: .21, vertexColors: true, transparent: true, opacity: .9, depthWrite: false,
    sizeAttenuation: true, fog: false,
  }));
  scene.add(stars);

  const moonGroup = new THREE.Group();
  moonGroup.position.set(-42, 17.5, -48);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 48, 32), new THREE.MeshBasicMaterial({
    map: createMoonTexture(), color: 0xe6f0f6, fog: false,
  }));
  moonGroup.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createSoftParticleTexture(), color: 0xb9d9f2, transparent: true,
    opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  halo.scale.set(24, 24, 1); moonGroup.add(halo); scene.add(moonGroup);

  const hemisphere = new THREE.HemisphereLight(0xa4cef4, 0x183142, 1.05);
  scene.add(hemisphere);
  const moonlight = new THREE.DirectionalLight(0xb4d8ff, 1.65);
  moonlight.position.set(-18, 28, -12);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonlight.shadow.camera, { left: -23, right: 23, top: 22, bottom: -18, near: 1, far: 80 });
  moonlight.shadow.bias = -.00045;
  moonlight.shadow.normalBias = .04;
  moonlight.shadow.radius = 3;
  moonlight.target.position.set(0, 0, -1);
  scene.add(moonlight, moonlight.target);
  return { moonlight, stars };
}
