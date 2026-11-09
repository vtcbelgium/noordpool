import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSignTexture, createWoodTexture, createSoftParticleTexture } from './textures.js';
import { seededRandom, snowHeight } from './world.js';

const TAU = Math.PI * 2;

// Baking static pieces by material keeps the detailed building inexpensive to draw.
class StaticBatch {
  constructor() { this.pools = new Map(); }
  add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const transform = new THREE.Object3D();
    transform.position.set(...position); transform.rotation.set(...rotation); transform.scale.set(...scale);
    transform.updateMatrix(); geometry.applyMatrix4(transform.matrix);
    const key = material.uuid;
    if (!this.pools.has(key)) this.pools.set(key, { material, geometries: [] });
    this.pools.get(key).geometries.push(geometry);
  }
  box(w, h, d, material, position, rotation) {
    this.add(new THREE.BoxGeometry(w, h, d), material, position, rotation);
  }
  sphere(radius, material, position, scale = [1, 1, 1]) {
    this.add(new THREE.SphereGeometry(radius, 16, 12), material, position, [0, 0, 0], scale);
  }
  cylinder(r1, r2, height, material, position, rotation = [0, 0, 0]) {
    this.add(new THREE.CylinderGeometry(r1, r2, height, 14), material, position, rotation);
  }
  build() {
    const group = new THREE.Group();
    for (const { material, geometries } of this.pools.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(geometries, false), material);
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      geometries.forEach((geometry) => geometry.dispose());
    }
    return group;
  }
}

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
}

