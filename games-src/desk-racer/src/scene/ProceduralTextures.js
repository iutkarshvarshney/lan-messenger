import * as THREE from 'three';

/**
 * Generates high-definition procedural Canvas PBR textures for the
 * Golden-Hour 1:87 Micro-Coaster Desk Diorama, while also supporting
 * optional external textures from /assets/textures/.
 */
export function createOakWoodTextures() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Rich warm medium honey-walnut/oak base gradient (zero harsh lines or plank seams)
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0.0, '#96633b');
  baseGrad.addColorStop(0.35, '#9d6a40');
  baseGrad.addColorStop(0.7, '#8f5d36');
  baseGrad.addColorStop(1.0, '#855530');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft organic micro-grain variation without harsh lines
  for (let i = 0; i < 240; i++) {
    const fy = (i * 83) % height;
    const hBand = 16 + (i % 24);
    const alpha = 0.012 + (i % 5) * 0.003;
    ctx.fillStyle = i % 2 === 0 ? `rgba(60, 34, 14, ${alpha})` : `rgba(185, 130, 82, ${alpha})`;
    ctx.fillRect(0, fy, width, hBand);
  }

  // Bump/Roughness companion canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.drawImage(canvas, 0, 0, 1024, 512);

  const colorTex = new THREE.CanvasTexture(canvas);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.wrapS = THREE.RepeatWrapping;
  colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.anisotropy = 8;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;

  return { colorTex, bumpTex };
}

export function createAsphaltRoadTexture() {
  const w = 256;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Dark slate micro-asphalt base
  ctx.fillStyle = '#1e2128';
  ctx.fillRect(0, 0, w, h);

  // Darker rubberized racing groove in center 45% of width
  const grooveGrad = ctx.createLinearGradient(0, 0, w, 0);
  grooveGrad.addColorStop(0.0, 'rgba(42, 46, 56, 0.5)');
  grooveGrad.addColorStop(0.25, 'rgba(20, 22, 28, 0.7)');
  grooveGrad.addColorStop(0.5, 'rgba(14, 16, 21, 0.85)');
  grooveGrad.addColorStop(0.75, 'rgba(20, 22, 28, 0.7)');
  grooveGrad.addColorStop(1.0, 'rgba(42, 46, 56, 0.5)');
  ctx.fillStyle = grooveGrad;
  ctx.fillRect(0, 0, w, h);

  // Fine aggregate speckle
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % w;
    const y = (i * 199) % h;
    const v = 24 + (i % 34);
    ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Warm yellow racing edge lines on left and right margins
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(12, 0, 5, h);
  ctx.fillRect(w - 17, 0, 5, h);

  // Crisp dashed white centerline
  ctx.fillStyle = 'rgba(240, 245, 255, 0.78)';
  for (let y = 0; y < h; y += 64) {
    ctx.fillRect(w / 2 - 2, y + 8, 4, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 56);
  tex.anisotropy = 8;
  return tex;
}

export function createMonitorScreenTexture() {
  const w = 1024;
  const h = 576;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Deep midnight-blue & golden-hour sunset gradient wallpaper
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0.0, '#070c1a');
  bg.addColorStop(0.45, '#0b1833');
  bg.addColorStop(0.8, '#1b2442');
  bg.addColorStop(1.0, '#30222b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle perspective grid on lower screen
  ctx.strokeStyle = 'rgba(30, 107, 255, 0.22)';
  ctx.lineWidth = 1.5;
  for (let y = 320; y < h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = -200; x <= w + 200; x += 64) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + (x - w / 2) * 0.25, 320);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Glowing electric-blue audio spectrum bars (matching the podcasting mic!)
  for (let i = 0; i < 48; i++) {
    const bx = 140 + i * 15.5;
    const bh = 22 + Math.sin(i * 0.42) * 48 + Math.cos(i * 0.95) * 28;
    const barGrad = ctx.createLinearGradient(0, 290 - bh, 0, 290);
    barGrad.addColorStop(0, '#5ce1ff');
    barGrad.addColorStop(0.5, '#1e6bff');
    barGrad.addColorStop(1, 'rgba(30, 107, 255, 0.15)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, 290 - bh, 9, bh);
  }

  // IDE / Telemetry window header
  ctx.fillStyle = 'rgba(12, 19, 36, 0.82)';
  ctx.strokeStyle = 'rgba(76, 194, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.fillRect(70, 52, 884, 135);
  ctx.strokeRect(70, 52, 884, 135);

  ctx.fillStyle = '#ffaa44';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('LG ULTRAGEAR 27" • 1:87 HO MICRO-COASTER TELEMETRY', 98, 96);

  ctx.fillStyle = '#7cd4ff';
  ctx.font = '18px monospace';
  ctx.fillText('SPLINE: 720 PERIODIC C² SAMPLES | LENGTH: 3.837m (333.8m @ 1:87)', 98, 132);
  ctx.fillStyle = '#a8b8d0';
  ctx.fillText('SECTORS: [1] BOYATA CLIMB [2] CAT 360° HELIX [3] #1E6BFF MIC [4] LAMP SPIRAL', 98, 164);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCheckeredGantryTexture() {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, w, h);

  // Checkered strips on left and right
  const sq = 16;
  for (let r = 0; r < h / sq; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#14171f';
      ctx.fillRect(c * sq, r * sq, sq, sq);
      ctx.fillRect(w - (c + 1) * sq, r * sq, sq, sq);
    }
  }

  // Center banner text
  ctx.fillStyle = '#ffaa44';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('START • FINISH', w / 2, 54);
  ctx.fillStyle = '#5ce1ff';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('1:87 MICRO-COASTER GRAND PRIX', w / 2, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
