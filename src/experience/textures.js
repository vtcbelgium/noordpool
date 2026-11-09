import * as THREE from 'three';

// Everything is generated locally: the experience works without image downloads.
export function canvasTexture(width, height, paint, colorSpace = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWoodTexture() {
  const texture = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#70402c';
    ctx.fillRect(0, 0, w, h);
    let seed = 741;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 300; i++) {
      const y = random() * h;
      ctx.strokeStyle = `rgba(${random() > .5 ? '184,123,72' : '38,19,15'},${.05 + random() * .16})`;
      ctx.lineWidth = .5 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * .3, y + random() * 10, w * .7, y - random() * 10, w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = random() * w, y = random() * h;
      ctx.strokeStyle = '#432a2077';
      for (let ring = 1; ring < 5; ring++) {
        ctx.beginPath(); ctx.ellipse(x, y, ring * 6, ring * 1.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.anisotropy = 4;
  return texture;
}

export function createSnowTexture() {
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    let seed = 173;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = 220 + (seed % 36);
      data.data[i] = n; data.data[i + 1] = n; data.data[i + 2] = n; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  }, false);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(26, 26);
  return texture;
}

export function createSoftParticleTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.18, 'rgba(255,255,255,.95)');
    gradient.addColorStop(.5, 'rgba(255,255,255,.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  });
}

export function createSignTexture(title, subtitle, dark = false) {
  return canvasTexture(1024, 320, (ctx, w, h) => {
    ctx.fillStyle = dark ? '#193b35' : '#f2e9cf';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = dark ? '#d6b66a' : '#922b29';
    ctx.lineWidth = 12;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = dark ? '#d6b66a77' : '#922b2955';
    ctx.lineWidth = 3;
    ctx.strokeRect(29, 29, w - 58, h - 58);
    ctx.fillStyle = dark ? '#fff0c4' : '#822528';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 79px Georgia, serif';
    ctx.fillText(title, w / 2, subtitle ? 126 : 160, w - 90);
    if (subtitle) {
      ctx.font = '29px Arial, sans-serif';
      ctx.fillText(subtitle, w / 2, 225, w - 100);
    }
  });
}

export function createMoonTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f0f0dc'; ctx.fillRect(0, 0, w, h);
    let seed = 42;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 95; i++) {
      const x = random() * w, y = random() * h, r = 3 + random() * 28;
      const g = ctx.createRadialGradient(x - r * .2, y - r * .2, 0, x, y, r);
      g.addColorStop(0, 'rgba(108,123,130,.22)');
      g.addColorStop(.8, 'rgba(126,140,146,.12)');
      g.addColorStop(1, 'rgba(240,240,225,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}
