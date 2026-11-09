import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createLandscape, createSky } from './world.js';
import { createWorkshop, createTrees, createNorthPole, createGift, createSleigh } from './models.js';
import { createAurora, createSnowfall, createChimneySmoke } from './effects.js';

const DEFAULT_POSITION = new THREE.Vector3(17.8, 11.4, 26.5);
const DEFAULT_TARGET = new THREE.Vector3(-2.2, 3.4, -1.4);

/** Owns the scene and its event listeners; all page UI remains ordinary HTML. */
export class NorthPoleExperience {
  constructor({ canvas, onStats = () => {}, onGiftChange = () => {}, onError = () => {} }) {
    this.canvas = canvas;
    this.onStats = onStats;
    this.onGiftChange = onGiftChange;
    this.onError = onError;
    this.disposed = false;
    this.failed = false;
    this.giftOpen = false;
    this.elapsed = 0;
    this.quality = 'auto';
    this.effectiveQuality = 'high';
    this.frames = 0;
    this.statsElapsed = 0;
    this.autoQualityElapsed = 0;
    this.lowFpsWindows = 0;
    this.lastTime = null;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.pointerDown = null;
    this.cameraTransition = null;
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.reducedMotionQuery.matches;
    this.handleReducedMotion = (event) => { this.reducedMotion = event.matches; };
    this.handleVisibility = () => { this.lastTime = null; };
    this.handleResize = () => this.resize();
    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerCancel = () => { this.pointerDown = null; this.canvas.style.cursor = 'grab'; };
    this.handlePointerLeave = () => { this.canvas.style.cursor = 'grab'; };
    this.handleContextLost = (event) => {
      event.preventDefault();
      this.reportError(new Error('De 3D-weergave is onderbroken. Vernieuw de pagina om opnieuw te beginnen.'));
    };
    this.handleControlsStart = () => { this.cameraTransition = null; };
    this.tick = this.tick.bind(this);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setClearColor(0x061221);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.debug.onShaderError = () => {
        this.reportError(new Error('De grafische effecten konden niet worden geladen. Probeer de pagina opnieuw te openen.'));
      };
      // Keep totals across composer passes so the performance display is useful.
      this.renderer.info.autoReset = false;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x061221);
      this.scene.fog = new THREE.FogExp2(0x132c43, .0095);
      this.camera = new THREE.PerspectiveCamera(45, 1, .1, 220);
      this.camera.position.copy(DEFAULT_POSITION);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.target.copy(DEFAULT_TARGET);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = .065;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 63;
      this.controls.minPolarAngle = .25;
      this.controls.maxPolarAngle = Math.PI / 2 - .045;
      this.controls.enablePan = true;
      this.controls.panSpeed = .55;
      this.controls.rotateSpeed = .55;
      this.controls.zoomSpeed = .75;
      this.controls.update();
      this.controls.addEventListener('start', this.handleControlsStart);