export function createWorkshop(scene, snowMaterial) {
  const wood = standard(0xb88861, { map: createWoodTexture(), roughness: .9 });
  const darkWood = standard(0x593324, { map: wood.map });
  const trim = standard(0x54231f);
  const green = standard(0x213e34);
  const roofMaterial = standard(0x3e4648, { roughness: .95 });
  const gold = standard(0xe9b45f, { metalness: .65, roughness: .35 });
  const stone = standard(0x67717a, { roughness: 1 });
  const glass = standard(0xffc06d, { emissive: 0xffa13e, emissiveIntensity: 1.2, roughness: .35 });
  const warmGlass = standard(0xffd38b, { emissive: 0xffbd63, emissiveIntensity: .85 });
  const batch = new StaticBatch();
  const front = 3.55;

  batch.box(11.4, .6, 7.8, stone, [0, .2, 0]);
  batch.box(11, 4.6, 7.1, wood, [0, 2.6, 0]);
  // Individual hewn log courses and their projecting corner ends.
  for (let row = 0; row < 13; row++) {
    const y = .65 + row * .335;
    batch.box(11.3, .28, .21, row % 3 ? wood : darkWood, [0, y, front]);
    batch.box(11.3, .28, .21, wood, [0, y, -front]);
    for (const side of [-1, 1]) {
      batch.box(.24, .28, 7.3, wood, [side * 5.53, y, 0]);
      batch.cylinder(.16, .16, .2, darkWood, [side * 5.47, y, 3.8], [Math.PI / 2, 0, 0]);
    }
  }

  const gable = new THREE.Shape();
  gable.moveTo(-5.6, 4.78); gable.lineTo(0, 7.12); gable.lineTo(5.6, 4.78); gable.closePath();
  batch.add(new THREE.ShapeGeometry(gable), wood, [0, 0, 3.66]);
  batch.add(new THREE.ShapeGeometry(gable), wood, [0, 0, -3.66], [0, Math.PI, 0]);
  const pitch = Math.atan2(2.55, 6.25);
  for (const side of [-1, 1]) {
    batch.box(6.93, .25, 8.6, roofMaterial, [side * 3.14, 5.91, 0], [0, 0, -side * pitch]);
    batch.box(7.02, .22, 8.73, snowMaterial, [side * 3.14, 6.1, 0], [0, 0, -side * pitch]);
    batch.box(6.98, .18, .24, darkWood, [side * 3.14, 5.87, 4.35], [0, 0, -side * pitch]);
    batch.box(.25, .25, 8.7, darkWood, [side * 6.34, 4.65, 0]);
  }
  batch.box(.4, .22, 8.8, snowMaterial, [0, 7.42, 0]);

  // Heavy window frames, pane divisions, exterior shutters and snowy sills.
  function frontWindow(x, y, z, width = 2.15, height = 1.85) {
    batch.box(width + .28, height + .28, .16, trim, [x, y, z]);
    batch.box(width, height, .08, glass, [x, y, z + .1]);
    batch.box(.095, height, .13, darkWood, [x, y, z + .18]);
    batch.box(width, .095, .13, darkWood, [x, y, z + .18]);
    batch.box(width + .5, .16, .45, darkWood, [x, y - height / 2 - .12, z + .15]);
    batch.box(width + .58, .12, .46, snowMaterial, [x, y - height / 2, z + .16]);
    for (const side of [-1, 1]) {
      batch.box(.43, height + .1, .12, green, [x + side * (width / 2 + .45), y, z + .025]);
      for (let slat = 0; slat < 5; slat++) {
        batch.box(.39, .04, .045, gold, [x + side * (width / 2 + .45), y - .65 + slat * .32, z + .1]);
      }
    }
    // A visible back curtain gives each glowing pane some depth.
    batch.box(.24, height - .14, .055, warmGlass, [x - width * .36, y, z + .16]);
    batch.box(.24, height - .14, .055, warmGlass, [x + width * .36, y, z + .16]);
  }
  frontWindow(-3.25, 2.75, 3.72);
  frontWindow(3.25, 2.75, 3.72);
  // The side facing the opening camera has a pair of illuminated windows too.
  for (const z of [-1.8, 1.6]) {
    batch.box(.15, 2.05, 2.05, trim, [5.66, 2.7, z]);
    batch.box(.07, 1.8, 1.8, glass, [5.76, 2.7, z]);
    batch.box(.12, 1.85, .095, darkWood, [5.83, 2.7, z]);
    batch.box(.12, .095, 1.85, darkWood, [5.83, 2.7, z]);
    batch.box(.45, .16, 2.4, snowMaterial, [5.76, 1.68, z]);
  }

  batch.box(1.6, 2.9, .2, trim, [0, 1.8, 3.77]);
  batch.box(1.3, 2.65, .12, green, [0, 1.74, 3.91]);
  batch.box(.85, .65, .08, warmGlass, [0, 2.48, 4]);
  batch.box(.055, .68, .11, gold, [0, 2.48, 4.07]);
  batch.box(.86, .055, .11, gold, [0, 2.48, 4.07]);
  batch.box(.92, .75, .06, darkWood, [0, 1.1, 4.01]);
  batch.sphere(.065, gold, [.48, 1.55, 4.1]);
  batch.box(2.4, .18, 1.2, darkWood, [0, .25, 4.1]);
  batch.box(2.8, .14, .7, snowMaterial, [0, .13, 4.65]);

  // Round attic window and a traditional wreath above the workshop door.
  batch.cylinder(.49, .49, .14, trim, [0, 5.96, 3.78], [Math.PI / 2, 0, 0]);
  batch.cylinder(.37, .37, .16, glass, [0, 5.96, 3.9], [Math.PI / 2, 0, 0]);
  batch.box(.055, .73, .07, gold, [0, 5.96, 4.01]);
  batch.box(.73, .055, .07, gold, [0, 5.96, 4.01]);
  const wreathMaterial = standard(0x254f36);
  batch.add(new THREE.TorusGeometry(.37, .13, 8, 28), wreathMaterial, [0, 3.45, 4.05]);
  const berry = standard(0xc23c36, { roughness: .45 });
  for (let i = 0; i < 9; i++) {
    const t = i / 9 * TAU;
    batch.sphere(.055, berry, [Math.cos(t) * .38, 3.45 + Math.sin(t) * .38, 4.17]);
  }
  batch.box(.35, .16, .1, berry, [0, 3.14, 4.2]);

  const signMaterial = new THREE.MeshStandardMaterial({
    map: createSignTexture('KERSTMAN ATELIER', 'CADEAUTJES VANAF DE NOORDPOOL', true),
    roughness: .75, emissive: 0x5c3517, emissiveIntensity: .2,
  });
  batch.box(5.35, 1.08, .17, darkWood, [0, 4.56, 3.95]);
  batch.add(new THREE.PlaneGeometry(5.2, 1), signMaterial, [0, 4.56, 4.05]);

  // Icicles have different lengths; instancing is unnecessary after static baking.
  const ice = standard(0xd9f3ff, { metalness: .08, roughness: .25 });
  const random = seededRandom(122);
  for (let i = 0; i < 43; i++) {
    const x = -6.1 + i * .29;
    const y = 7.35 - Math.abs(x) * Math.tan(pitch);
    const length = .1 + random() * .45;
    batch.add(new THREE.ConeGeometry(.035 + random() * .025, length, 6), ice, [x, y - length / 2 - .15, 4.31], [0, 0, Math.PI]);
  }

  // Stone chimney, cap, and a copper stove pipe through the white roof.
  batch.box(1.05, 3.7, .95, stone, [3.4, 6.65, -1.5]);
  for (let row = 0; row < 8; row++) {
    batch.box(1.09, .045, 1, darkWood, [3.4, 5.05 + row * .43, -1.5]);
    batch.box(.035, .37, 1.01, darkWood, [3.4 + (row % 2 ? .22 : -.22), 5.24 + row * .43, -1.5]);
  }
  batch.box(1.38, .24, 1.28, stone, [3.4, 8.58, -1.5]);
  batch.box(1.39, .18, 1.29, snowMaterial, [3.4, 8.76, -1.5]);

  // Lanterns flank the door. Their emissive centers bloom without six point lights.
  for (const x of [-1.3, 1.3]) {
    batch.box(.08, .34, .12, darkWood, [x, 3.15, 3.95]);
    batch.box(.35, .48, .34, glass, [x, 2.8, 4.08]);
    batch.box(.46, .07, .43, gold, [x, 3.06, 4.08]);
    batch.box(.43, .07, .4, darkWood, [x, 2.53, 4.08]);
    for (const side of [-1, 1]) batch.box(.045, .52, .38, darkWood, [x + side * .17, 2.8, 4.08]);
  }

  const workshop = batch.build(); workshop.position.z = -4; scene.add(workshop);
  const porchLight = new THREE.PointLight(0xffb65e, 46, 16, 2);
  porchLight.position.set(0, 3.6, 1); scene.add(porchLight);
  const sideLight = new THREE.PointLight(0xffbd74, 24, 11, 2);
  sideLight.position.set(6.4, 2.6, -2); scene.add(sideLight);

  // A scalloped string follows the front roofline.
  const bulbs = new THREE.Group();
  const bulbGeometry = new THREE.SphereGeometry(.068, 10, 8);
  const colors = [0xffcf70, 0xff725f, 0x6de0b3, 0xffd36e];
  for (let i = 0; i < 42; i++) {
    const x = -6 + i * 12 / 41;
    const y = 7.25 - Math.abs(x) * Math.tan(pitch) - .25 - Math.sin(i / 41 * Math.PI * 8) * .05;
    const bulb = new THREE.Mesh(bulbGeometry, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] }));
    bulb.position.set(x, y, .4); bulbs.add(bulb);
  }
  scene.add(bulbs);
  return { chimney: new THREE.Vector3(3.4, 8.85, -5.5), porchLight };
}

