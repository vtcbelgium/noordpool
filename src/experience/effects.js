import * as THREE from 'three';
import { createSoftParticleTexture } from './textures.js';
import { seededRandom } from './world.js';

export function createAurora(scene) {
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: .65 }, uOffset: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      uniform float uOffset;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin(uv.x * 10.0 + uTime * .19 + uOffset) * 2.7;
        wave += sin(uv.x * 24.0 - uTime * .12 + uOffset) * .7;
        p.y += wave + sin(uv.x * 5.0 + uOffset) * 3.0;
        p.z += sin(uv.x * 13.0 + uTime * .13 + uOffset) * 4.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uOffset;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
      }
      void main() {
        float x = vUv.x;
        float flow = noise(vec2(x * 7.0 + uTime * .025, uOffset + uTime * .035));
        float folds = .48 + .52 * sin(x * 155.0 + flow * 15.0 + sin(x * 43.0 - uTime * .22) * 2.0);
        float fine = .55 + .45 * noise(vec2(x * 270.0 + flow * 2.0, vUv.y * 1.3 - uTime * .12));
        float bottom = .10 + sin(x * 12.0 + uTime * .12 + uOffset) * .035;
        float lower = smoothstep(bottom, bottom + .065, vUv.y);
        float upper = pow(max(0.0, 1.0 - vUv.y), 1.9);
        float edges = smoothstep(0.0, .13, x) * (1.0 - smoothstep(.86, 1.0, x));
        float broad = .45 + .55 * noise(vec2(x * 9.0 + uTime * .03, uOffset));
        float intensity = lower * upper * edges * broad * (.2 + folds * .8) * fine;
        vec3 green = vec3(.16, .95, .56);
        vec3 cyan = vec3(.12, .61, .88);
        vec3 violet = vec3(.57, .23, .78);
        vec3 color = mix(green, cyan, smoothstep(.12, .55, vUv.y));
        color = mix(color, violet, smoothstep(.35, .9, vUv.y));
        float rim = exp(-pow((vUv.y - bottom - .07) * 26.0, 2.0));
        color += vec3(.12, .22, .08) * rim;
        gl_FragColor = vec4(color, intensity * uOpacity);
      }
    `,
  });
  const geometry = new THREE.PlaneGeometry(130, 32, 200, 20);
  const curtains = [];
  for (let i = 0; i < 3; i++) {
    const auroraMaterial = i === 0 ? material : material.clone();
    auroraMaterial.uniforms.uOffset.value = i * 4.19;
    auroraMaterial.uniforms.uOpacity.value = i === 0 ? .8 : .4;
    const curtain = new THREE.Mesh(geometry, auroraMaterial);
    curtain.position.set((i - 1) * 9, 21 + i * 4, -63 - i * 14);
    curtain.rotation.z = .025 + i * .025;
    curtain.frustumCulled = false;
    curtain.renderOrder = -5 + i;
    group.add(curtain); curtains.push(curtain);
  }
  scene.add(group);
  return {
    setVisible(enabled) { group.visible = enabled; },
    update(time, reducedMotion) {
      curtains.forEach((curtain) => { curtain.material.uniforms.uTime.value = time * (reducedMotion ? .18 : 1); });
    },
  };
}

export function createSnowfall(scene) {
  const random = seededRandom(8831);
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - .5) * 72;
    positions[i * 3 + 1] = random() * 32;
    positions[i * 3 + 2] = (random() - .5) * 64;
    speeds[i] = .45 + random() * .95;
    phases[i] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xe5f4ff, size: .115, map: createSoftParticleTexture(), transparent: true,
    opacity: .8, depthWrite: false, sizeAttenuation: true, fog: true,
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; scene.add(points);
  let activeCount = count;
  return {
    setVisible(enabled) { points.visible = enabled; },
    setLowQuality(low) { activeCount = low ? 1100 : count; geometry.setDrawRange(0, activeCount); },
    update(time, delta, reducedMotion) {
      if (!points.visible) return;
      const movement = reducedMotion ? .35 : 1;
      for (let i = 0; i < activeCount; i++) {
        positions[i * 3] += (Math.sin(time * .3 + phases[i]) * .16 + .19) * delta * movement;
        positions[i * 3 + 1] -= speeds[i] * delta * movement;
        positions[i * 3 + 2] += Math.cos(time * .22 + phases[i]) * .09 * delta * movement;
        if (positions[i * 3 + 1] < -.1) positions[i * 3 + 1] = 32;
        if (positions[i * 3] > 36) positions[i * 3] = -36;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

export function createChimneySmoke(scene, chimney) {
  const count = 15;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: createSoftParticleTexture(), color: 0x7b91a2, size: 1.5,
    transparent: true, opacity: .15, depthWrite: false, sizeAttenuation: true,
  });
  const smoke = new THREE.Points(geometry, material);
  smoke.position.copy(chimney); smoke.frustumCulled = false; scene.add(smoke);
  return {
    update(time, reducedMotion) {
      for (let i = 0; i < count; i++) {
        const t = ((time * (reducedMotion ? .035 : .12) + i / count) % 1);
        positions[i * 3] = t * 3.3 + Math.sin(t * 11 + i) * .12;
        positions[i * 3 + 1] = t * 6;
        positions[i * 3 + 2] = Math.sin(t * 5 + i) * t * .5;
      }
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