      const { snowMaterial } = createLandscape(this.scene);
      this.sky = createSky(this.scene);
      const workshop = createWorkshop(this.scene, snowMaterial);
      this.trees = createTrees(this.scene, snowMaterial);
      createNorthPole(this.scene, snowMaterial);
      this.gift = createGift(this.scene, snowMaterial);
      this.sleigh = createSleigh(this.scene);
      this.aurora = createAurora(this.scene);
      this.snow = createSnowfall(this.scene);
      this.smoke = createChimneySmoke(this.scene, workshop.chimney);

      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .22, .5, 1.6);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.applyQuality('high');

      canvas.style.touchAction = 'none';
      canvas.style.cursor = 'grab';
      canvas.addEventListener('pointerdown', this.handlePointerDown);
      canvas.addEventListener('pointerup', this.handlePointerUp);
      canvas.addEventListener('pointermove', this.handlePointerMove);
      canvas.addEventListener('pointercancel', this.handlePointerCancel);
      canvas.addEventListener('pointerleave', this.handlePointerLeave);
      canvas.addEventListener('webglcontextlost', this.handleContextLost);
      window.addEventListener('resize', this.handleResize);
      document.addEventListener('visibilitychange', this.handleVisibility);
      this.reducedMotionQuery.addEventListener('change', this.handleReducedMotion);
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(canvas);
      this.resize();
      this.raf = requestAnimationFrame(this.tick);
    } catch (error) {
      this.reportError(error);
    }
  }

  reportError(error) {
    if (this.failed || this.disposed) return;
    this.failed = true;
    cancelAnimationFrame(this.raf);
    console.error('North Pole rendering error:', error);
    this.onError(error);
  }

  resize() {
    if (!this.renderer || !this.camera || this.disposed) return;
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.camera.aspect = width / height;
    // Preserve the cabin and foreground gift together on a narrow phone.
    this.camera.fov = width / height < .85 ? 59 : 45;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
  }

  setSnow(enabled) { this.snow?.setVisible(Boolean(enabled)); }
  setAurora(enabled) { this.aurora?.setVisible(Boolean(enabled)); }

  setQuality(quality) {
    if (!['auto', 'high', 'low'].includes(quality)) return;
    this.quality = quality;
    this.lowFpsWindows = 0;
    this.autoQualityElapsed = 0;
    const mobile = this.canvas.getBoundingClientRect().width < 760;
    this.applyQuality(quality === 'auto' ? (mobile ? 'low' : 'high') : quality);
  }

  applyQuality(quality) {
    if (!this.renderer || this.disposed) return;
    this.effectiveQuality = quality;
    const low = quality === 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
    if (this.bloom) this.bloom.enabled = !low;
    this.snow?.setLowQuality(low);
    if (this.sky) {
      const shadow = this.sky.moonlight.shadow;
      const mapSize = low ? 1024 : 2048;
      if (shadow.mapSize.width !== mapSize) {
        shadow.mapSize.set(mapSize, mapSize);
        shadow.map?.dispose(); shadow.map = null;
      }
    }
    if (this.composer) this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.resize();
  }

  resetView() {
    this.transitionCamera(DEFAULT_POSITION, DEFAULT_TARGET);
  }

  focusGift() {
    if (!this.gift) return;
    const target = this.gift.position.clone().add(new THREE.Vector3(0, 1.05, 0));
    const position = target.clone().add(new THREE.Vector3(5.8, 4, 7.6));
    this.transitionCamera(position, target);
  }

  transitionCamera(position, target) {
    if (!this.camera || this.disposed) return;
    this.cameraTransition = {
      from: this.camera.position.clone(), to: position.clone(),
      fromTarget: this.controls.target.clone(), toTarget: target.clone(),
      elapsed: 0, duration: this.reducedMotion ? .15 : 1.6,
    };
  }

  toggleGift() {
    if (!this.gift || this.disposed || this.failed) return;
    this.giftOpen = !this.giftOpen;
    this.gift.setOpen(this.giftOpen);
    this.onGiftChange(this.giftOpen);
  }

  giftAt(event) {
    if (!this.gift || !this.camera) return false;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.gift.clickable, false).length > 0;
  }

  onPointerDown(event) {
    if (!event.isPrimary) {
      if (this.pointerDown) this.pointerDown.moved = true;
      return;
    }
    if (event.button !== 0) return;
    this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId, moved: false };
  }

  onPointerMove(event) {
    if (this.pointerDown) {
      if (Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y) > 6) this.pointerDown.moved = true;
      this.canvas.style.cursor = this.pointerDown.moved ? 'grabbing' : 'grab';
    } else {
      this.canvas.style.cursor = this.giftAt(event) ? 'pointer' : 'grab';
    }
  }

  onPointerUp(event) {
    const down = this.pointerDown; this.pointerDown = null;
    if (!down || event.pointerId !== down.id) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (!down.moved && moved <= 6 && performance.now() - down.time < 700 && this.giftAt(event)) this.toggleGift();
    this.canvas.style.cursor = this.giftAt(event) ? 'pointer' : 'grab';
  }

  tick(now) {
    if (this.disposed || this.failed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (document.hidden) { this.lastTime = null; return; }
    const realDelta = this.lastTime === null ? 1 / 60 : Math.max((now - this.lastTime) / 1000, .001);
    const delta = Math.min(realDelta, .08);
    this.lastTime = now;
    this.elapsed += delta;
    try {
      if (this.cameraTransition) {
        const transition = this.cameraTransition;
        transition.elapsed += delta;
        const fraction = Math.min(transition.elapsed / transition.duration, 1);
        const smooth = fraction * fraction * (3 - 2 * fraction);
        this.camera.position.lerpVectors(transition.from, transition.to, smooth);
        this.controls.target.lerpVectors(transition.fromTarget, transition.toTarget, smooth);
        if (fraction === 1) this.cameraTransition = null;
      }
      this.controls.update();
      this.trees.update(this.elapsed);
      this.aurora.update(this.elapsed, this.reducedMotion);
      this.snow.update(this.elapsed, delta, this.reducedMotion);
      this.smoke.update(this.elapsed, this.reducedMotion);
      this.gift.update(this.elapsed, delta, this.reducedMotion);
      this.sleigh.update(this.elapsed, this.reducedMotion);
      this.renderer.info.reset();
      this.composer.render(delta);
      this.updateStats(realDelta);
    } catch (error) { this.reportError(error); }
  }

  updateStats(delta) {
    this.frames++;
    this.statsElapsed += delta;
    this.autoQualityElapsed += delta;
    if (this.statsElapsed < 1) return;
    const fps = Math.round(this.frames / this.statsElapsed);
    this.onStats({
      fps, drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles, quality: this.effectiveQuality,
    });
    if (this.quality === 'auto' && this.effectiveQuality === 'high' && this.autoQualityElapsed > 5) {
      this.lowFpsWindows = fps < 48 ? this.lowFpsWindows + 1 : 0;
      if (this.lowFpsWindows >= 3) this.applyQuality('low');
    }
    this.frames = 0; this.statsElapsed = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.reducedMotionQuery.removeEventListener('change', this.handleReducedMotion);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.style.cursor = '';
    this.controls?.removeEventListener('start', this.handleControlsStart);
    this.controls?.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene?.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (const material of list) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
      if (object.isLight && object.shadow) object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    this.composer?.passes.forEach((pass) => pass.dispose?.());
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}