export function createTrees(scene, snowMaterial) {
  const random = seededRandom(981);
  const configurations = [
    [-9.4, -2.8, 7.2], [-13.3, -8, 8.8], [-8.5, 6, 5.6],
    [10.1, -4, 7.9], [13.6, -10.3, 9.2], [10.5, 4.4, 6.1],
    [-18.5, -17.5, 7.4], [20.5, -20, 8.2],
  ];
  const levels = 8;
  const coneGeometry = new THREE.ConeGeometry(1, 1, 56, 1);
  const vertices = coneGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), z = vertices.getZ(i), angle = Math.atan2(z, x);
    const irregularity = 1 + Math.sin(angle * 11) * .045 + Math.sin(angle * 19 + 1.7) * .035;
    vertices.setX(i, x * irregularity); vertices.setZ(i, z * irregularity);
  }
  coneGeometry.computeVertexNormals();
  const foliageMaterial = standard(0x183f35, { roughness: .95 });
  const foliage = new THREE.InstancedMesh(coneGeometry, foliageMaterial, configurations.length * levels);
  const snow = new THREE.InstancedMesh(coneGeometry, snowMaterial, configurations.length * levels);
  const branchCount = configurations.length * levels * 7;
  const branchGeometry = new THREE.ConeGeometry(1, 1, 9);
  const branches = new THREE.InstancedMesh(branchGeometry, foliageMaterial, branchCount);
  const branchSnow = new THREE.InstancedMesh(branchGeometry, snowMaterial, branchCount);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 1, 12), standard(0x4a2b20), configurations.length);
  const ornamentsPerTree = 24;
  const ornaments = new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 12, 8), standard(0xffffff, { roughness: .25, metalness: .55 }), configurations.length * ornamentsPerTree);
  const lightsPerTree = 72;
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(.042, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), configurations.length * lightsPerTree);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const lightColors = [0xffc76b, 0x9be5c5, 0xff6b55, 0xffda94];
  const ornamentColors = [0xc63b37, 0xe9b556, 0xc0d8de];
  const lightPhases = [];
  const originalColors = [];
  const stars = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  const branchDirection = new THREE.Vector3();
  let coneIndex = 0, ornamentIndex = 0, lightIndex = 0, branchIndex = 0;
  configurations.forEach(([x, z, height], treeIndex) => {
    const base = snowHeight(x, z);
    dummy.position.set(x, base + .65, z); dummy.scale.set(1, 1.3, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    trunks.setMatrixAt(treeIndex, dummy.matrix);
    const maxRadius = height * .275;
    for (let level = 0; level < levels; level++) {
      const fraction = level / levels;
      const radius = maxRadius * (1 - fraction * .91);
      const layerHeight = height * (.26 - fraction * .12);
      const y = base + height * (.18 + fraction * .82);
      dummy.position.set(x, y, z); dummy.scale.set(radius, layerHeight, radius); dummy.updateMatrix();
      foliage.setMatrixAt(coneIndex, dummy.matrix);
      // Upper snow stays on the bough; an exposed dark-green fringe adds depth.
      dummy.position.y = y + layerHeight * .145 + .035;
      dummy.scale.set(radius * .77, layerHeight * .77, radius * .77); dummy.updateMatrix();
      snow.setMatrixAt(coneIndex++, dummy.matrix);
      // Radial boughs break up the outline and the snow into irregular branch fans.
      for (let bough = 0; bough < 7; bough++) {
        const angle = bough / 7 * TAU + level * 1.83 + treeIndex * .73;
        const length = radius * (.6 + random() * .24);
        const branchRadius = radius * (.22 + random() * .12);
        const reach = radius * (.72 + random() * .1);
        dummy.position.set(x + Math.cos(angle) * reach, y - layerHeight * .23, z + Math.sin(angle) * reach);
        branchDirection.set(Math.cos(angle), .16 + random() * .21, Math.sin(angle)).normalize();
        dummy.quaternion.setFromUnitVectors(up, branchDirection);
        dummy.scale.set(branchRadius, length, branchRadius * .7); dummy.updateMatrix();
        branches.setMatrixAt(branchIndex, dummy.matrix);
        dummy.position.y += branchRadius * .35;
        dummy.scale.multiplyScalar(.83); dummy.updateMatrix(); branchSnow.setMatrixAt(branchIndex++, dummy.matrix);
      }
      dummy.rotation.set(0, 0, 0);
    }
    for (let i = 0; i < ornamentsPerTree; i++) {
      const fraction = .12 + random() * .72;
      const angle = random() * TAU;
      const radius = maxRadius * (1 - fraction) * (.93 + random() * .1);
      dummy.position.set(x + Math.cos(angle) * radius, base + height * (.2 + fraction * .8), z + Math.sin(angle) * radius);
      dummy.scale.setScalar(.7 + random() * .55); dummy.updateMatrix();
      ornaments.setMatrixAt(ornamentIndex, dummy.matrix);
      ornaments.setColorAt(ornamentIndex++, color.setHex(ornamentColors[i % 3]));
    }
    // A continuous spiral of fairy lights wraps each tree.
    for (let i = 0; i < lightsPerTree; i++) {
      const fraction = i / lightsPerTree;
      const angle = fraction * TAU * 5 + treeIndex;
      const radius = maxRadius * (1 - fraction * .94) * 1.015;
      dummy.position.set(x + Math.cos(angle) * radius, base + height * (.17 + fraction * .83), z + Math.sin(angle) * radius);
      dummy.scale.setScalar(1); dummy.updateMatrix(); lights.setMatrixAt(lightIndex, dummy.matrix);
      color.setHex(lightColors[(i + treeIndex) % lightColors.length]);
      lights.setColorAt(lightIndex, color);
      originalColors.push(color.clone()); lightPhases.push(random() * TAU); lightIndex++;
    }
    const starShape = new THREE.Shape();
    for (let p = 0; p < 10; p++) {
      const a = Math.PI / 2 + p * Math.PI / 5, r = p % 2 ? .13 : .3;
      if (p === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: .07, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: 0xffd378, side: THREE.DoubleSide }));
    star.position.set(x, base + height * .995 + .12, z); stars.add(star);
  });
  foliage.castShadow = true; foliage.receiveShadow = true; snow.castShadow = true; snow.receiveShadow = true;
  trunks.castShadow = true; ornaments.castShadow = true;
  branches.castShadow = true; branches.receiveShadow = true;
  branchSnow.castShadow = true; branchSnow.receiveShadow = true;
  scene.add(foliage, snow, branches, branchSnow, trunks, ornaments, lights, stars);
  let lastBlink = 0;
  return {
    update(time) {
      if (time - lastBlink < .075) return;
      lastBlink = time;
      for (let i = 0; i < lightIndex; i++) {
        const pulse = .65 + .35 * Math.sin(time * 1.6 + lightPhases[i]);
        color.copy(originalColors[i]).multiplyScalar(pulse * 1.8);
        lights.setColorAt(i, color);
      }
      lights.instanceColor.needsUpdate = true;
    },
  };
}

export function createNorthPole(scene, snowMaterial) {
  const batch = new StaticBatch();
  const red = standard(0xad2c31, { roughness: .45 });
  const white = standard(0xf5eee0, { roughness: .6 });
  const brass = standard(0xc99447, { metalness: .72, roughness: .32 });
  batch.cylinder(.43, .58, .3, snowMaterial, [0, .1, 0]);
  for (let i = 0; i < 13; i++) {
    batch.cylinder(.115, .115, .3, i % 2 ? white : red, [0, .35 + i * .3, 0]);
  }
  batch.sphere(.2, brass, [0, 4.26, 0]);
  batch.box(2.35, .95, .18, brass, [0, 3.54, .13]);
  batch.add(new THREE.PlaneGeometry(2.22, .84), new THREE.MeshStandardMaterial({
    map: createSignTexture('90° N', 'DE NOORDPOOL'), roughness: .6,
  }), [0, 3.54, .23]);
  batch.box(2.45, .12, .29, snowMaterial, [0, 4.04, .13]);
  const pole = batch.build(); pole.position.set(5.7, 0, 6.1); pole.rotation.y = .25; scene.add(pole);
  return pole;
}

export function createGift(scene, snowMaterial) {
  const root = new THREE.Group();
  root.position.set(3.5, 0, 7.2); root.rotation.y = -.13;
  const red = standard(0x9c202d, { roughness: .28, metalness: .16 });
  const redInside = standard(0x4c1522, { roughness: .8 });
  const gold = standard(0xe9bd65, { metalness: .7, roughness: .24 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffdc92, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const width = 1.9, height = 1.55, depth = 1.8;
  const clickable = [];
  const add = (geometry, material, position, parent = root) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.isGift = true;
    parent.add(mesh); clickable.push(mesh); return mesh;
  };
  // Four separate walls make an actual open box when the lid hinges back.
  add(new THREE.BoxGeometry(width, .15, depth), redInside, [0, .2, 0]);
  add(new THREE.BoxGeometry(width, height, .12), red, [0, height / 2 + .15, depth / 2]);
  add(new THREE.BoxGeometry(width, height, .12), red, [0, height / 2 + .15, -depth / 2]);
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(.12, height, depth), red, [side * width / 2, height / 2 + .15, 0]);
  add(new THREE.BoxGeometry(.27, height + .015, depth + .14), gold, [0, height / 2 + .15, 0]);
  add(new THREE.BoxGeometry(width + .14, height + .015, .27), gold, [0, height / 2 + .15, 0]);
  // Hide the cross that would otherwise cut the inside: ribbon is on the outside only.
  const cross1 = root.children[root.children.length - 2], cross2 = root.children[root.children.length - 1];
  root.remove(cross1, cross2); clickable.splice(clickable.indexOf(cross1), 2);
  cross1.geometry.dispose(); cross2.geometry.dispose();
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(.27, height + .02, .025), gold, [0, height / 2 + .15, side * (depth / 2 + .065)]);
    add(new THREE.BoxGeometry(.025, height + .02, .27), gold, [side * (width / 2 + .065), height / 2 + .15, 0]);
  }
  const pivot = new THREE.Group(); pivot.position.set(0, height + .2, -depth / 2); root.add(pivot);
  const lid = add(new THREE.BoxGeometry(width + .2, .25, depth + .2), red, [0, .02, depth / 2], pivot);
  add(new THREE.BoxGeometry(.28, .27, depth + .22), gold, [0, .02, depth / 2], pivot);
  add(new THREE.BoxGeometry(width + .22, .27, .28), gold, [0, .02, depth / 2], pivot);
  for (const side of [-1, 1]) {
    const bow = add(new THREE.TorusGeometry(.28, .065, 8, 24), gold, [side * .26, .29, depth / 2], pivot);
    bow.rotation.set(Math.PI / 2, side * .45, side * .3); bow.scale.set(1.2, .75, 1);
  }
  add(new THREE.SphereGeometry(.13, 14, 10), gold, [0, .28, depth / 2], pivot);
  const innerGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.6), glowMaterial);
  innerGlow.rotation.x = -Math.PI / 2; innerGlow.position.y = .37; root.add(innerGlow);
  const giftLight = new THREE.PointLight(0xffcb7e, 0, 9, 2); giftLight.position.set(0, 2.05, 0); root.add(giftLight);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createSoftParticleTexture(), color: 0xffcb74, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.position.y = 1.6; halo.scale.set(4, 4, 1); root.add(halo);

  // A paper tag hangs on the front of the present.
  const tag = add(new THREE.PlaneGeometry(.75, .35), new THREE.MeshStandardMaterial({
    map: createSignTexture('VOOR JOU', ''), roughness: .9, side: THREE.DoubleSide,
  }), [.5, 1.25, 1.005]);
  tag.rotation.z = -.17;
  const pedestal = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12), snowMaterial);
  pedestal.position.set(0, -.03, 0); pedestal.scale.set(1.6, .19, 1.45); root.add(pedestal);

  const sparkleCount = 64;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleSeeds = [];
  const random = seededRandom(791);
  for (let i = 0; i < sparkleCount; i++) sparkleSeeds.push({ angle: random() * TAU, speed: .5 + random(), phase: random(), radius: random() });
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
  const sparkleMaterial = new THREE.PointsMaterial({
    color: 0xffd187, size: .09, map: createSoftParticleTexture(), transparent: true,
    opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial); sparkles.frustumCulled = false; root.add(sparkles);
  scene.add(root);
  let openness = 0, opened = false;
  return {
    root, clickable, position: root.position.clone(),
    setOpen(value) { opened = value; },
    update(time, delta, reducedMotion = false) {
      const target = opened ? 1 : 0;
      openness = THREE.MathUtils.damp(openness, target, reducedMotion ? 8 : 3.7, delta);
      pivot.rotation.x = -openness * Math.PI * .68;
      giftLight.intensity = openness * (15 + Math.sin(time * 2) * 1.5);
      glowMaterial.opacity = openness * .9;
      halo.material.opacity = openness * .5;
      sparkleMaterial.opacity = openness;
      for (let i = 0; i < sparkleCount; i++) {
        const seed = sparkleSeeds[i];
        const phase = (time * (reducedMotion ? .07 : .22) * seed.speed + seed.phase) % 1;
        const radius = .18 + seed.radius * phase * 1.5;
        sparklePositions[i * 3] = Math.cos(seed.angle + time * .2) * radius;
        sparklePositions[i * 3 + 1] = .8 + phase * 3.1;
        sparklePositions[i * 3 + 2] = Math.sin(seed.angle + time * .2) * radius;
      }
      sparkleGeometry.attributes.position.needsUpdate = true;
      lid.material.emissive.setHex(opened ? 0x280608 : 0x000000);
    },
  };
}

function tubeFromPoints(points, radius, material, segments = 24) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, 6, false), material);
}

export function createSleigh(scene) {
  const root = new THREE.Group();
  const red = standard(0xa63137, { metalness: .15, roughness: .45 });
  const gold = standard(0xe4b65e, { metalness: .6, roughness: .35 });
  const leather = standard(0x301e20, { roughness: .7 });
  const fur = standard(0x84523b);
  const darkFur = standard(0x50352b);
  const cream = standard(0xe2c5a0);
  const white = standard(0xf6eadb);
  const batch = new StaticBatch();
  batch.box(2.4, .3, 1.3, red, [-.8, .45, 0]);
  batch.box(.28, .9, 1.4, red, [-1.9, .85, 0]);
  batch.box(1.8, .25, 1.15, leather, [-.9, .85, 0]);
  for (const side of [-1, 1]) {
    batch.box(2.3, .6, .12, red, [-.8, .8, side * .67]);
    batch.box(2.4, .08, .15, gold, [-.8, 1.1, side * .67]);
    batch.cylinder(.045, .045, .65, gold, [-1.55, .2, side * .56]);
    batch.cylinder(.045, .045, .65, gold, [.1, .2, side * .56]);
  }
  // Tiny Santa silhouette: coat, white trim, face, beard and cap.
  batch.sphere(.37, red, [-.15, 1.25, 0], [.85, 1.15, 1]);
  batch.sphere(.23, cream, [-.05, 1.85, 0]);
  batch.sphere(.19, white, [.1, 1.73, 0], [.65, 1.1, 1]);
  batch.add(new THREE.ConeGeometry(.26, .5, 14), red, [-.1, 2.13, 0], [0, 0, .35]);
  batch.sphere(.085, white, [-.21, 2.38, 0]);
  batch.sphere(.46, standard(0x806348), [-1.3, 1.2, -.07], [1, 1.3, 1]);
  const reindeerPositions = [[2, .7, -.8], [2, .7, .8], [4.2, .7, -.8], [4.2, .7, .8]];
  reindeerPositions.forEach(([x, y, z], index) => {
    batch.sphere(.43, fur, [x, y, z], [1.3, .7, .55]);
    batch.sphere(.23, fur, [x + .43, y + .45, z], [.7, 1.35, .8]);
    batch.sphere(.21, fur, [x + .62, y + .66, z], [1.1, .7, .7]);
    batch.sphere(.065, index === 3 ? red : darkFur, [x + .83, y + .65, z]);
    for (const side of [-1, 1]) {
      batch.sphere(.13, fur, [x + .51, y + .87, z + side * .17], [.5, 1, .45]);
      batch.cylinder(.028, .04, .52, cream, [x + .39, y + 1.08, z + side * .12], [side * .15, 0, -.35]);
      batch.cylinder(.022, .027, .28, cream, [x + .5, y + 1.15, z + side * .23], [side * .9, 0, .6]);
      batch.cylinder(.05, .065, .64, darkFur, [x - .3, y - .4, z + side * .18], [0, 0, -.45]);
      batch.cylinder(.045, .055, .59, darkFur, [x + .3, y - .4, z + side * .18], [0, 0, .55]);
      batch.sphere(.075, leather, [x + .46, y - .63, z + side * .18]);
    }
    batch.box(.12, .61, .56, red, [x + .02, y, z]);
  });
  root.add(batch.build());
  for (const side of [-1, 1]) {
    root.add(tubeFromPoints([[-2.2, -.12, side * .65], [-1.4, -.28, side * .65], [.35, -.26, side * .65], [.95, -.06, side * .65], [1, .45, side * .65], [.73, .5, side * .65]], .045, gold));
    root.add(tubeFromPoints([[.05, 1.4, side * .2], [1.25, .85, side * .55], [3, 1.1, side * .8], [4.6, 1.35, side * .8]], .015, leather));
  }
  root.scale.setScalar(.65); scene.add(root);
  return {
    update(time, reducedMotion) {
      const t = time * (reducedMotion ? .012 : .035) + .65;
      root.position.set(Math.sin(t) * 22, 12.5 + Math.sin(time * .45) * .4, -22 - Math.cos(t) * 7);
      root.rotation.y = -Math.atan2(-Math.sin(t) * 7, Math.cos(t) * 22);
      root.rotation.z = Math.sin(time * .45) * .025;
    },
  };
}
