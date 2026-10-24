import * as THREE from 'three';
import {
  createOakWoodTextures,
  createMonitorScreenTexture,
} from './ProceduralTextures.js';
import {
  calibrateTrackCoasterGlb,
  sharedUnderTrackUniforms,
} from './CoasterTrackBuilder.js';

let cachedDeskV4Textures = null;
let deskExternalUpgraded = false;

/**
 * Safely upgrades a CanvasTexture in-place if any of the candidate PNG URLs exist
 * (ignoring Vite SPA text/html fallback responses).
 */
function upgradeDeskTextureIfPresent(targetTex, urls, isSRGB = false) {
  const urlList = Array.isArray(urls) ? urls : [urls];
  (async () => {
    for (const url of urlList) {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (!head.ok) continue;
        const ct = head.headers.get('content-type') || '';
        if (ct.includes('text/html')) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        targetTex.dispose();
        targetTex.image = img;
        if (isSRGB) {
          targetTex.colorSpace = THREE.SRGBColorSpace;
        }
        targetTex.needsUpdate = true;
        return;
      } catch {
        // Keep procedural fallback canvas
      }
    }
  })();
}

/**
 * Generates procedural fallback normal/roughness/albedo maps for V4 Oak Wood and
 * Open-Cell Acoustic Microphone Foam, and optionally loads the 2K PNGs from /assets/textures/.
 */
function getDeskV4PBRTextures(upgradeExternal = false) {
  if (cachedDeskV4Textures) {
    if (upgradeExternal && !deskExternalUpgraded) {
      deskExternalUpgraded = true;
      upgradeDeskTextureIfPresent(
        cachedDeskV4Textures.oakWoodAlbedoTex,
        ['/games/desk-racer/assets/textures/oak_wood_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_4k.png?v=5.3'],
        true
      );
      upgradeDeskTextureIfPresent(
        cachedDeskV4Textures.oakWoodNormalTex,
        ['/games/desk-racer/assets/textures/oak_wood_normal_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_normal.png?v=5.3'],
        false
      );
      upgradeDeskTextureIfPresent(
        cachedDeskV4Textures.oakWoodRoughnessTex,
        ['/games/desk-racer/assets/textures/oak_wood_roughness_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_roughness.png?v=5.3'],
        false
      );
      upgradeDeskTextureIfPresent(cachedDeskV4Textures.micFoamAlbedoTex, '/games/desk-racer/assets/textures/mic_foam_v4_albedo_2k.png?v=5.2', true);
      upgradeDeskTextureIfPresent(cachedDeskV4Textures.micFoamNormalTex, '/games/desk-racer/assets/textures/mic_foam_v4_normal_2k.png?v=5.2', false);
      upgradeDeskTextureIfPresent(cachedDeskV4Textures.micFoamRoughnessTex, '/games/desk-racer/assets/textures/mic_foam_v4_roughness_2k.png?v=5.2', false);
    }
    return cachedDeskV4Textures;
  }

  // 1. Oak Wood Tangent-Space Normal & Roughness (512x256 procedural fallback -> 2K PNG upgrade)
  const ow = 512;
  const oh = 256;
  const oakNormCanvas = document.createElement('canvas');
  oakNormCanvas.width = ow;
  oakNormCanvas.height = oh;
  const onCtx = oakNormCanvas.getContext('2d');
  const onImg = onCtx.createImageData(ow, oh);
  const onData = onImg.data;

  const oakRoughCanvas = document.createElement('canvas');
  oakRoughCanvas.width = ow;
  oakRoughCanvas.height = oh;
  const orCtx = oakRoughCanvas.getContext('2d');
  const orImg = orCtx.createImageData(ow, oh);
  const orData = orImg.data;

  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const idx = (y * ow + x) * 4;
      const h1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const pore = (h1 - Math.floor(h1)) - 0.5;
      const nx = THREE.MathUtils.clamp(0.5 + pore * 0.04, 0.45, 0.55);
      const ny = THREE.MathUtils.clamp(0.5 + pore * 0.04, 0.45, 0.55);
      onData[idx + 0] = Math.round(nx * 255);
      onData[idx + 1] = Math.round(ny * 255);
      onData[idx + 2] = 254;
      onData[idx + 3] = 255;

      const rough = THREE.MathUtils.clamp(0.68 + pore * 0.06, 0.60, 0.76);
      const rb = Math.round(rough * 255);
      orData[idx + 0] = rb;
      orData[idx + 1] = rb;
      orData[idx + 2] = rb;
      orData[idx + 3] = 255;
    }
  }
  onCtx.putImageData(onImg, 0, 0);
  orCtx.putImageData(orImg, 0, 0);

  const { colorTex: fallbackOakTex } = createOakWoodTextures();
  const oakAlbedoCanvas = fallbackOakTex && fallbackOakTex.image ? fallbackOakTex.image : document.createElement('canvas');

  const oakWoodAlbedoTex = new THREE.CanvasTexture(oakAlbedoCanvas);
  oakWoodAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  oakWoodAlbedoTex.wrapS = THREE.RepeatWrapping;
  oakWoodAlbedoTex.wrapT = THREE.RepeatWrapping;
  oakWoodAlbedoTex.anisotropy = 16;

  const oakWoodNormalTex = new THREE.CanvasTexture(oakNormCanvas);
  oakWoodNormalTex.wrapS = THREE.RepeatWrapping;
  oakWoodNormalTex.wrapT = THREE.RepeatWrapping;
  oakWoodNormalTex.anisotropy = 16;

  const oakWoodRoughnessTex = new THREE.CanvasTexture(oakRoughCanvas);
  oakWoodRoughnessTex.wrapS = THREE.RepeatWrapping;
  oakWoodRoughnessTex.wrapT = THREE.RepeatWrapping;
  oakWoodRoughnessTex.anisotropy = 16;

  // 2. Open-Cell Acoustic Microphone Foam Albedo, Cellular Normal & Roughness (512x512 -> 2K PNG upgrade)
  const fw = 512;
  const fh = 512;
  const foamAlbedoCanvas = document.createElement('canvas');
  foamAlbedoCanvas.width = fw;
  foamAlbedoCanvas.height = fh;
  const faCtx = foamAlbedoCanvas.getContext('2d');
  const faImg = faCtx.createImageData(fw, fh);
  const faData = faImg.data;

  const foamNormCanvas = document.createElement('canvas');
  foamNormCanvas.width = fw;
  foamNormCanvas.height = fh;
  const fnCtx = foamNormCanvas.getContext('2d');
  const fnImg = fnCtx.createImageData(fw, fh);
  const fnData = fnImg.data;

  const foamRoughCanvas = document.createElement('canvas');
  foamRoughCanvas.width = fw;
  foamRoughCanvas.height = fh;
  const frCtx = foamRoughCanvas.getContext('2d');
  const frImg = frCtx.createImageData(fw, fh);
  const frData = frImg.data;

  function cellHeight(px, py) {
    const s1 = Math.sin(px * 0.28 + Math.cos(py * 0.24) * 1.9);
    const s2 = Math.cos(py * 0.31 - Math.sin(px * 0.27) * 1.8);
    const s3 = Math.sin((px + py) * 0.52) * Math.cos((px - py) * 0.48);
    const hHash = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
    const micro = hHash - Math.floor(hHash);
    // Ridged cellular foam network: sharp cell walls around deep dark acoustic pores
    const ridge = Math.abs(s1 * s2) * 0.65 + Math.abs(s3) * 0.25 + micro * 0.10;
    return ridge;
  }

  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const idx = (y * fw + x) * 4;
      const h0 = cellHeight(x, y);
      const hx = cellHeight(x + 1, y);
      const hy = cellHeight(x, y + 1);

      // Charcoal open-cell acoustic foam (#14161b in deep pores -> #282c34 on cell walls)
      const cVal = Math.round(18 + h0 * 24);
      faData[idx + 0] = cVal;
      faData[idx + 1] = cVal + 2;
      faData[idx + 2] = cVal + 6;
      faData[idx + 3] = 255;

      // Strong cellular pore normal slopes
      const dx = (hx - h0) * 2.6;
      const dy = (hy - h0) * 2.6;
      const nx = THREE.MathUtils.clamp(0.5 + dx * 0.5, 0.04, 0.96);
      const ny = THREE.MathUtils.clamp(0.5 + dy * 0.5, 0.04, 0.96);
      fnData[idx + 0] = Math.round(nx * 255);
      fnData[idx + 1] = Math.round(ny * 255);
      fnData[idx + 2] = 235;
      fnData[idx + 3] = 255;

      const rVal = Math.round(THREE.MathUtils.clamp(0.96 - h0 * 0.05, 0.88, 0.99) * 255);
      frData[idx + 0] = rVal;
      frData[idx + 1] = rVal;
      frData[idx + 2] = rVal;
      frData[idx + 3] = 255;
    }
  }
  faCtx.putImageData(faImg, 0, 0);
  fnCtx.putImageData(fnImg, 0, 0);
  frCtx.putImageData(frImg, 0, 0);

  const micFoamAlbedoTex = new THREE.CanvasTexture(foamAlbedoCanvas);
  micFoamAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  micFoamAlbedoTex.wrapS = THREE.RepeatWrapping;
  micFoamAlbedoTex.wrapT = THREE.RepeatWrapping;
  micFoamAlbedoTex.repeat.set(1, 1);
  micFoamAlbedoTex.anisotropy = 8;

  const micFoamNormalTex = new THREE.CanvasTexture(foamNormCanvas);
  micFoamNormalTex.wrapS = THREE.RepeatWrapping;
  micFoamNormalTex.wrapT = THREE.RepeatWrapping;
  micFoamNormalTex.repeat.set(1, 1);
  micFoamNormalTex.anisotropy = 8;

  const micFoamRoughnessTex = new THREE.CanvasTexture(foamRoughCanvas);
  micFoamRoughnessTex.wrapS = THREE.RepeatWrapping;
  micFoamRoughnessTex.wrapT = THREE.RepeatWrapping;
  micFoamRoughnessTex.repeat.set(1, 1);
  micFoamRoughnessTex.anisotropy = 8;

  if (upgradeExternal) {
    deskExternalUpgraded = true;
    upgradeDeskTextureIfPresent(
      oakWoodAlbedoTex,
      ['/games/desk-racer/assets/textures/oak_wood_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_4k.png?v=5.3'],
      true
    );
    upgradeDeskTextureIfPresent(
      oakWoodNormalTex,
      ['/games/desk-racer/assets/textures/oak_wood_normal_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_normal.png?v=5.3'],
      false
    );
    upgradeDeskTextureIfPresent(
      oakWoodRoughnessTex,
      ['/games/desk-racer/assets/textures/oak_wood_roughness_2k.png?v=5.3', '/games/desk-racer/assets/textures/oak_wood_roughness.png?v=5.3'],
      false
    );
    upgradeDeskTextureIfPresent(micFoamAlbedoTex, '/games/desk-racer/assets/textures/mic_foam_v4_albedo_2k.png?v=5.2', true);
    upgradeDeskTextureIfPresent(micFoamNormalTex, '/games/desk-racer/assets/textures/mic_foam_v4_normal_2k.png?v=5.2', false);
    upgradeDeskTextureIfPresent(micFoamRoughnessTex, '/games/desk-racer/assets/textures/mic_foam_v4_roughness_2k.png?v=5.2', false);
  }

  cachedDeskV4Textures = {
    oakWoodAlbedoTex,
    oakWoodNormalTex,
    oakWoodRoughnessTex,
    micFoamAlbedoTex,
    micFoamNormalTex,
    micFoamRoughnessTex,
  };
  return cachedDeskV4Textures;
}

let cachedNightWindowTexture = null;

/**
 * Generates a realistic Night Window Glass texture (512x256):
 * deep midnight navy-black night sky outside (#03050a -> #080d18) with a subtle,
 * realistic warm-amber reflection on the lower window panes (alpha 0.18..0.22).
 */
export function createNightWindowTexture() {
  if (cachedNightWindowTexture) return cachedNightWindowTexture;

  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. Deep midnight navy-black night sky & dark exterior base (#03050a -> #080d18)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0.0, '#03050a');
  skyGrad.addColorStop(0.35, '#050810');
  skyGrad.addColorStop(0.70, '#070b14');
  skyGrad.addColorStop(1.0, '#080d18');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle, realistic warm amber reflection on the lower window panes (alpha 0.18..0.22)
  const leftPaneRefl = ctx.createRadialGradient(w * 0.28, h * 0.62, 10, w * 0.28, h * 0.62, w * 0.34);
  leftPaneRefl.addColorStop(0.0, 'rgba(218, 162, 106, 0.18)');
  leftPaneRefl.addColorStop(0.55, 'rgba(162, 114, 72, 0.09)');
  leftPaneRefl.addColorStop(1.0, 'rgba(8, 13, 24, 0.0)');
  ctx.fillStyle = leftPaneRefl;
  ctx.fillRect(0, 0, w, h);

  const rightPaneRefl = ctx.createRadialGradient(w * 0.72, h * 0.60, 10, w * 0.72, h * 0.60, w * 0.34);
  rightPaneRefl.addColorStop(0.0, 'rgba(245, 172, 98, 0.22)');
  rightPaneRefl.addColorStop(0.50, 'rgba(176, 120, 72, 0.10)');
  rightPaneRefl.addColorStop(1.0, 'rgba(8, 13, 24, 0.0)');
  ctx.fillStyle = rightPaneRefl;
  ctx.fillRect(0, 0, w, h);

  // 3. Dark horizontal exterior lintel / soffit band across upper third
  ctx.fillStyle = 'rgba(4, 6, 12, 0.78)';
  ctx.fillRect(14, Math.round(h * 0.21), w - 28, Math.round(h * 0.085));
  ctx.fillStyle = 'rgba(185, 140, 96, 0.09)';
  ctx.fillRect(14, Math.round(h * 0.295), w - 28, Math.round(h * 0.035));

  // 4. Faint double-glazed glass reflections of interior vertical blind/frame edges
  const reflColumns = [
    [0.09, 0.14, 0.12],
    [0.29, 0.10, 0.10],
    [0.56, 0.16, 0.11],
    [0.76, 0.12, 0.09],
  ];
  for (const [rx, yStart, alpha] of reflColumns) {
    const cx = Math.round(w * rx);
    const colGrad = ctx.createLinearGradient(cx - 12, 0, cx + 18, 0);
    colGrad.addColorStop(0.0, 'rgba(220, 185, 145, 0.0)');
    colGrad.addColorStop(0.35, `rgba(225, 188, 148, ${alpha})`);
    colGrad.addColorStop(0.65, `rgba(180, 145, 110, ${alpha * 0.65})`);
    colGrad.addColorStop(1.0, 'rgba(220, 185, 145, 0.0)');
    ctx.fillStyle = colGrad;
    ctx.fillRect(cx - 12, Math.round(h * yStart), 30, Math.round(h * 0.68));
  }

  // 5. Dark architectural window casement mullions & perimeter frame shadow
  ctx.fillStyle = '#04060b';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);
  ctx.fillRect(0, 0, 10, h);
  ctx.fillRect(w - 10, 0, 10, h);
  ctx.fillRect(Math.round(w * 0.48) - 5, 0, 10, h);
  ctx.strokeStyle = 'rgba(255, 178, 108, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(11, 11, Math.round(w * 0.48) - 17, h - 22);
  ctx.strokeRect(Math.round(w * 0.48) + 6, 11, w - Math.round(w * 0.48) - 17, h - 22);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedNightWindowTexture = tex;
  return tex;
}

let cachedHighScoreMonitorTexture = null;

/**
 * Draws the custom 92x56 pixel-art 3/4 front-left #4 Hot-Rod Go-Kart on a
 * coaster track strip onto a 2D canvas context at (dstX, dstY) with integer
 * pixel size `scale`.
 */
function drawPixelArtKartFourSprite(ctx, dstX, dstY, scale = 2.25) {
  const S = 3;
  const W = 92 * S;  // 276
  const H = 56 * S;  // 168
  const grid = Array.from({length: H}, () => new Array(W).fill(null));

  const setPx = (x, y, col) => {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && ix < W && iy >= 0 && iy < H) {
      grid[iy][ix] = col;
    }
  };

  const fillRectS = (x0, y0, x1, y1, col) => {
    const ix0 = Math.round(x0 * S);
    const iy0 = Math.round(y0 * S);
    const ix1 = Math.round((x1 + 1) * S) - 1;
    const iy1 = Math.round((y1 + 1) * S) - 1;
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        setPx(x, y, col);
      }
    }
  };

  const fillPolyS = (pts, col) => {
    const ptsS = pts.map(([px, py]) => [px * S, py * S]);
    let minX = W - 1;
    let maxX = 0;
    let minY = H - 1;
    let maxY = 0;
    for (const [px, py] of ptsS) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    minX = Math.max(0, Math.floor(minX));
    maxX = Math.min(W - 1, Math.ceil(maxX));
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(H - 1, Math.ceil(maxY));
    const n = ptsS.length;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = ptsS[i][0];
          const yi = ptsS[i][1];
          const xj = ptsS[j][0];
          const yj = ptsS[j][1];
          if (yi > py !== yj > py &&
              px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi) {
            inside = !inside;
          }
        }
        if (inside) setPx(x, y, col);
      }
    }
  };

  const drawLineS = (x0, y0, x1, y1, col) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * S * 2;
    for (let i = 0; i <= steps; i++) {
      const x = (x0 + ((x1 - x0) * i) / steps) * S;
      const y = (y0 + ((y1 - y0) * i) / steps) * S;
      for (let dy = 0; dy < S; dy++) {
        for (let dx = 0; dx < S; dx++) {
          setPx(Math.floor(x) + dx, Math.floor(y) + dy, col);
        }
      }
    }
  };

  const C_TRACK_TOP = '#22242e';
  const C_TRACK_MID = '#161820';
  const C_TRACK_LINE = '#484c5c';
  const C_CURB_RED = '#e42424';
  const C_CURB_RED_DK = '#a51418';
  const C_CURB_WHT = '#f2f5fa';
  const C_CURB_WHT_DK = '#bcc4d2';
  const C_NEON_CYAN = '#00e8ff';
  const C_NEON_TEAL = '#008cb4';

  const C_RED_DARKEST = '#700a12';
  const C_RED_SHADOW = '#a20e18';
  const C_RED_BASE = '#d81822';
  const C_RED_BRIGHT = '#f43030';
  const C_RED_SPEC = '#ff7660';
  const C_RED_HOT = '#ffbca8';

  const C_WHITE = '#f8faff';
  const C_WHITE_SHAD = '#cad2e0';
  const C_GOLD_STRIPE = '#e6b222';

  const C_GUN_DARK = '#1e222c';
  const C_GUN_MID = '#363e4c';
  const C_GUN_LIGHT = '#566072';
  const C_GUN_SPEC = '#8490a6';

  const C_TIRE_OUTER = '#0e1016';
  const C_TIRE_RUBBER = '#181b23';
  const C_TIRE_TREAD = '#2a2f3a';
  const C_RIM_GOLD_DK = '#a4700c';
  const C_RIM_GOLD = '#eeb41c';
  const C_RIM_GOLD_HI = '#ffe05c';
  const C_HUB_SILVER = '#d2dae8';

  const C_VISOR_BLACK = '#0a0c12';
  const C_VISOR_BLUE = '#249cff';
  const C_VISOR_ORANGE = '#ff6e24';
  const C_HEADLIGHT_W = '#ffffff';
  const C_HEADLIGHT_C = '#a5f2ff';
  const C_TAIL_RED = '#ff182c';

  // 1. Coaster Track Platform (y = 43..51, x = 8..83, directly under the tires)
  fillRectS(8, 43, 83, 44, C_TRACK_TOP);
  fillRectS(8, 45, 83, 46, C_TRACK_MID);
  fillRectS(8, 43, 83, 43, C_TRACK_LINE);
  for (let x = 8; x <= 83; x++) {
    const seg = Math.floor((x - 8) / 5) % 2;
    const cTop = seg === 0 ? C_CURB_RED : C_CURB_WHT;
    const cBot = seg === 0 ? C_CURB_RED_DK : C_CURB_WHT_DK;
    fillRectS(x, 47, x, 48, cTop);
    fillRectS(x, 49, x, 49, cBot);
  }
  fillRectS(6, 50, 85, 50, C_NEON_CYAN);
  fillRectS(8, 51, 83, 51, C_NEON_TEAL);

  // 2. Far-Side Front-Right Wheel Peek (x = 11..21, y = 24..35)
  for (let y = 24 * S; y < 36 * S; y++) {
    for (let x = 11 * S; x < 22 * S; x++) {
      const dx = (x / S - 16.5) / 5.2;
      const dy = (y / S - 29.8) / 5.6;
      const r2 = dx * dx + dy * dy;
      if (r2 <= 1.0) {
        setPx(x, y, r2 > 0.68 ? C_TIRE_OUTER : C_TIRE_RUBBER);
        if (r2 > 0.45 && r2 <= 0.72 && dy < -0.2) {
          setPx(x, y, C_TIRE_TREAD);
        }
      }
    }
  }

  // 3. Front Splitter / Under-Tray Lip
  fillPolyS(
      [
        [9, 34],
        [25, 42],
        [39, 41],
        [23, 32],
      ],
      C_GUN_DARK);
  drawLineS(9, 35, 25, 42, C_GUN_LIGHT);
  drawLineS(25, 42, 35, 41, C_GUN_MID);

  // 4. Sleek Contoured Rear Spoiler Wing & Pylons
  fillPolyS(
      [
        [56, 17],
        [59, 17],
        [61, 24],
        [58, 24],
      ],
      C_GUN_DARK);
  fillPolyS(
      [
        [67, 19],
        [70, 19],
        [72, 26],
        [69, 26],
      ],
      C_GUN_DARK);
  for (let x = 52 * S; x < 80 * S; x++) {
    const xf = x / S;
    const t = (xf - 52.0) / 27.0;
    const yTop = Math.round((11.0 + t * 5.0) * S);
    for (let dy = 0; dy < 1 * S; dy++) setPx(x, yTop + dy, C_WHITE);
    for (let dy = 1 * S; dy < 2 * S; dy++)
      setPx(x, yTop + dy, t > 0.8 ? C_WHITE_SHAD : C_WHITE);
    for (let dy = 2 * S; dy < 3 * S; dy++) {
      setPx(x, yTop + dy, t > 0.25 && t < 0.7 ? C_GUN_SPEC : C_GUN_LIGHT);
    }
    for (let dy = 3 * S; dy < 4 * S; dy++) setPx(x, yTop + dy, C_GUN_MID);
    for (let dy = 4 * S; dy < 5 * S; dy++) setPx(x, yTop + dy, C_GUN_DARK);
    if (xf >= 75) {
      for (let dy = 5 * S; dy < 6 * S; dy++) setPx(x, yTop + dy, C_GUN_DARK);
    }
  }

  // 5. Louvered Gunmetal Rear Engine Deck (behind driver)
  fillPolyS(
      [
        [48, 19],
        [66, 21],
        [69, 26],
        [50, 26],
      ],
      C_GUN_LIGHT);
  for (let slat = 0; slat < 4; slat++) {
    drawLineS(
        50 + slat, 20 + slat, 64 + slat, 21 + slat,
        slat % 2 === 0 ? C_GUN_DARK : C_GUN_SPEC);
  }

  // 6. Rear Fender & Engine Bay Bodywork
  fillPolyS(
      [
        [50, 25],
        [76, 26],
        [79, 31],
        [79, 37],
        [52, 37],
      ],
      C_RED_BASE);
  fillPolyS(
      [
        [53, 25],
        [67, 25],
        [69, 27],
        [55, 27],
      ],
      C_WHITE);
  fillPolyS(
      [
        [56, 27],
        [70, 27],
        [71, 28],
        [57, 28],
      ],
      C_GOLD_STRIPE);
  fillPolyS(
      [
        [58, 28],
        [76, 28],
        [77, 30],
        [58, 30],
      ],
      C_RED_BRIGHT);
  drawLineS(61, 29, 73, 29, C_RED_SPEC);
  fillRectS(78, 30, 79, 34, C_GUN_DARK);
  fillRectS(79, 31, 79, 33, C_TAIL_RED);
  fillRectS(77, 35, 79, 36, C_WHITE_SHAD);

  // 7. Driver Torso, Steering Cowl & Steering Wheel
  fillPolyS(
      [
        [41, 20],
        [50, 20],
        [51, 28],
        [39, 28],
      ],
      '#241c20');
  drawLineS(40, 23, 46, 24, '#443438');
  for (let y = 18 * S; y < 26 * S; y++) {
    for (let x = 35 * S; x < 43 * S; x++) {
      const dx = (x / S - 38.5) / 3.2;
      const dy = (y / S - 21.8) / 3.5;
      const r2 = dx * dx + dy * dy;
      if (r2 >= 0.42 && r2 <= 1.05) {
        setPx(x, y, dy > 0 ? C_GUN_DARK : C_GUN_LIGHT);
      }
    }
  }
  fillPolyS(
      [
        [29, 22],
        [36, 19],
        [42, 23],
        [38, 28],
        [29, 25],
      ],
      C_GUN_MID);
  fillPolyS(
      [
        [29, 22],
        [36, 19],
        [39, 21],
        [32, 24],
      ],
      C_GUN_LIGHT);
  fillRectS(37, 23, 37, 23, C_GUN_SPEC);
  fillRectS(38, 23, 38, 23, C_WHITE_SHAD);

  // 8. Pearl-White Full-Face Racing Helmet with Sleek Red Center Stripe & Black
  // Visor
  for (let y = 7 * S; y < 22 * S; y++) {
    for (let x = 38 * S; x < 53 * S; x++) {
      const dx = (x / S - 45.0) / 6.8;
      const dy = (y / S - 14.5) / 6.8;
      const r2 = (dx - dy * 0.08) * (dx - dy * 0.08) + dy * dy;
      if (r2 <= 1.0) {
        let col = C_WHITE;
        if (dy > 0.55 || dx > 0.65) col = C_WHITE_SHAD;
        if (dy < -0.42 && dx + 0.08 >= -0.24 && dx + 0.08 <= 0.14) {
          col = C_RED_BASE;
          if (Math.abs(dx + 0.05) < 0.12 && dy < -0.72) {
            col = C_RED_HOT;
          }
        }
        setPx(x, y, col);
      }
    }
  }

  for (let y = 11 * S; y < 19 * S; y++) {
    for (let x = 38 * S; x < 49 * S; x++) {
      const xf = x / S;
      const yf = y / S;
      const dx = (xf - 45.0) / 6.8;
      const dy = (yf - 14.5) / 6.8;
      const r2 = (dx - dy * 0.08) * (dx - dy * 0.08) + dy * dy;
      if (r2 <= 0.98 && dx < 0.38 && dy >= -0.45 && dy <= 0.48) {
        if (yf >= 11.0 + Math.max(0.0, (xf - 42.0) * 0.35) &&
            yf <= 17.5 + Math.max(0.0, (xf - 43.0) * 0.2)) {
          setPx(x, y, C_VISOR_BLACK);
        }
      }
    }
  }
  fillRectS(48, 17, 49, 17, C_GUN_DARK);
  fillRectS(41, 14, 41, 15, C_VISOR_BLUE);
  fillRectS(45, 15, 45, 15, C_VISOR_ORANGE);
  drawLineS(41, 20, 50, 20, C_WHITE_SHAD);

  // 9. Sloped 3/4 Front Hood with Perspective White "4" & Dual Rectangular
  // Headlights
  fillPolyS(
      [
        [9, 33],
        [29, 22],
        [40, 28],
        [25, 41],
      ],
      C_RED_BASE);
  fillPolyS(
      [
        [9, 33],
        [29, 22],
        [32, 23],
        [12, 34],
      ],
      C_RED_BRIGHT);
  fillPolyS(
      [
        [22, 39],
        [40, 28],
        [42, 31],
        [25, 41],
      ],
      C_RED_SHADOW);
  fillPolyS(
      [
        [9, 33],
        [25, 41],
        [25, 42],
        [9, 35],
      ],
      C_RED_DARKEST);

  // Right Headlight (far/left nose fender)
  fillPolyS(
      [
        [10, 32],
        [14, 30],
        [17, 32],
        [13, 34],
      ],
      C_GUN_MID);
  fillPolyS(
      [
        [11, 32],
        [14, 31],
        [16, 32],
        [13, 33],
      ],
      C_HEADLIGHT_W);
  fillRectS(12, 32, 12, 32, C_HEADLIGHT_C);

  // Left Headlight (near/bottom nose fender)
  fillPolyS(
      [
        [18, 38],
        [22, 36],
        [26, 38],
        [22, 41],
      ],
      C_GUN_MID);
  fillPolyS(
      [
        [19, 38],
        [22, 37],
        [25, 38],
        [22, 40],
      ],
      C_HEADLIGHT_W);
  fillRectS(21, 39, 21, 39, C_HEADLIGHT_C);

  // Perspective "4" lying flat on the diagonal 3/4 front hood plane:
  // u = across-hood axis (+0.80, +0.58)
  // v = down-hood-slope axis (-0.82, +0.57)
  const hoodUV = (u, v) =>
      [25.0 + u * 4.5 * 0.8 + v * 4.8 * -0.82,
       29.0 + u * 4.5 * 0.58 + v * 4.8 * 0.57,
  ];

  // 1) Main stem running down-left parallel to the diagonal hood slope
  fillPolyS(
      [
        hoodUV(0.16, -0.96), hoodUV(0.52, -0.96), hoodUV(0.52, 1.08),
        hoodUV(0.16, 1.08)
      ],
      C_WHITE);
  // 2) Crossbar running down-right across the hood width with short right stub
  fillPolyS(
      [
        hoodUV(-0.96, 0.06), hoodUV(0.76, 0.06), hoodUV(0.76, 0.34),
        hoodUV(-0.96, 0.34)
      ],
      C_WHITE);
  // 3) Diagonal upper stroke connecting left crossbar corner to top of stem
  fillPolyS(
      [
        hoodUV(-0.96, 0.06),
        hoodUV(0.16, -0.96),
        hoodUV(0.52, -0.96),
        hoodUV(0.52, -0.62),
        hoodUV(-0.58, 0.34),
        hoodUV(-0.96, 0.34),
      ],
      C_WHITE);
  // 4) Open crimson triangular counter inside the "4"
  fillPolyS(
      [hoodUV(-0.52, 0.05), hoodUV(0.15, -0.58), hoodUV(0.15, 0.05)],
      C_RED_BASE);

  // 10. Sculpted Crimson Side-Pod & White Bottom Rocker Stripe
  fillPolyS(
      [
        [38, 28],
        [58, 27],
        [61, 38],
        [38, 39],
      ],
      C_RED_BASE);
  fillPolyS(
      [
        [40, 30],
        [56, 29],
        [57, 33],
        [40, 34],
      ],
      C_RED_BRIGHT);
  fillPolyS(
      [
        [43, 31],
        [52, 30],
        [53, 32],
        [43, 33],
      ],
      C_RED_SPEC);
  fillRectS(46, 31, 49, 31, C_RED_HOT);
  fillRectS(40, 35, 58, 36, C_RED_SHADOW);
  fillRectS(43, 37, 59, 38, C_WHITE);
  fillRectS(43, 39, 59, 39, C_WHITE_SHAD);

  // 11. Foreground 3D Gold-Spoked Wheels
  const draw3DKartWheelS = (cx, cy, rx, ry) => {
    const yMin = Math.floor((cy - ry - 1) * S);
    const yMax = Math.ceil((cy + ry + 2) * S);
    const xMin = Math.floor((cx - rx - 1) * S);
    const xMax = Math.ceil((cx + rx + 2) * S);
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const xf = x / S;
        const yf = y / S;
        const dxTread = (xf - (cx - 1.4)) / rx;
        const dyTread = (yf - cy) / ry;
        if (dxTread * dxTread + dyTread * dyTread <= 1.02) {
          setPx(x, y, dyTread < 0.2 ? C_TIRE_RUBBER : C_TIRE_OUTER);
          if (dyTread > -0.85 && dyTread < -0.35 && dxTread < -0.45) {
            setPx(x, y, C_TIRE_TREAD);
          }
        }
      }
    }
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const xf = x / S;
        const yf = y / S;
        const dx = (xf - cx) / rx;
        const dy = (yf - cy) / ry;
        const r2 = dx * dx + dy * dy;
        if (r2 <= 1.0) {
          if (r2 > 0.5) {
            setPx(x, y, r2 > 0.78 ? C_TIRE_OUTER : C_TIRE_RUBBER);
          } else if (r2 <= 0.09) {
            setPx(x, y, C_HUB_SILVER);
          } else {
            const ang = Math.atan2(dy, dx);
            const spoke = Math.cos(ang * 6.0);
            if (r2 > 0.38) {
              setPx(x, y, dy < 0 ? C_RIM_GOLD : C_RIM_GOLD_DK);
            } else if (spoke > 0.15) {
              setPx(x, y, dy < -0.1 ? C_RIM_GOLD_HI : C_RIM_GOLD);
            } else {
              setPx(x, y, C_TIRE_OUTER);
            }
          }
        }
      }
    }
  };

  draw3DKartWheelS(35.5, 36.5, 6.2, 6.8);
  draw3DKartWheelS(66.5, 34.8, 6.8, 7.4);

  ctx.save();
  for (let y = 0; y < H; y++) {
    const py0 = Math.round(dstY + y * scale);
    const py1 = Math.round(dstY + (y + 1) * scale);
    const ph = Math.max(1, py1 - py0);
    for (let x = 0; x < W; x++) {
      const col = grid[y][x];
      if (col) {
        const px0 = Math.round(dstX + x * scale);
        const px1 = Math.round(dstX + (x + 1) * scale);
        ctx.fillStyle = col;
        ctx.fillRect(px0, py0, Math.max(1, px1 - px0), ph);
      }
    }
  }
  ctx.restore();
}

/**
 * Generates the 2048x1152 High Scores monitor display texture for Camera View
 * 8:
 * - Pure black (#000000) screen background
 * - Italic retro pixel-art title "DESK RACER HIGH SCORES" with orange-to-white
 * vertical gradient
 * - Custom-drawn 3/4 front-left pixel-art #4 Go-Kart on the coaster track
 * - 6 arcade leaderboard rows (Geneviève, Jay, Vamsi, Jack, Paige, Omar)
 */
export function createHighScoreMonitorTexture() {
  if (cachedHighScoreMonitorTexture) return cachedHighScoreMonitorTexture;

  const w = 2048;
  const h = 1152;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;

  const highScoreRows = [
    {name: 'Genevi\u00e8ve', time: '00:48.12', color: '#ffca28'},
    {name: 'Jay', time: '00:49.85', color: '#00e5ff'},
    {name: 'Vamsi', time: '00:52.10', color: '#ec6ea9'},
    {name: 'Jack', time: '00:52.30', color: '#ff5252'},
    {name: 'Paige', time: '00:53.48', color: '#26e658'},
    {name: 'Omar', time: '00:53.75', color: '#42a5f5'},
  ];

  function renderHighScoreScreen() {
    ctx.save();
    // 1. Pure black turned-on display background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // 2. Top Italic Pixel-Art Header: "DESK RACER HIGH SCORES"
    const titleY = 114;
    ctx.save();
    ctx.translate(w * 0.5, titleY);
    ctx.transform(1, 0, -0.18, 1, 0, 0);  // Forward arcade italic slant
    ctx.font = '44px "Press Start 2P", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Dark pixel drop-shadow
    ctx.fillStyle = '#240802';
    ctx.fillText('DESK RACER HIGH SCORES', 4, 4);

    // Orange -> Gold -> White vertical gradient across the title glyphs
    const titleGrad = ctx.createLinearGradient(0, -44, 0, 4);
    titleGrad.addColorStop(0.0, '#ff5510');
    titleGrad.addColorStop(0.45, '#ff9e22');
    titleGrad.addColorStop(0.78, '#ffe082');
    titleGrad.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = titleGrad;
    ctx.shadowColor = 'rgba(255, 110, 24, 0.36)';
    ctx.shadowBlur = 12;
    ctx.fillText('DESK RACER HIGH SCORES', 0, 0);
    ctx.restore();

    // 3. Center Custom Pixel-Art #4 Kart Sprite on Coaster Track (276x168
    // grid @ 2.25x = 621x378)
    const spriteScale = 2.25;
    const spriteW = Math.round(276 * spriteScale);
    const spriteX = Math.round((w - spriteW) * 0.5);
    const spriteY = 142;
    drawPixelArtKartFourSprite(ctx, spriteX, spriteY, spriteScale);

    // 4. Six Arcade Leaderboard Rows
    const leftX = 520;
    const rightX = 1528;
    const startY = 598;
    const rowStepY = 78;

    ctx.font = '38px "Press Start 2P", "Courier New", monospace';
    ctx.textBaseline = 'alphabetic';

    for (let i = 0; i < highScoreRows.length; i++) {
      const row = highScoreRows[i];
      const ry = startY + i * rowStepY;

      ctx.save();
      ctx.fillStyle = row.color;
      ctx.shadowColor = row.color;
      ctx.shadowBlur = 8;

      ctx.textAlign = 'left';
      ctx.fillText(row.name, leftX, ry);

      ctx.textAlign = 'right';
      ctx.fillText(row.time, rightX, ry);
      ctx.restore();
    }

    ctx.restore();
    tex.needsUpdate = true;
  }

  renderHighScoreScreen();

  if (typeof document !== 'undefined' && document.fonts) {
    Promise
        .all([
          document.fonts.load('44px "Press Start 2P"'),
          document.fonts.load('38px "Press Start 2P"'),
        ])
        .then(() => {
          renderHighScoreScreen();
        })
        .catch(() => {});
    if (document.fonts.ready) {
      document.fonts.ready
          .then(() => {
            renderHighScoreScreen();
          })
          .catch(() => {});
    }
  }

  cachedHighScoreMonitorTexture = tex;
  return tex;
}

/**
 * V5.0: All contact and support shadows are cast dynamically by the 4096x4096
 * PCFSoftShadowMap directional sunLight and lampKeyLight (zero fake round black blob decals).
 */
function buildDeskContactShadowGroup() {
  const contactShadowGroup = new THREE.Group();
  contactShadowGroup.name = 'DeskContactShadowGroup';
  return { contactShadowGroup, contactShadowPlane: null };
}

/**
 * Builds the 8 real-scale desk monuments defined in desk_manifest.json
 * with millimeter accuracy (1.0 unit = 1.0 meter, Y = 0.000 = oak tabletop surface).
 * Also integrates /games/desk-racer/assets/models/desk_props.glb when present.
 */
export function buildProceduralDeskDiorama(manifest) {
  const root = new THREE.Group();
  root.name = 'DeskDioramaGroup';

  const { colorTex: oakColor } = createOakWoodTextures();
  const monitorScreenTex = createMonitorScreenTexture();
  const {
    oakWoodAlbedoTex,
    oakWoodNormalTex,
    oakWoodRoughnessTex,
    micFoamAlbedoTex,
    micFoamNormalTex,
    micFoamRoughnessTex,
  } = getDeskV4PBRTextures();

  const { contactShadowGroup, contactShadowPlane } = buildDeskContactShadowGroup(manifest);

  // Shared PBR Materials (V5.2: Rich warm medium honey-walnut/oak with Nano Banana texture & ultra-subtle pore normal)
  const oakMat = new THREE.MeshStandardMaterial({
    map: oakWoodAlbedoTex || oakColor,
    normalMap: oakWoodNormalTex,
    normalScale: new THREE.Vector2(0.04, 0.04),
    roughnessMap: oakWoodRoughnessTex,
    roughness: 0.74,
    metalness: 0.01,
  });

  const darkAnodizedAlumMat = new THREE.MeshStandardMaterial({
    color: 0x1d2026,
    roughness: 0.34,
    metalness: 0.78,
  });

  const gunmetalAlumMat = new THREE.MeshStandardMaterial({
    color: 0x353b45,
    roughness: 0.28,
    metalness: 0.84,
  });

  const matteBlackPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x15171c,
    roughness: 0.58,
    metalness: 0.12,
  });

  const siliconePadMat = new THREE.MeshStandardMaterial({
    color: 0x282b33,
    roughness: 0.85,
    metalness: 0.02,
  });

  const whiteCeramicMat = new THREE.MeshStandardMaterial({
    color: 0xf6f3ec,
    roughness: 0.24,
    metalness: 0.05,
  });

  const gingerFurMat = new THREE.MeshStandardMaterial({
    color: 0xe67e28,
    roughness: 0.32,
    metalness: 0.04,
  });

  const darkGingerStripeMat = new THREE.MeshStandardMaterial({
    color: 0xb95312,
    roughness: 0.35,
    metalness: 0.04,
  });

  // -------------------------------------------------------------------------
  // 1. LIGHT WEATHERED OAK STANDING DESK TABLETOP (1100 x 600 x 25 mm, top Y=0)
  // -------------------------------------------------------------------------
  const deskGroup = new THREE.Group();
  deskGroup.name = 'oak_desk_tabletop';

  const deskGeo = new THREE.BoxGeometry(1.1, 0.025, 0.6);
  const deskMesh = new THREE.Mesh(deskGeo, oakMat);
  deskMesh.position.set(0.0, -0.0125, 0.0);
  deskMesh.receiveShadow = true;
  deskMesh.castShadow = true;
  deskGroup.add(deskMesh);

  // Subtle dark chamfered under-frame & dual motorized standing-desk legs
  const frameUnder = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.028, 0.44),
    darkAnodizedAlumMat
  );
  frameUnder.position.set(0, -0.039, -0.02);
  deskGroup.add(frameUnder);

  for (const lx of [-0.42, 0.42]) {
    const legCol = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.45, 0.075),
      darkAnodizedAlumMat
    );
    legCol.position.set(lx, -0.26, -0.02);
    deskGroup.add(legCol);
  }

  // Legacy Rear Window Frame Backdrop hidden so room_environment.glb's full architectural North wall & tall window render cleanly
  const windowBackdropGroup = new THREE.Group();
  windowBackdropGroup.name = 'GoldenHourWindowBackdrop';
  windowBackdropGroup.position.set(0.04, 0.32, -0.44);
  windowBackdropGroup.visible = false;
  const blindSlatMat = new THREE.MeshStandardMaterial({
    name: 'Mat_GoldenHourWindow',
    color: 0x0a1326,
    roughness: 0.88,
    metalness: 0.0,
    emissive: new THREE.Color(0x070e1d),
    emissiveIntensity: 0.28,
  });
  const windowPaneMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.42),
    blindSlatMat
  );
  windowPaneMesh.position.set(0, 0.18, -0.018);
  windowBackdropGroup.add(windowPaneMesh);

  for (let s = 0; s < 7; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.008, 0.028), blindSlatMat);
    slat.position.set(0, 0.06 + s * 0.048, 0);
    slat.rotation.x = 0.38;
    windowBackdropGroup.add(slat);
  }
  deskGroup.add(windowBackdropGroup);
  root.add(deskGroup);

  // -------------------------------------------------------------------------
  // 2. BOYATA MATTE-BLACK ALUMINUM Z-PILLAR LAPTOP STAND (Sector 1 Climb)
  //    Center: [-0.360, 0.0, -0.070], W=0.260, D=0.220, H=0.165, RotY=12 deg
  // -------------------------------------------------------------------------
  const boyataGroup = new THREE.Group();
  boyataGroup.name = 'boyata_laptop_stand';
  boyataGroup.position.set(-0.36, 0.0, -0.07);
  boyataGroup.rotation.y = THREE.MathUtils.degToRad(12.0);

  // Lower Base Plate on Oak Desk
  const boyataBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.215, 0.006, 0.185),
    darkAnodizedAlumMat
  );
  boyataBase.position.set(0, 0.003, 0.01);
  boyataBase.castShadow = true;
  boyataBase.receiveShadow = true;
  boyataGroup.add(boyataBase);

  // Heavy Angled Z-Pillar Neck (Lower & Upper Dual Struts)
  const lowerStrut = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.125, 0.012),
    darkAnodizedAlumMat
  );
  lowerStrut.position.set(0, 0.055, -0.025);
  lowerStrut.rotation.x = 0.52;
  lowerStrut.castShadow = true;
  boyataGroup.add(lowerStrut);

  const upperStrut = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.115, 0.012),
    darkAnodizedAlumMat
  );
  upperStrut.position.set(0, 0.118, -0.015);
  upperStrut.rotation.x = -0.46;
  upperStrut.castShadow = true;
  boyataGroup.add(upperStrut);

  // Upper Tilted Laptop Cradle Plate (Y = 0.156m to 0.168m)
  const upperDeck = new THREE.Group();
  upperDeck.position.set(0, 0.158, 0.0);
  upperDeck.rotation.x = THREE.MathUtils.degToRad(14.0);

  const deckPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.006, 0.215),
    darkAnodizedAlumMat
  );
  deckPlate.castShadow = true;
  deckPlate.receiveShadow = true;
  upperDeck.add(deckPlate);

  // 4 Silicone grip pads + U-shaped front stop hooks
  for (const [px, pz] of [
    [-0.09, -0.07],
    [0.09, -0.07],
    [-0.09, 0.07],
    [0.09, 0.07],
  ]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.003, 0.026), siliconePadMat);
    pad.position.set(px, 0.0045, pz);
    upperDeck.add(pad);
  }
  for (const hx of [-0.085, 0.085]) {
    const hook = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.018, 0.014),
      darkAnodizedAlumMat
    );
    hook.position.set(hx, 0.01, 0.103);
    hook.castShadow = true;
    upperDeck.add(hook);
  }

  boyataGroup.add(upperDeck);
  root.add(boyataGroup);

  // -------------------------------------------------------------------------
  // 3. CHUBBY GINGER-AND-WHITE CAT FIGURINE (Sector 2 360° Helix Monument)
  //    Center: [-0.166, 0.0, -0.108], 1.60x scale (W=85.1mm, D=69.3mm, H=117.1mm, 0 BVH collisions)
  // -------------------------------------------------------------------------
  const catGroup = new THREE.Group();
  catGroup.name = 'ginger_cat_figurine';
  catGroup.position.set(-0.166, 0.0, -0.108);
  catGroup.scale.set(1.60, 1.60, 1.60);
  catGroup.rotation.y = THREE.MathUtils.degToRad(14.0);

  // Plump ceramic sitting body
  const catBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 28, 24),
    gingerFurMat
  );
  catBody.scale.set(1.05, 1.18, 0.98);
  catBody.position.set(0, 0.026, 0);
  catBody.castShadow = true;
  catBody.receiveShadow = true;
  catGroup.add(catBody);

  // White chest / belly patch
  const catBelly = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 24, 20),
    whiteCeramicMat
  );
  catBelly.scale.set(0.88, 1.05, 0.65);
  catBelly.position.set(0, 0.025, 0.012);
  catGroup.add(catBelly);

  // Cute round head
  const catHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 28, 24),
    gingerFurMat
  );
  catHead.scale.set(1.12, 0.96, 1.02);
  catHead.position.set(0, 0.055, 0.004);
  catHead.castShadow = true;
  catGroup.add(catHead);

  // White muzzle cheeks
  for (const cx of [-0.007, 0.007]) {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.0085, 16, 16),
      whiteCeramicMat
    );
    cheek.position.set(cx, 0.05, 0.021);
    catGroup.add(cheek);
  }

  // Pink nose + glossy dark eyes
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff8598, roughness: 0.3 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 12, 12), noseMat);
  nose.position.set(0, 0.054, 0.026);
  catGroup.add(nose);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.08,
    metalness: 0.2,
  });
  for (const ex of [-0.0095, 0.0095]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 14, 14), eyeMat);
    eye.position.set(ex, 0.059, 0.022);
    catGroup.add(eye);
  }

  // Perky triangular ears
  for (const [ex, rotZ] of [
    [-0.014, 0.32],
    [0.014, -0.32],
  ]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.018, 16), gingerFurMat);
    ear.position.set(ex, 0.072, 0.002);
    ear.rotation.z = rotZ;
    ear.castShadow = true;
    catGroup.add(ear);
  }

  // Front white paws & curled ginger tail + tabby back stripes
  for (const px of [-0.011, 0.011]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 14), whiteCeramicMat);
    paw.scale.set(1.0, 0.65, 1.3);
    paw.position.set(px, 0.006, 0.022);
    catGroup.add(paw);
  }
  const tail = new THREE.Mesh(
    new THREE.TorusGeometry(0.016, 0.0052, 12, 24, Math.PI * 1.15),
    darkGingerStripeMat
  );
  tail.position.set(0.014, 0.012, -0.02);
  tail.rotation.x = Math.PI / 2;
  catGroup.add(tail);

  root.add(catGroup);

  // -------------------------------------------------------------------------
  // 4. LG ULTRAGEAR 27-INCH MONITOR + TOP WEBCAM
  //    Center: [0.010, 0.0, -0.245], Panel: 614 x 45 x 365 mm, Bottom Y=0.075
  // -------------------------------------------------------------------------
  const monitorGroup = new THREE.Group();
  monitorGroup.name = 'lg_ultragear_monitor';
  monitorGroup.position.set(0.01, 0.0, -0.245);

  // V-wing UltraGear stand base
  for (const [ang, ox] of [
    [0.55, -0.055],
    [-0.55, 0.055],
  ]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.012, 0.026),
      matteBlackPlasticMat
    );
    wing.position.set(ox, 0.006, 0.018);
    wing.rotation.y = ang;
    wing.castShadow = true;
    wing.receiveShadow = true;
    monitorGroup.add(wing);
  }

  // Vertical ergonomic stand pillar
  const standPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.28, 0.036),
    matteBlackPlasticMat
  );
  standPillar.position.set(0, 0.14, -0.025);
  standPillar.castShadow = true;
  monitorGroup.add(standPillar);

  // Crimson UltraGear accent ring on pillar
  const redRing = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.014, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xd91e2a, roughness: 0.35, metalness: 0.5 })
  );
  redRing.position.set(0, 0.19, -0.025);
  monitorGroup.add(redRing);

  // 27" Monitor Bezel Housing (W=0.614, H=0.365, D=0.026, centered at Y = 0.075 + 0.1825 = 0.2575)
  const panelCenterY = 0.075 + 0.365 / 2;
  const bezelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.614, 0.365, 0.024),
    matteBlackPlasticMat
  );
  bezelMesh.position.set(0, panelCenterY, 0);
  bezelMesh.castShadow = true;
  bezelMesh.receiveShadow = true;
  monitorGroup.add(bezelMesh);

  const highScoreMonitorTex = createHighScoreMonitorTexture();
  const monitorScreenMaterials = [];
  let monitorHighScoresVisible = false;

  function applyMonitorScreenMaterialState(mat, showHighScores) {
    if (!mat) return;
    if ('clearcoat' in mat) mat.clearcoat = 0.0;
    if ('clearcoatRoughness' in mat) mat.clearcoatRoughness = 1.0;
    if ('specularIntensity' in mat) mat.specularIntensity = 0.0;
    if (showHighScores) {
      mat.map = highScoreMonitorTex;
      mat.emissiveMap = highScoreMonitorTex;
      if (mat.color) mat.color.setHex(0x010204);
      if (mat.emissive) {
        mat.emissive.setHex(0xffffff);
      } else {
        mat.emissive = new THREE.Color(0xffffff);
      }
      mat.emissiveIntensity = 0.95;
      mat.roughness = 0.88;
      mat.metalness = 0.03;
      mat.envMapIntensity = 0.08;
    } else {
      mat.map = null;
      mat.emissiveMap = null;
      if (mat.color) mat.color.setHex(0x0d1524);
      if (mat.emissive) {
        mat.emissive.setHex(0x0a1220);
      } else {
        mat.emissive = new THREE.Color(0x0a1220);
      }
      mat.emissiveIntensity = 0.22;
      mat.roughness = 0.86;
      mat.metalness = 0.04;
      mat.envMapIntensity = 0.10;
    }
    mat.needsUpdate = true;
  }

  function setMonitorHighScoresVisible(visible) {
    const nextState = Boolean(visible);
    monitorHighScoresVisible = nextState;
    for (const mat of monitorScreenMaterials) {
      applyMonitorScreenMaterialState(mat, nextState);
    }
  }

  function attachMonitorScreenSubtleReflection(mat) {
    if (!mat || mat.userData._hasMonitorSubtleReflection) return;
    mat.userData._hasMonitorSubtleReflection = true;
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `varying vec3 vScreenWorldPos;\nvarying vec3 vScreenWorldNormal;\n` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
           vScreenWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
           vScreenWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
        );
      shader.fragmentShader =
          `varying vec3 vScreenWorldPos;\nvarying vec3 vScreenWorldNormal;\n` +
          shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              `vec3 V = normalize(cameraPosition - vScreenWorldPos);
           vec3 N = normalize(vScreenWorldNormal);
           float frontFaceMask = smoothstep(0.35, 0.75, N.z);
           float ndotv = clamp(dot(N, V), 0.0, 1.0);
           float fresnel = 0.05 + 0.28 * pow(1.0 - ndotv, 2.4);
           // View-dependent reflection vector off the front monitor glass
           vec3 R = reflect(-V, vec3(0.0, 0.0, 1.0));
           // Soft satin specular reflection lobes from the scene's actual light sources:
           // 1) Warm Key-Light Desk Lamp on the right (0.35, 0.35, -0.09)
           vec3 toLamp = normalize(vec3(0.35, 0.35, -0.09) - vScreenWorldPos);
           float lampSpec = pow(max(0.0, dot(R, toLamp)), 3.2);
           // 2) Electric-Blue Fifine Mic RGB Ring (-0.03, 0.11, -0.08) & Cyan G915 Keyboard (-0.15, 0.02, 0.12)
           vec3 toMic = normalize(vec3(-0.03, 0.11, -0.08) - vScreenWorldPos);
           float micSpec = pow(max(0.0, dot(R, toMic)), 2.8);
           vec3 toKb = normalize(vec3(-0.15, 0.02, 0.14) - vScreenWorldPos);
           float kbSpec = pow(max(0.0, dot(R, toKb)), 2.6);
           // 3) Subtle diagonal satin-glass sheen across the 27" IPS panel
           float diagCoord = (vScreenWorldPos.x - 0.01) * 1.35 + (vScreenWorldPos.y - 0.255) * 1.15;
           float diagBand = exp(-pow((diagCoord + 0.06) / 0.24, 2.0)) * 0.55
                          + exp(-pow((diagCoord - 0.18) / 0.16, 2.0)) * 0.30;
           vec3 glassSheen = vec3(0.024, 0.036, 0.062) * (0.25 + 0.65 * diagBand)
                           + vec3(0.085, 0.048, 0.020) * lampSpec
                           + vec3(0.018, 0.062, 0.125) * (micSpec * 0.65 + kbSpec * 0.45);
           gl_FragColor.rgb = mix(vec3(0.010, 0.012, 0.018), gl_FragColor.rgb + glassSheen * (0.45 + 0.85 * fresnel), frontFaceMask);
           #include <dithering_fragment>`);
    };
  }

  // Illuminated IPS Display Screen (matte anti-glare IPS coating with zero harsh point-light specular blobs)
  const screenMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MonitorScreen',
    color: 0x0d1524,
    emissive: new THREE.Color(0x0a1220),
    emissiveIntensity: 0.22,
    roughness: 0.22,
    metalness: 0.12,
    envMapIntensity: 0.16,
  });
  attachMonitorScreenSubtleReflection(screenMat);
  monitorScreenMaterials.push(screenMat);
  applyMonitorScreenMaterialState(screenMat, monitorHighScoresVisible);
  const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.598, 0.348), screenMat);
  screenPlane.position.set(0, panelCenterY, 0.0125);
  monitorGroup.add(screenPlane);

  // Top Clip-on 1080p Webcam at [-0.130, 0.455, -0.235] (local X = -0.140, Y = 0.450, Z = 0.012)
  const webcamBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, 0.024, 0.028),
    matteBlackPlasticMat
  );
  webcamBody.position.set(-0.14, 0.45, 0.012);
  monitorGroup.add(webcamBody);

  const webcamLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.006, 18),
    gunmetalAlumMat
  );
  webcamLens.rotation.x = Math.PI / 2;
  webcamLens.position.set(-0.14, 0.45, 0.027);
  monitorGroup.add(webcamLens);

  const webcamLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.0022, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x32d74b })
  );
  webcamLed.position.set(-0.118, 0.45, 0.027);
  monitorGroup.add(webcamLed);

  root.add(monitorGroup);

  // -------------------------------------------------------------------------
  // 5. FIFINE AMPLIGAME AM8 MICROPHONE + UNDER-MOUNTED U-YOKE + SIMPLIFIED LOW-PROFILE BOOM ARM
  //    Exact Preserved Anchors: Clamp [0.245, 0.0, -0.285], Elbow [0.110, 0.105, -0.140], Mic [-0.025, 0.105, -0.045]
  // -------------------------------------------------------------------------
  const blueLedMat = new THREE.MeshStandardMaterial({
    name: 'Mat_ElectricBlueLED',
    color: 0x00dcff,
    emissive: new THREE.Color(0x0a98ff),
    emissiveIntensity: 2.35,
    roughness: 0.16,
    metalness: 0.06,
  });

  const fifineYokeBlueReflectMat = new THREE.MeshStandardMaterial({
    name: 'Mat_FifineYokeBlueReflect',
    color: 0x104890,
    emissive: new THREE.Color(0x0a78ff),
    emissiveIntensity: 0.95,
    roughness: 0.22,
    metalness: 0.65,
  });

  const fifineFlockFoamMat = new THREE.MeshStandardMaterial({
    name: 'Mat_FoamWindscreen',
    color: 0x24272f,
    map: micFoamAlbedoTex,
    normalMap: micFoamNormalTex,
    normalScale: new THREE.Vector2(0.58, 0.58),
    roughnessMap: micFoamRoughnessTex,
    roughness: 0.96,
    metalness: 0.01,
  });

  const fifineAnodizedBodyMat = new THREE.MeshStandardMaterial({
    name: 'Mat_FifineAnodizedBlack',
    color: 0x16181e,
    roughness: 0.40,
    metalness: 0.38,
  });

  const fifineSilverTrimMat = new THREE.MeshStandardMaterial({
    name: 'Mat_FifineSilverTrim',
    color: 0xd0d5dd,
    roughness: 0.24,
    metalness: 0.86,
  });

  /**
   * Builds a C1-smooth rounded-square ("squircle") capsule BufferGeometry along the local Z axis
   * for the Fifine AmpliGame AM8 capsule (50mm x 50mm cross-section with 13.2mm corner radius)
   * using a subdivided 3D cube grid projected onto the exact 3D rounded-box SDF.
   * Because both vertex positions and analytical SDF-gradient normals depend solely on 3D coordinates
   * (with zero polar collapse and zero face-seam normal jumps), the front head and sides share the
   * exact same seamless porous foam texture without any converging lines or dark seam rings.
   */
  function createFifineRoundedSquarePrismGeometry({
    halfWidth = 0.025,
    cornerRadius = 0.0132,
    zStart = -0.048,
    zEnd = 0.052,
    frontDomeLength = 0.010,
    rearBevelLength = 0.002,
  }) {
    const segXY = 22;
    const segZ = 24;
    const geo = new THREE.BoxGeometry(1, 1, 1, segXY, segXY, segZ);
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;

    const innerHalf = Math.max(0.001, halfWidth - cornerRadius);
    const zMid = 0.5 * (zStart + zEnd);
    const halfLenZ = Math.max(1e-5, 0.5 * (zEnd - zStart));
    const rFront = Math.max(0.0006, Math.min(halfLenZ * 0.85, frontDomeLength));
    const rRear = Math.max(0.0006, Math.min(halfLenZ * 0.85, rearBevelLength));
    const rBevelF = Math.max(0.0005, rFront * 0.82);
    const rBevelR = Math.max(0.0005, rRear);
    const uvScale = 28.0;

    // Exact C1-continuous 3D Signed Distance Function of the rounded-square capsule
    const evalCapsuleSDF = (x, y, z) => {
      const qx = Math.abs(x) - innerHalf;
      const qy = Math.abs(y) - innerHalf;
      const d2D =
        Math.hypot(Math.max(qx, 0.0), Math.max(qy, 0.0)) +
        Math.min(Math.max(qx, qy), 0.0) -
        cornerRadius;

      const rSq = Math.min(1.0, (x * x + y * y) / Math.max(1e-6, halfWidth * halfWidth));
      const zFrontCrown = zEnd - rFront * 0.18 * rSq;
      if (z >= zMid) {
        const uSide = d2D + rBevelF;
        const uTop = z - (zFrontCrown - rBevelF);
        return (
          Math.hypot(Math.max(uSide, 0.0), Math.max(uTop, 0.0)) +
          Math.min(Math.max(uSide, uTop), 0.0) -
          rBevelF
        );
      }
      const uSide = d2D + rBevelR;
      const uBot = zStart + rBevelR - z;
      return (
        Math.hypot(Math.max(uSide, 0.0), Math.max(uBot, 0.0)) +
        Math.min(Math.max(uSide, uBot), 0.0) -
        rBevelR
      );
    };

    const eps = 0.00025;
    for (let i = 0; i < posAttr.count; i++) {
      const ux = posAttr.getX(i) * 2.0;
      const uy = posAttr.getY(i) * 2.0;
      const uz = posAttr.getZ(i) * 2.0;
      const origNx = normAttr.getX(i);
      const origNy = normAttr.getY(i);
      const origNz = normAttr.getZ(i);

      // Nowell cube-to-sphere direction so grid spacing is uniform across faces & corners
      const x2 = ux * ux;
      const y2 = uy * uy;
      const z2 = uz * uz;
      const sx = ux * Math.sqrt(Math.max(0.0, 1.0 - y2 * 0.5 - z2 * 0.5 + (y2 * z2) / 3.0));
      const sy = uy * Math.sqrt(Math.max(0.0, 1.0 - z2 * 0.5 - x2 * 0.5 + (z2 * x2) / 3.0));
      const sz = uz * Math.sqrt(Math.max(0.0, 1.0 - x2 * 0.5 - y2 * 0.5 + (x2 * y2) / 3.0));

      // Ray direction from capsule center (0, 0, zMid) scaled by aspect
      let dx = sx * halfWidth;
      let dy = sy * halfWidth;
      let dz = sz * halfLenZ;
      const dLen = Math.hypot(dx, dy, dz) || 1.0;
      dx /= dLen;
      dy /= dLen;
      dz /= dLen;

      // Newton-step along ray from (0, 0, zMid) onto the exact evalCapsuleSDF(x, y, z) = 0 surface
      let t = dLen;
      for (let iter = 0; iter < 6; iter++) {
        const px = dx * t;
        const py = dy * t;
        const pz = zMid + dz * t;
        const sdf = evalCapsuleSDF(px, py, pz);
        t -= sdf * 0.92;
      }

      const px = dx * t;
      const py = dy * t;
      const pz = zMid + dz * t;
      posAttr.setXYZ(i, px, py, pz);

      // Analytical C1-continuous outward normal from 3D SDF gradient (depends ONLY on 3D position!)
      const nx = evalCapsuleSDF(px + eps, py, pz) - evalCapsuleSDF(px - eps, py, pz);
      const ny = evalCapsuleSDF(px, py + eps, pz) - evalCapsuleSDF(px, py - eps, pz);
      const nz = evalCapsuleSDF(px, py, pz + eps) - evalCapsuleSDF(px, py, pz - eps);
      const nLen = Math.hypot(nx, ny, nz) || 1.0;
      normAttr.setXYZ(i, nx / nLen, ny / nLen, nz / nLen);

      // Uniform physical-scale 2D planar grid UVs per cube face (zero radial convergence!)
      if (Math.abs(origNz) > 0.5) {
        uvAttr.setXY(i, (px + halfWidth) * uvScale, (py + halfWidth) * uvScale);
      } else if (Math.abs(origNx) > 0.5) {
        uvAttr.setXY(i, (pz - zStart) * uvScale, (py + halfWidth) * uvScale);
      } else {
        uvAttr.setXY(i, (px + halfWidth) * uvScale, (pz - zStart) * uvScale);
      }
    }

    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    geo.computeBoundingSphere();
    return geo;
  }

  /**
   * Helper to orient a box or cylinder beam between two 3D points.
   */
  function createOrientedBoxBeam(pStart, pEnd, width, height, material) {
    const dir = new THREE.Vector3().subVectors(pEnd, pStart);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);

    const forward = dir.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
    const trueUp = new THREE.Vector3().crossVectors(forward, right).normalize();
    const rotMat = new THREE.Matrix4().makeBasis(right, trueUp, forward);
    const quat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, len), material);
    mesh.position.copy(mid);
    mesh.quaternion.copy(quat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, mid, quat, len, right, trueUp, forward };
  }

  function buildFifineAm8BoomMicGroup() {
    const group = new THREE.Group();
    group.name = 'FifineAm8BoomMicGroup';

    const clampPos = new THREE.Vector3(0.245, 0.015, -0.285);
    const elbowPos = new THREE.Vector3(0.110, 0.105, -0.140);
    const micPos = new THREE.Vector3(-0.025, 0.105, -0.045);

    // Compute exact world position of the bottom of the under-mounted U-yoke swivel stem
    const micEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(10.0),
      THREE.MathUtils.degToRad(-28.0),
      0,
      'YXZ'
    );
    const micQuat = new THREE.Quaternion().setFromEuler(micEuler);
    const localSwivelBottom = new THREE.Vector3(0, -0.048, -0.035);
    const wristPos = localSwivelBottom.clone().applyQuaternion(micQuat).add(micPos);

    // 1. Sleek Tapered Cylindrical Desk Clamp Base at [0.245, 0.0, -0.285]
    const clampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.020, 0.036, 24),
      fifineAnodizedBodyMat
    );
    clampBase.position.set(clampPos.x, 0.018, clampPos.z);
    clampBase.castShadow = true;
    clampBase.receiveShadow = true;
    group.add(clampBase);

    const clampCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0125, 0.0125, 0.016, 20),
      gunmetalAlumMat
    );
    clampCollar.position.set(clampPos.x, 0.040, clampPos.z);
    clampCollar.castShadow = true;
    group.add(clampCollar);

    // 2. Simplified Single-Beam Rectangular-Channel Rear Arm (clamp -> elbow)
    const rearStart = new THREE.Vector3(clampPos.x, 0.038, clampPos.z);
    const rearBeam = createOrientedBoxBeam(
      rearStart,
      elbowPos,
      0.019,
      0.016,
      fifineAnodizedBodyMat
    );
    group.add(rearBeam.mesh);

    // 3. Vertical Cylindrical Elbow Hinge Barrel + Brushed Silver Top Cap at [0.110, 0.105, -0.140]
    const elbowBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0135, 0.0135, 0.038, 28),
      fifineAnodizedBodyMat
    );
    elbowBarrel.position.copy(elbowPos);
    elbowBarrel.castShadow = true;
    elbowBarrel.receiveShadow = true;
    group.add(elbowBarrel);

    const elbowSilverCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0126, 0.0126, 0.0026, 28),
      fifineSilverTrimMat
    );
    elbowSilverCap.position.set(elbowPos.x, elbowPos.y + 0.0195, elbowPos.z);
    elbowSilverCap.castShadow = true;
    group.add(elbowSilverCap);

    // 4. Simplified Single-Beam Rectangular-Channel Forearm (elbow -> wristPos underneath U-yoke)
    const forearmBeam = createOrientedBoxBeam(
      elbowPos,
      wristPos,
      0.018,
      0.015,
      fifineAnodizedBodyMat
    );
    group.add(forearmBeam.mesh);

    // Top recessed cable groove strip + 2 flush cable-channel clips along the forearm
    const grooveStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.002, forearmBeam.len * 0.88),
      matteBlackPlasticMat
    );
    grooveStrip.position.copy(forearmBeam.mid).addScaledVector(forearmBeam.trueUp, 0.0076);
    grooveStrip.quaternion.copy(forearmBeam.quat);
    group.add(grooveStrip);

    for (const clipFrac of [0.32, 0.68]) {
      const clipPos = new THREE.Vector3().lerpVectors(elbowPos, wristPos, clipFrac);
      const clipMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.0195, 0.0165, 0.012),
        matteBlackPlasticMat
      );
      clipMesh.position.copy(clipPos);
      clipMesh.quaternion.copy(forearmBeam.quat);
      clipMesh.castShadow = true;
      group.add(clipMesh);
    }

    // 5. Fifine AmpliGame AM8 Microphone Head & Under-Mounted U-Yoke Assembly
    const micAssembly = new THREE.Group();
    micAssembly.name = 'FifineAm8MicHeadAssembly';
    micAssembly.position.copy(micPos);
    micAssembly.quaternion.copy(micQuat);

    // 5A. Front Velvety Charcoal-Black Flock Windscreen (rounded-square prism, z in [-0.001, +0.052])
    const windscreenGeo = createFifineRoundedSquarePrismGeometry({
      halfWidth: 0.0252,
      cornerRadius: 0.0132,
      zStart: -0.001,
      zEnd: 0.052,
      frontDomeLength: 0.011,
      rearBevelLength: 0.002,
      radialSegs: 64,
      axialSegs: 20,
    });
    const windscreenMesh = new THREE.Mesh(windscreenGeo, fifineFlockFoamMat);
    windscreenMesh.name = 'FifineAm8Windscreen';
    windscreenMesh.castShadow = true;
    windscreenMesh.receiveShadow = true;
    micAssembly.add(windscreenMesh);

    // Subtle recessed collar ring between windscreen and rear body (z = -0.0015m)
    const seamCollarGeo = createFifineRoundedSquarePrismGeometry({
      halfWidth: 0.0242,
      cornerRadius: 0.0128,
      zStart: -0.003,
      zEnd: 0.000,
      frontDomeLength: 0.0,
      rearBevelLength: 0.0,
      radialSegs: 48,
      axialSegs: 2,
    });
    const seamCollarMesh = new THREE.Mesh(seamCollarGeo, matteBlackPlasticMat);
    micAssembly.add(seamCollarMesh);

    // 5B. Rear Matte-Black Anodized Aluminum Body (flush rounded-square prism, z in [-0.042, -0.002])
    const bodyGeo = createFifineRoundedSquarePrismGeometry({
      halfWidth: 0.0249,
      cornerRadius: 0.0130,
      zStart: -0.042,
      zEnd: -0.002,
      frontDomeLength: 0.001,
      rearBevelLength: 0.001,
      radialSegs: 64,
      axialSegs: 12,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, fifineAnodizedBodyMat);
    bodyMesh.name = 'FifineAm8RearBody';
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    micAssembly.add(bodyMesh);

    // 5C. Glowing Electric Cyan-Blue Rounded-Square RGB Ring at Rear Edge of Body (z in [-0.0468, -0.0418])
    const rgbRingGeo = createFifineRoundedSquarePrismGeometry({
      halfWidth: 0.0247,
      cornerRadius: 0.0129,
      zStart: -0.0468,
      zEnd: -0.0418,
      frontDomeLength: 0.0,
      rearBevelLength: 0.0,
      radialSegs: 64,
      axialSegs: 4,
    });
    const rgbRingMesh = new THREE.Mesh(rgbRingGeo, blueLedMat);
    rgbRingMesh.name = 'MicBlueLedRing';
    micAssembly.add(rgbRingMesh);

    // Rear Dark End-Cap behind the RGB Ring (z in [-0.0495, -0.0468])
    const rearCapGeo = createFifineRoundedSquarePrismGeometry({
      halfWidth: 0.0244,
      cornerRadius: 0.0128,
      zStart: -0.0495,
      zEnd: -0.0468,
      frontDomeLength: 0.0,
      rearBevelLength: 0.0015,
      radialSegs: 48,
      axialSegs: 3,
    });
    const rearCapMesh = new THREE.Mesh(rearCapGeo, fifineAnodizedBodyMat);
    micAssembly.add(rearCapMesh);

    // Subtle front-top mute/gain indicator micro-LED dot & dial on the matte-black body
    const gainKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042, 0.0042, 0.003, 16),
      fifineAnodizedBodyMat
    );
    gainKnob.position.set(0.0, 0.0255, -0.016);
    micAssembly.add(gainKnob);

    // 5D. Under-Mounted U-Yoke Bracket (mounts on left/right sides at z = -0.021m and sweeps UNDERNEATH to y = -0.035m)
    for (const sideSign of [-1, 1]) {
      const sideX = sideSign * 0.0268;
      // Flat cylindrical matte-black pivot thumbscrew
      const thumbKnob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0092, 0.0092, 0.0065, 24),
        fifineAnodizedBodyMat
      );
      thumbKnob.rotation.z = Math.PI / 2;
      thumbKnob.position.set(sideX, -0.001, -0.021);
      thumbKnob.castShadow = true;
      micAssembly.add(thumbKnob);

      // Thin brushed-silver outer rim on thumbscrew (visible in media_1790347195300.png)
      const thumbSilverRim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0095, 0.0095, 0.0014, 24),
        fifineSilverTrimMat
      );
      thumbSilverRim.rotation.z = Math.PI / 2;
      thumbSilverRim.position.set(sideX + sideSign * 0.0022, -0.001, -0.021);
      micAssembly.add(thumbSilverRim);

      // Sleek flat side arm sweeping downward & backward from (sideX, -0.001, -0.021) to (sideX, -0.034, -0.035)
      const pTop = new THREE.Vector3(sideSign * 0.0258, -0.001, -0.021);
      const pBot = new THREE.Vector3(sideSign * 0.0258, -0.034, -0.035);
      const sideArm = createOrientedBoxBeam(pTop, pBot, 0.0042, 0.014, fifineAnodizedBodyMat);
      micAssembly.add(sideArm.mesh);
    }

    // Bottom horizontal U-yoke bridge plate underneath the rear RGB ring (y = -0.0345, z = -0.035)
    const yokeBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.0558, 0.0045, 0.020),
      fifineAnodizedBodyMat
    );
    yokeBridge.position.set(0, -0.0345, -0.035);
    yokeBridge.castShadow = true;
    yokeBridge.receiveShadow = true;
    micAssembly.add(yokeBridge);

    // Glowing Cyan-Blue Reflection Sheen on the upper inner surface of the bottom U-yoke plate
    const yokeBlueSheen = new THREE.Mesh(
      new THREE.BoxGeometry(0.046, 0.0012, 0.017),
      fifineYokeBlueReflectMat
    );
    yokeBlueSheen.position.set(0, -0.0320, -0.036);
    micAssembly.add(yokeBlueSheen);

    // Bottom Swivel Knuckle + Brushed Silver Lock-Nut Collar connecting U-yoke down to forearm wrist
    const silverLockCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0078, 0.0078, 0.0045, 20),
      fifineSilverTrimMat
    );
    silverLockCollar.position.set(0, -0.039, -0.035);
    micAssembly.add(silverLockCollar);

    const swivelStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0068, 0.0082, 0.012, 20),
      fifineAnodizedBodyMat
    );
    swivelStem.position.set(0, -0.045, -0.035);
    swivelStem.castShadow = true;
    micAssembly.add(swivelStem);

    // Rear USB-C / XLR audio cable curving smoothly from the back of the mic into the forearm channel
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, -0.012, -0.049),
      new THREE.Vector3(0.0, -0.022, -0.064),
      new THREE.Vector3(0.004, -0.036, -0.060),
      new THREE.Vector3(0.010, -0.042, -0.042),
    ]);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 16, 0.0024, 10, false);
    const cableMesh = new THREE.Mesh(cableGeo, matteBlackPlasticMat);
    cableMesh.castShadow = true;
    micAssembly.add(cableMesh);

    group.add(micAssembly);
    return { group, blueLedRing: rgbRingMesh };
  }

  const { group: boomMicGroup, blueLedRing } = buildFifineAm8BoomMicGroup();
  boomMicGroup.name = 'boom_arm_blue_mic';
  root.add(boomMicGroup);

  // -------------------------------------------------------------------------
  // 6. SUBTLE MATTE-PORCELAIN WHITE OVAL DIFFUSED KEY-LIGHT DESK LAMP (Sector 4)
  //    Base: [0.355, 0.0, -0.095], R=0.0925, PoleTop: [0.355, 0.360, -0.095]
  //    V3.0 Calibrated: rounded stadium/pill silhouette, warm porcelain #f4efe6 & diffuser #fff3dc
  // -------------------------------------------------------------------------
  const lampGroup = new THREE.Group();
  lampGroup.name = 'WhiteKeyLightLamp';
  lampGroup.userData.legacyName = 'white_key_light_lamp';
  lampGroup.position.set(0.355, 0.0, -0.095);

  const whitePowderMat = new THREE.MeshStandardMaterial({
    name: 'Mat_LampMatteWhite',
    color: 0xf4efe6,
    roughness: 0.82,
    metalness: 0.03,
    emissive: new THREE.Color(0xfff3dc),
    emissiveIntensity: 0.05,
  });

  // Circular weighted disc base (R = 92.5mm, H = 16mm)
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.0925, 0.016, 40),
    whitePowderMat
  );
  lampBase.position.set(0, 0.008, 0);
  lampBase.castShadow = true;
  lampBase.receiveShadow = true;
  lampGroup.add(lampBase);

  // Slender vertical cylindrical pole (H = 360mm) inside the 360° corkscrew helix
  const lampPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0095, 0.011, 0.36, 24),
    whitePowderMat
  );
  lampPole.position.set(0, 0.18, 0);
  lampPole.castShadow = true;
  lampPole.receiveShadow = true;
  lampGroup.add(lampPole);

  // Rounded Stadium/Pill Key-Light Diffuser Panel Head at Y = 0.360m (W=280mm, H=180mm, D=35mm)
  const lampHeadGroup = new THREE.Group();
  lampHeadGroup.position.set(0, 0.365, 0.012);
  lampHeadGroup.rotation.y = THREE.MathUtils.degToRad(-24.0);
  lampHeadGroup.rotation.x = THREE.MathUtils.degToRad(16.0);

  const lampHousing = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.10, 16, 32),
    whitePowderMat
  );
  lampHousing.rotation.z = Math.PI / 2;
  lampHousing.scale.set(1.0, 1.0, 0.32);
  lampHousing.castShadow = true;
  lampHeadGroup.add(lampHousing);

  const diffuserPanelMat = new THREE.MeshStandardMaterial({
    name: 'Mat_LampWarmDiffuser',
    color: 0xffffff,
    emissive: new THREE.Color(0xfff5e2),
    emissiveIntensity: 1.05,
    roughness: 0.28,
    metalness: 0.02,
  });
  const diffuserFace = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.082, 0.096, 14, 32),
    diffuserPanelMat
  );
  diffuserFace.rotation.z = Math.PI / 2;
  diffuserFace.scale.set(1.0, 1.0, 0.12);
  diffuserFace.position.set(0, 0, 0.016);
  lampHeadGroup.add(diffuserFace);

  lampGroup.add(lampHeadGroup);
  root.add(lampGroup);

  // -------------------------------------------------------------------------
  // 7. LOGITECH G915 LIGHTSPEED FULL-SIZE MECHANICAL KEYBOARD (475 x 150 x 22 mm)
  //    Center: [-0.161, 0.0, 0.135] — Shifted left 76mm for a generous gap to the mouse mat!
  // -------------------------------------------------------------------------
  const kbGroup = new THREE.Group();
  kbGroup.name = 'logitech_g915_keyboard';
  kbGroup.position.set(-0.161, 0.0, 0.135);

  // Lower dark polymer chassis
  const kbLower = new THREE.Mesh(
    new THREE.BoxGeometry(0.475, 0.011, 0.15),
    matteBlackPlasticMat
  );
  kbLower.position.set(0, 0.0055, 0);
  kbLower.castShadow = true;
  kbLower.receiveShadow = true;
  kbGroup.add(kbLower);

  // Brushed 5052 Aluminum Top Deck
  const kbTopDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.473, 0.004, 0.148),
    gunmetalAlumMat
  );
  kbTopDeck.position.set(0, 0.013, 0);
  kbTopDeck.castShadow = true;
  kbTopDeck.receiveShadow = true;
  kbGroup.add(kbTopDeck);

  // Glowing Cyan-Blue Switch Housing Under-Bed (Mat_Switch_Housing)
  const switchHousingMat = new THREE.MeshStandardMaterial({
    name: 'Mat_Switch_Housing',
    color: 0x0a84ff,
    emissive: new THREE.Color(0x00c8ff),
    emissiveIntensity: 2.4,
    roughness: 0.25,
    metalness: 0.1,
  });
  const switchUnderBed = new THREE.Mesh(
    new THREE.BoxGeometry(0.448, 0.0022, 0.112),
    switchHousingMat
  );
  switchUnderBed.position.set(0, 0.0152, 0.005);
  kbGroup.add(switchUnderBed);

  // Warm Amber M2 Pill Button (Top-left 'G' badge removed)
  const m2AmberPill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0048, 0.0048, 0.0022, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      emissive: new THREE.Color(0xffa826),
      emissiveIntensity: 1.85,
    })
  );
  m2AmberPill.position.set(-0.145, 0.0158, -0.058);
  kbGroup.add(m2AmberPill);

  // Signature G915 cylindrical knurled aluminum Volume Roller Wheel (top-right)
  const volWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0055, 0.0055, 0.036, 20),
    gunmetalAlumMat
  );
  volWheel.rotation.z = Math.PI / 2;
  volWheel.position.set(0.195, 0.0165, -0.058);
  volWheel.castShadow = true;
  kbGroup.add(volWheel);

  // 108 Instanced Low-Profile GL Mechanical Keycaps with Cyan-Blue Backlit Glow
  const cols = 21;
  const rows = 6;
  const totalKeys = cols * rows;
  const keyGeo = new THREE.BoxGeometry(0.0165, 0.0065, 0.0155);
  const keyMat = new THREE.MeshStandardMaterial({
    name: 'Mat_Keycap_Legend_UV',
    color: 0x161920,
    roughness: 0.42,
    metalness: 0.18,
    emissive: new THREE.Color(0x00e5ff),
    emissiveIntensity: 2.6,
  });
  const keyInstanced = new THREE.InstancedMesh(keyGeo, keyMat, totalKeys);
  keyInstanced.castShadow = true;
  keyInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const keyColor = new THREE.Color();
  let kIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kx = -0.215 + c * 0.0212;
      const kz = -0.044 + r * 0.0195;
      dummy.position.set(kx, 0.0185, kz);
      // Spacebar wider key on bottom row
      if (r === 5 && c >= 5 && c <= 9) {
        dummy.scale.set(c === 7 ? 4.8 : 0.001, 1.0, 1.0);
      } else {
        dummy.scale.set(1.0, 1.0, 1.0);
      }
      dummy.updateMatrix();
      keyInstanced.setMatrixAt(kIdx, dummy.matrix);

      // Cyan-blue backlit keycap tint matching real G915 photo
      if (c === 0) {
        keyColor.setHex(0x1ce2ff);
      } else if (r >= 2 && r <= 3 && c >= 2 && c <= 4) {
        keyColor.setHex(0x28e8ff);
      } else {
        keyColor.setHex(0x1c222d);
      }
      keyInstanced.setColorAt(kIdx, keyColor);
      kIdx++;
    }
  }
  keyInstanced.instanceMatrix.needsUpdate = true;
  if (keyInstanced.instanceColor) keyInstanced.instanceColor.needsUpdate = true;
  kbGroup.add(keyInstanced);

  root.add(kbGroup);

  // -------------------------------------------------------------------------
  // 8. RAZER HARD MOUSE MAT + STEALTH BLACK WIRELESS ERGONOMIC GAMING MOUSE (Sector 5)
  //    Mat: [0.325, 0.0, 0.135] (340 x 265 x 3 mm)
  //    Mouse: [0.285, 0.003, 0.115] (75 x 130 x 42 mm, RotY = -10 deg)
  //    V3.0: Pure stealth charcoal/matte-black mouse (<= 0x22252c, zero green/silver!)
  // -------------------------------------------------------------------------
  const mouseMatGroup = new THREE.Group();
  mouseMatGroup.name = 'razer_mat_and_mouse';

  // Micro-textured dark polycarbonate Razer Mouse Mat
  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.336, 0.003, 0.261),
    new THREE.MeshStandardMaterial({
      color: 0x13161d,
      roughness: 0.48,
      metalness: 0.15,
    })
  );
  matMesh.position.set(0.325, 0.0015, 0.135);
  matMesh.receiveShadow = true;
  mouseMatGroup.add(matMesh);

  // Stealth dark charcoal edge bevel on the mouse mat
  const matTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.337, 0.0018, 0.262),
    new THREE.MeshStandardMaterial({
      color: 0x181b22,
      roughness: 0.55,
      metalness: 0.12,
    })
  );
  matTrim.position.set(0.325, 0.0009, 0.135);
  mouseMatGroup.add(matTrim);

  // Sculpted Stealth Charcoal/Black Wireless Ergonomic Gaming Mouse inside Sector 5 C-turn apex
  const mouseGroup = new THREE.Group();
  mouseGroup.name = 'RazerMatAndGamingMouse';
  mouseGroup.position.set(0.285, 0.003, 0.115);
  mouseGroup.rotation.y = THREE.MathUtils.degToRad(-10.0);

  const mouseShellMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MouseShell_Matte',
    color: 0x16181d,
    roughness: 0.52,
    metalness: 0.12,
  });
  const mouseGripMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MouseRubber_Grip',
    color: 0x101216,
    roughness: 0.82,
    metalness: 0.04,
  });
  const mouseTrimMat = new THREE.MeshStandardMaterial({
    name: 'Mat_MouseGloss_Trim',
    color: 0x1f2229,
    roughness: 0.24,
    metalness: 0.18,
  });

  const mouseShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 28, 22),
    mouseShellMat
  );
  mouseShell.scale.set(0.98, 0.58, 1.78);
  mouseShell.position.set(0, 0.018, 0);
  mouseShell.castShadow = true;
  mouseShell.receiveShadow = true;
  mouseGroup.add(mouseShell);

  // Left ergonomic thumb rest wing in textured dark rubber
  const thumbWing = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 18, 14),
    mouseGripMat
  );
  thumbWing.scale.set(0.85, 0.32, 1.85);
  thumbWing.position.set(-0.026, 0.007, 0.004);
  mouseGroup.add(thumbWing);

  // Stealth dark scroll wheel (zero green/silver emission)
  const scrollWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0065, 0.005, 18),
    mouseTrimMat
  );
  scrollWheel.rotation.z = Math.PI / 2;
  scrollWheel.position.set(0, 0.035, -0.028);
  mouseGroup.add(scrollWheel);

  mouseMatGroup.add(mouseGroup);
  root.add(mouseMatGroup);

  // -------------------------------------------------------------------------
  // 9. PERSISTENT NIGHT-SCENE DESK GLOW GROUP (`nightGlowGroup`)
  //    Remains visible even when `desk_props.glb` hides `diorama.root`:
  //    - Vivid Cyan RGB Mousepad Perimeter Border (`radius = 2.25mm`, `borderY = 0.0020`, `toneMapped: false`)
  //    - Saturated Cyan-Blue Desk Surface Light Bleed & Rim Reflection (`PlaneGeometry(0.46, 0.38)`, `Y = 0.00045`)
  // -------------------------------------------------------------------------
  const nightGlowGroup = new THREE.Group();
  nightGlowGroup.name = 'DeskNightGlowGroup';

  // Build a smooth rounded-rectangle 3D curve around the 340mm x 265mm mouse mat perimeter
  const matCx = 0.325;
  const matCz = 0.135;
  const matHw = 0.1704;
  const matHd = 0.1329;
  const cornerR = 0.0052;
  const borderY = 0.0020;
  const borderPts = [];
  const corners = [
    { cx: matCx + matHw - cornerR, cz: matCz - matHd + cornerR, a0: -Math.PI * 0.5, a1: 0.0 },
    { cx: matCx + matHw - cornerR, cz: matCz + matHd - cornerR, a0: 0.0, a1: Math.PI * 0.5 },
    { cx: matCx - matHw + cornerR, cz: matCz + matHd - cornerR, a0: Math.PI * 0.5, a1: Math.PI },
    { cx: matCx - matHw + cornerR, cz: matCz - matHd + cornerR, a0: Math.PI, a1: Math.PI * 1.5 },
  ];
  for (let c = 0; c < 4; c++) {
    const corner = corners[c];
    const nextCorner = corners[(c + 1) % 4];
    const arcSteps = 12;
    for (let s = 0; s <= arcSteps; s++) {
      const ang = corner.a0 + (corner.a1 - corner.a0) * (s / arcSteps);
      borderPts.push(
        new THREE.Vector3(
          corner.cx + Math.cos(ang) * cornerR,
          borderY,
          corner.cz + Math.sin(ang) * cornerR
        )
      );
    }
    // Add intermediate straight-edge points so CatmullRomCurve3 stays razor-straight along all 4 sides
    const pEnd = borderPts[borderPts.length - 1];
    const nextStart = new THREE.Vector3(
      nextCorner.cx + Math.cos(nextCorner.a0) * cornerR,
      borderY,
      nextCorner.cz + Math.sin(nextCorner.a0) * cornerR
    );
    for (let k = 1; k <= 8; k++) {
      borderPts.push(new THREE.Vector3().lerpVectors(pEnd, nextStart, k / 9));
    }
  }
  const mousepadBorderCurve = new THREE.CatmullRomCurve3(borderPts, true, 'centripetal', 0.05);
  const mousepadBorderGeo = new THREE.TubeGeometry(mousepadBorderCurve, 180, 0.00225, 16, true);
  const mousepadBorderMat = new THREE.ShaderMaterial({
    name: 'Mat_MousepadCyanRGB',
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
        float coreFactor = pow(ndv, 1.75);
        vec3 outerCyan = vec3(0.0, 0.88, 1.0);
        vec3 innerCore = vec3(0.55, 0.98, 1.0);
        vec3 col = mix(outerCyan, innerCore, coreFactor);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mousepadBorderTube = new THREE.Mesh(mousepadBorderGeo, mousepadBorderMat);
  mousepadBorderTube.name = 'MousepadCyanRgbBorderTube';
  mousepadBorderTube.castShadow = false;
  mousepadBorderTube.receiveShadow = false;
  nightGlowGroup.add(mousepadBorderTube);

  // Vivid Saturated Cyan RGB Light Bleed on the Oak Desk Surface + Subtle Inner Rim Reflection (zero dynamic lights!)
  const mousepadDeskGlowUniforms = {
    uColor: { value: new THREE.Color(0x00ebff) },
    uIntensity: { value: 1.0 },
  };
  const mousepadDeskGlowMat = new THREE.ShaderMaterial({
    uniforms: mousepadDeskGlowUniforms,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    vertexShader: /* glsl */ `
      varying vec2 vLocalXZ;
      void main() {
        // PlaneGeometry is rotated -90 deg X so local (position.x, -position.y) maps to (X, Z)
        vLocalXZ = vec2(position.x, -position.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vLocalXZ;
      void main() {
        // Signed distance to rounded rectangle (half-size = (0.1704, 0.1329), corner radius = 0.0055)
        vec2 b = vec2(0.1649, 0.1274);
        vec2 d = abs(vLocalXZ) - b;
        float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.0055;

        // Strong vivid cyan border glow right along sdf = 0
        float core = exp(-abs(sdf) * 240.0) * 0.95;
        // Saturated cyan-blue halo bleeding 34mm onto the surrounding oak desk (strictly sdf >= 0)
        float outerDist = max(0.0, sdf);
        float outerFade = 1.0 - smoothstep(0.0, 0.034, outerDist);
        float outerHalo = (sdf >= 0.0) ? (outerFade * exp(-outerDist * 68.0) * 0.65) : 0.0;
        // Subtle 10mm inward cyan rim reflection on the black mouse mat border (strictly sdf < 0)
        float innerDist = max(0.0, -sdf);
        float innerFade = 1.0 - smoothstep(0.0, 0.010, innerDist);
        float innerRim = (sdf < 0.0) ? (innerFade * exp(-innerDist * 180.0) * 0.32) : 0.0;

        float totalGlow = core + outerHalo + innerRim;

        vec3 borderCyan = vec3(0.0, 0.94, 1.0);
        vec3 haloCyanBlue = vec3(0.0, 0.58, 1.0);
        float coreBlend = exp(-abs(sdf) * 150.0);
        vec3 col = mix(haloCyanBlue, borderCyan, coreBlend);

        float alpha = clamp(totalGlow * uIntensity, 0.0, 0.94);
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mousepadDeskGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.38),
    mousepadDeskGlowMat
  );
  mousepadDeskGlowPlane.rotation.x = -Math.PI / 2;
  mousepadDeskGlowPlane.position.set(matCx, 0.00045, matCz);
  mousepadDeskGlowPlane.name = 'MousepadCyanDeskGlowPlane';
  mousepadDeskGlowPlane.castShadow = false;
  mousepadDeskGlowPlane.receiveShadow = false;
  nightGlowGroup.add(mousepadDeskGlowPlane);

  const nightWindowTex = createNightWindowTexture();
  blindSlatMat.map = nightWindowTex;
  blindSlatMat.emissiveMap = nightWindowTex;
  blindSlatMat.color.setHex(0xffffff);
  blindSlatMat.emissive.setHex(0xffffff);
  blindSlatMat.emissiveIntensity = 0.45;
  blindSlatMat.fog = false;

  diffuserPanelMat.color.setHex(0xffd29e);
  diffuserPanelMat.emissive.setHex(0xff9636);
  diffuserPanelMat.emissiveIntensity = 1.65;

  const glbMicLedMaterials = [blueLedMat];
  const goldenWindowMaterials = [blindSlatMat];
  const lampDiffuserMaterials = [diffuserPanelMat];
  let currentSunScale = 0.0;
  let currentLampScale = 1.15;
  let lastAppliedSunScale = -1;
  let lastAppliedLampScale = -1;

  /**
   * Dynamically updates all Mat_GoldenHourWindow and Mat_LampWarmDiffuser meshes
   * so the night window and warm/orange desk lamp respond live to the user's lighting sliders.
   */
  function updateLightingMaterials(sunScale = 0.0, lampScale = 1.15) {
    currentSunScale = sunScale;
    currentLampScale = lampScale;
    if (
      Math.abs(sunScale - lastAppliedSunScale) < 1e-4 &&
      Math.abs(lampScale - lastAppliedLampScale) < 1e-4
    ) {
      return;
    }
    lastAppliedSunScale = sunScale;
    lastAppliedLampScale = lampScale;

    for (const mat of goldenWindowMaterials) {
      if (!mat) continue;
      mat.map = nightWindowTex;
      mat.emissiveMap = nightWindowTex;
      mat.fog = false;
      if (mat.color) {
        mat.color.setHex(0xffffff);
      }
      if (mat.emissive) {
        mat.emissive.setHex(0xffffff);
      }
      mat.emissiveIntensity = 0.42 + 0.10 * lampScale;
      mat.needsUpdate = true;
    }
    const targetLampEmissive = 0.35 + 1.25 * lampScale;
    for (const mat of lampDiffuserMaterials) {
      if (!mat) continue;
      if (mat.color) mat.color.setHex(0xffcfa0);
      if (mat.emissive) mat.emissive.setHex(0xff9636);
      mat.emissiveIntensity = targetLampEmissive;
    }
  }

  /**
   * Ensures spherical/cylindrical UVs exist on a microphone capsule windscreen mesh
   * so mic_foam_v4_albedo_2k and mic_foam_v4_normal_2k map across every cell pore.
   */
  function ensureSphericalWindscreenUVs(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
    const pos = geometry.attributes.position;
    const count = pos.count;
    const existingUv = geometry.attributes.uv;
    if (existingUv && existingUv.count === count) {
      let hasSpan = false;
      const u0 = existingUv.getX(0);
      const v0 = existingUv.getY(0);
      for (let i = 1; i < Math.min(count, 64); i++) {
        if (Math.abs(existingUv.getX(i) - u0) > 1e-3 || Math.abs(existingUv.getY(i) - v0) > 1e-3) {
          hasSpan = true;
          break;
        }
      }
      if (hasSpan) return;
    }

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    const size = new THREE.Vector3();
    bb.getSize(size);
    const maxDim = Math.max(1e-4, size.length() * 0.5);

    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const dx = (pos.getX(i) - center.x) / maxDim;
      const dy = (pos.getY(i) - center.y) / maxDim;
      const dz = (pos.getZ(i) - center.z) / maxDim;
      const u = 0.5 + Math.atan2(dx, dz) / (Math.PI * 2.0);
      const v = 0.5 + Math.asin(THREE.MathUtils.clamp(dy, -1.0, 1.0)) / Math.PI;
      uvs[i * 2 + 0] = u * 2.5;
      uvs[i * 2 + 1] = v * 2.5;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
  }

  /**
   * Ensures planar tabletop UVs exist on OakDeskTabletop so oak wood grain has zero triangle shear.
   */
  function ensurePlanarDeskUVs(geometry, forcePlanar = false) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
    const pos = geometry.attributes.position;
    const count = pos.count;
    const existingUv = geometry.attributes.uv;
    if (!forcePlanar && existingUv && existingUv.count === count) {
      let hasSpan = false;
      const u0 = existingUv.getX(0);
      const v0 = existingUv.getY(0);
      for (let i = 1; i < Math.min(count, 64); i++) {
        if (Math.abs(existingUv.getX(i) - u0) > 1e-3 || Math.abs(existingUv.getY(i) - v0) > 1e-3) {
          hasSpan = true;
          break;
        }
      }
      if (hasSpan) return;
    }
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      uvs[i * 2 + 0] = (pos.getX(i) + 0.70) / 1.40;
      uvs[i * 2 + 1] = (pos.getZ(i) + 0.35) / 0.70;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
  }

  /**
   * Ensures [0, 1] x [0, 1] planar front-face UVs on the LG 27" monitor screen
   * geometry so the 16:9 High Scores CanvasTexture maps across the entire
   * screen without tiling or cropping.
   */
  function ensurePlanarMonitorScreenUVs(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position)
      return;
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const spanX = Math.max(1e-4, bb.max.x - bb.min.x);
    const spanY = Math.max(1e-4, bb.max.y - bb.min.y);
    const pos = geometry.attributes.position;
    const count = pos.count;
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      uvs[i * 2 + 0] =
          THREE.MathUtils.clamp((pos.getX(i) - bb.min.x) / spanX, 0.0, 1.0);
      uvs[i * 2 + 1] =
          THREE.MathUtils.clamp((pos.getY(i) - bb.min.y) / spanY, 0.0, 1.0);
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
  }

  /**
   * Traverses loaded desk_props.glb and calibrates materials for the Night-Time Scene:
   * - Hides legacy mini studio wall (Mat_WarmStudioWall) & squat window (Mat_WindowFrame, Mat_GoldenHourWindow)
   * - Removes legacy floating oak window sill from Mat_OakWood geometry
   * - Mat_FoamWindscreen: applies mic_foam_v4_albedo_2k, mic_foam_v4_normal_2k, mic_foam_v4_roughness_2k
   * - Mat_OakWood: applies oak_wood_normal_2k, oak_wood_roughness_2k
   * - Mat_MonitorScreen / Mat_MonitorSatinScreen: anti-glare dark matte screen
   * - Mat_Keycap_Legend_UV & Mat_Switch_Housing: boosted vivid cyan RGB backlight
   * - WhiteKeyLightLamp / Mat_LampWarmDiffuser: warm/orange key-light glow (#ff9636)
   */
  function calibrateDeskPropsGlb(glbScene) {
    if (!glbScene) return;

    if (glbScene.parent) {
      calibrateTrackCoasterGlb(glbScene.parent);
    }

    const warmOrangeDiffuser = new THREE.Color(0xff9636);
    const electricBlue = new THREE.Color(0x1e6bff);

    // Shift LogitechG915Keyboard left by 0.076m (76mm) for a generous ~78.5mm gap between keyboard and mouse pad
    glbScene.traverse((node) => {
      if (
        (node.name === 'LogitechG915Keyboard' || node.name === 'logitech_g915_keyboard') &&
        !node.userData._kbShiftedLeft
      ) {
        let ancestorShifted = false;
        let p = node.parent;
        while (p) {
          if (p.userData && p.userData._kbShiftedLeft) {
            ancestorShifted = true;
            break;
          }
          p = p.parent;
        }
        if (!ancestorShifted) {
          node.userData._kbShiftedLeft = true;
          node.position.x -= 0.076;
          node.updateMatrixWorld(true);
        }
      }
    });

    function attachPropUnderTrackGlow(mat) {
      if (!mat || mat.userData._hasPropTrackGlowHook) return;
      mat.userData._hasPropTrackGlowHook = true;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTrackLedTime = sharedUnderTrackUniforms.uTime;
        shader.uniforms.uTrackLedIntensity = sharedUnderTrackUniforms.uIntensity;
        shader.uniforms.uTrackGlowFieldTex = sharedUnderTrackUniforms.uGlowFieldTex;
        shader.vertexShader =
          `varying vec3 vPropWorldPos;\nvarying vec3 vPropWorldNormal;\n` +
          shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
             vPropWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
             vPropWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
          );
        shader.fragmentShader =
          `uniform float uTrackLedTime;
           uniform float uTrackLedIntensity;
           uniform sampler2D uTrackGlowFieldTex;
           varying vec3 vPropWorldPos;
           varying vec3 vPropWorldNormal;
           vec3 evalTrackLedPalette(float phaseNorm, float timeSec) {
             float p = fract(phaseNorm - timeSec * 0.055 + 0.08);
             float seg = p * 4.0;
             int idx = int(floor(seg));
             float f = smoothstep(0.0, 1.0, fract(seg));
             vec3 cPink   = vec3(1.00, 0.05, 0.55);
             vec3 cPurple = vec3(0.54, 0.03, 1.00);
             vec3 cBlue   = vec3(0.00, 0.54, 1.00);
             vec3 cViolet = vec3(0.66, 0.05, 1.00);
             if (idx == 0) return mix(cPink, cPurple, f);
             if (idx == 1) return mix(cPurple, cBlue, f);
             if (idx == 2) return mix(cBlue, cViolet, f);
             return mix(cViolet, cPink, f);
           }\n` +
          shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `vec2 fieldUv = vec2((vPropWorldPos.x - (-0.58)) / 1.16, (vPropWorldPos.z - (-0.34)) / 0.68);
             if (fieldUv.x >= 0.0 && fieldUv.x <= 1.0 && fieldUv.y >= 0.0 && fieldUv.y <= 1.0 && vPropWorldPos.y >= 0.0008 && vPropWorldPos.y <= 0.195) {
               vec4 tField = texture2D(uTrackGlowFieldTex, fieldUv);
               float tWeight = tField.r;
               if (tWeight > 0.01) {
                 float sinP = tField.g * 2.0 - 1.0;
                 float cosP = tField.b * 2.0 - 1.0;
                 float sNorm = atan(sinP, cosP) / 6.2831853 + 0.5;
                 vec3 tCol = evalTrackLedPalette(sNorm, uTrackLedTime);
                 float normalUp = clamp(vPropWorldNormal.y * 0.55 + 0.45, 0.15, 1.0);
                 float hMask = smoothstep(0.0008, 0.004, vPropWorldPos.y) * (1.0 - smoothstep(0.13, 0.195, vPropWorldPos.y));
                 vec3 surfTint = 0.22 + 0.78 * clamp(gl_FragColor.rgb * 2.2, 0.0, 1.0);
                 gl_FragColor.rgb += tCol * surfTint * (pow(tWeight, 1.18) * normalUp * hMask * 0.32 * uTrackLedIntensity);
               }
             }
             #include <dithering_fragment>`
          );
      };
    }

    // Attach under-track RGB glow to the Fifine AM8 body & low-profile boom arm materials
    attachPropUnderTrackGlow(fifineAnodizedBodyMat);
    attachPropUnderTrackGlow(fifineSilverTrimMat);

    glbScene.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;
      if (child.geometry && !child.geometry.boundingSphere) {
        child.geometry.computeBoundingSphere();
      }

      let isLampMesh = false;
      let isMouseHierarchy = false;
      let isKeyboardHierarchy = false;
      let isWindowMesh = false;
      let isMonitorHierarchy = false;
      let isLegacyMicHierarchy = false;
      let isFifineReplacement = false;
      let curr = child;
      while (curr) {
        if (curr.userData && curr.userData._isFifineReplacement) {
          isFifineReplacement = true;
        }
        const n = (curr.name || '').toLowerCase();
        if (n.includes('whitekeylightlamp') || n.includes('key_light_lamp') || n.includes('lamp')) {
          isLampMesh = true;
        }
        if (
          n.includes('razermatandgamingmouse') ||
          n.includes('gamingmouse') ||
          n.includes('mouse')
        ) {
          isMouseHierarchy = true;
        }
        if (n.includes('logitechg915') || n.includes('keyboard')) {
          isKeyboardHierarchy = true;
        }
        if (n.includes('window')) {
          isWindowMesh = true;
        }
        if (n.includes('monitor') || n.includes('ultragear')) {
          isMonitorHierarchy = true;
        }
        if (n.includes('boomarm') || n.includes('bluemic') || n.includes('mic')) {
          isLegacyMicHierarchy = true;
        }
        curr = curr.parent;
      }

      if (isFifineReplacement) {
        return;
      }

      // Hide legacy round-cylinder BoomArmAndBlueMic from desk_props.glb so the Fifine AM8 replacement renders cleanly
      if (isLegacyMicHierarchy) {
        child.visible = false;
        child.castShadow = false;
        child.receiveShadow = false;
        return;
      }

      // Remove top-left 'G' logo badge geometry (x < -0.204, z < -0.044, y > 0.0139) from keyboard child meshes
      if (
        isKeyboardHierarchy &&
        child.geometry &&
        child.geometry.attributes &&
        child.geometry.attributes.position &&
        !child.geometry.userData._gBadgeRemoved
      ) {
        const firstMatName = Array.isArray(child.material)
          ? (child.material[0] && child.material[0].name) || ''
          : (child.material && child.material.name) || '';
        if (firstMatName !== 'Mat_GunmetalAlu' && firstMatName !== 'Mat_Keycap_Side') {
          child.geometry.userData._gBadgeRemoved = true;
          const pos = child.geometry.attributes.position;
          const isGBadgeVert = (idx) =>
            pos.getX(idx) < -0.204 && pos.getZ(idx) < -0.044 && pos.getY(idx) > 0.0139;
          if (child.geometry.index) {
            const idxArr = child.geometry.index.array;
            const keptIndices = [];
            let removedAny = false;
            for (let t = 0; t + 2 < idxArr.length; t += 3) {
              const i0 = idxArr[t];
              const i1 = idxArr[t + 1];
              const i2 = idxArr[t + 2];
              if (isGBadgeVert(i0) || isGBadgeVert(i1) || isGBadgeVert(i2)) {
                removedAny = true;
              } else {
                keptIndices.push(i0, i1, i2);
              }
            }
            if (removedAny) {
              child.geometry.setIndex(keptIndices);
            }
          }
          let collapsedAny = false;
          for (let i = 0; i < pos.count; i++) {
            if (isGBadgeVert(i)) {
              pos.setXYZ(i, -0.220, 0.005, -0.056);
              collapsedAny = true;
            }
          }
          if (collapsedAny) {
            pos.needsUpdate = true;
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
          }
        }
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        const matName = mat.name || '';

        // Hide legacy mini studio wall & squat window from desk_props.glb so room_environment.glb's North wall & tall window render cleanly
        if (
          matName === 'Mat_WarmStudioWall' ||
          matName === 'Mat_WindowFrame' ||
          matName === 'Mat_GoldenHourWindow' ||
          isWindowMesh
        ) {
          child.visible = false;
          child.castShadow = false;
          child.receiveShadow = false;
          continue;
        }

        // Shine under-track Purple / Hot Pink / Electric Blue light onto 3D items on the desk below the track
        const isMonitorScreenMat =
          matName === 'Mat_MonitorScreen' ||
          matName === 'Mat_MonitorSatinScreen' ||
          (isMonitorHierarchy && (child.name || '').toLowerCase().includes('screen'));
        const isLampDiffuserMat =
          matName === 'Mat_LampWarmDiffuser' ||
          (isLampMesh && (child.name || '').toLowerCase().includes('diffuser'));
        if (
          matName !== 'Mat_OakWood' &&
          matName !== 'Mat_Keycap_Legend_UV' &&
          matName !== 'Mat_Switch_Housing' &&
          matName !== 'Mat_FoamWindscreen' &&
          !isMonitorScreenMat &&
          !isLampDiffuserMat
        ) {
          attachPropUnderTrackGlow(mat);
        }

        // 0A. Desk Mousepad logo removal, shadow acne & corner rounding fix
        if (
          matName === 'Mat_RazerMouseMat' ||
          matName === 'Mat_MousepadCloth' ||
          matName === 'RazerMouseMat' ||
          (isMouseHierarchy && matName.toLowerCase().includes('mat'))
        ) {
          child.castShadow = false;
          child.receiveShadow = true;
          // Replace the GLB embedded texture (which had a 3-snake corner
          // emblem) with a 100% logo-free micro-woven dark charcoal surface
          if (!glbScene.userData._logoFreeMousepadTex) {
            const mpCanvas = document.createElement('canvas');
            mpCanvas.width = 512;
            mpCanvas.height = 512;
            const mpCtx = mpCanvas.getContext('2d');
            mpCtx.fillStyle = '#181a20';
            mpCtx.fillRect(0, 0, 512, 512);
            const mpData = mpCtx.getImageData(0, 0, 512, 512);
            const d = mpData.data;
            for (let i = 0; i < d.length; i += 4) {
              const px = (i >> 2) & 511;
              const py = (i >> 11) & 511;
              const weave = (((px * 73 + py * 151) ^ (px * 19)) & 7) - 3.5;
              d[i] = Math.max(12, Math.min(38, 24 + weave));
              d[i + 1] = Math.max(14, Math.min(40, 26 + weave));
              d[i + 2] = Math.max(18, Math.min(46, 32 + weave));
              d[i + 3] = 255;
            }
            mpCtx.putImageData(mpData, 0, 0);
            const mpTex = new THREE.CanvasTexture(mpCanvas);
            mpTex.colorSpace = THREE.SRGBColorSpace;
            mpTex.wrapS = THREE.ClampToEdgeWrapping;
            mpTex.wrapT = THREE.ClampToEdgeWrapping;
            mpTex.anisotropy = 4;
            glbScene.userData._logoFreeMousepadTex = mpTex;
          }
          if (mat.map && mat.map !== glbScene.userData._logoFreeMousepadTex) {
            mat.map.dispose();
          }
          mat.map = glbScene.userData._logoFreeMousepadTex;
          if (mat.color) mat.color.setHex(0xffffff);
          mat.roughness = 0.68;
          mat.metalness = 0.04;
          mat.needsUpdate = true;

          if (
            child.geometry &&
            child.geometry.attributes &&
            child.geometry.attributes.position &&
            !child.geometry.userData._cornersRoundedForRgbTube
          ) {
            child.geometry.userData._cornersRoundedForRgbTube = true;
            const pos = child.geometry.attributes.position;
            const matCx = 0.325;
            const matCz = 0.135;
            const innerHw = 0.1692;
            const innerHd = 0.1317;
            const rCorner = 0.0056;
            const boxHw = innerHw - rCorner;
            const boxHd = innerHd - rCorner;
            for (let i = 0; i < pos.count; i++) {
              const vy = pos.getY(i);
              if (vy <= 0.0038) {
                const dx = pos.getX(i) - matCx;
                const dz = pos.getZ(i) - matCz;
                const qx = Math.max(0.0, Math.abs(dx) - boxHw);
                const qz = Math.max(0.0, Math.abs(dz) - boxHd);
                const cornerDist = Math.hypot(qx, qz);
                if (cornerDist > rCorner) {
                  const clampedX = (boxHw + (qx / cornerDist) * rCorner) * Math.sign(dx);
                  const clampedZ = (boxHd + (qz / cornerDist) * rCorner) * Math.sign(dz);
                  pos.setX(i, matCx + clampedX);
                  pos.setZ(i, matCz + clampedZ);
                }
              }
            }
            pos.needsUpdate = true;
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
          }
          continue;
        }

        // 0B. V5.3 Rich Warm Medium Honey-Oak Desk Tabletop (Strictly Mat_OakWood ONLY!)
        if (matName === 'Mat_OakWood') {
          if (child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
            const pos = child.geometry.attributes.position;
            if (child.geometry.index) {
              const idxAttr = child.geometry.index;
              const idxArr = idxAttr.array;
              const keptIndices = [];
              let filtered = false;
              for (let t = 0; t + 2 < idxArr.length; t += 3) {
                const i0 = idxArr[t];
                const i1 = idxArr[t + 1];
                const i2 = idxArr[t + 2];
                const isSill =
                  pos.getZ(i0) < -0.315 || pos.getY(i0) > 0.015 ||
                  pos.getZ(i1) < -0.315 || pos.getY(i1) > 0.015 ||
                  pos.getZ(i2) < -0.315 || pos.getY(i2) > 0.015;
                if (isSill) {
                  filtered = true;
                } else {
                  keptIndices.push(i0, i1, i2);
                }
              }
              if (filtered) {
                child.geometry.setIndex(keptIndices);
              }
            }
            let sillCollapsed = false;
            for (let i = 0; i < pos.count; i++) {
              if (pos.getZ(i) < -0.315 || pos.getY(i) > 0.015) {
                pos.setXYZ(i, 0.0, -0.01, 0.0);
                sillCollapsed = true;
              }
            }
            if (sillCollapsed) {
              pos.needsUpdate = true;
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
            }
            ensurePlanarDeskUVs(child.geometry, true);
          }
          child.castShadow = false;
          child.receiveShadow = true;
          if (mat.color) mat.color.setHex(0xffffff);
          if (!mat.map) {
            mat.map = oakWoodAlbedoTex || oakColor;
          } else {
            mat.map.anisotropy = 16;
          }
          mat.normalMap = null;
          mat.normalScale = new THREE.Vector2(0.0, 0.0);
          if (!mat.roughnessMap) {
            mat.roughnessMap = oakWoodRoughnessTex;
          }
          mat.roughness = 0.74;
          mat.metalness = 0.01;
          mat.needsUpdate = true;
          continue;
        }

        if (matName === 'Mat_BlackSteel') {
          mat.map = null;
          if (mat.color) mat.color.setHex(0x181a20);
          mat.roughness = 0.36;
          mat.metalness = 0.82;
          mat.needsUpdate = true;
          continue;
        }

        // 0C. V5.2 LG UltraGear Monitor Anti-Glare Matte Panel (High Scores
        // display in Camera View 8)
        if (
          matName === 'Mat_MonitorScreen' ||
          matName === 'Mat_MonitorSatinScreen' ||
          (isMonitorHierarchy && (child.name || '').toLowerCase().includes('screen'))
        ) {
          ensurePlanarMonitorScreenUVs(child.geometry);
          attachMonitorScreenSubtleReflection(mat);
          if (!monitorScreenMaterials.includes(mat)) {
            monitorScreenMaterials.push(mat);
          }
          applyMonitorScreenMaterialState(mat, monitorHighScoresVisible);
          continue;
        }

        // 2. Logitech G915 Glowing Cyan-Blue Keycap Legends (Mat_Keycap_Legend_UV) — with top-left 'G' logo removed
        if (matName === 'Mat_Keycap_Legend_UV') {
          const srcTex = mat.map || mat.emissiveMap;
          if (srcTex && srcTex.image && !glbScene.userData._gFreeKeyboardTex) {
            const img = srcTex.image;
            const kw = img.width || 4096;
            const kh = img.height || 1536;
            const kbCanvas = document.createElement('canvas');
            kbCanvas.width = kw;
            kbCanvas.height = kh;
            const kbCtx = kbCanvas.getContext('2d');
            kbCtx.drawImage(img, 0, 0, kw, kh);
            // Paint over the top-left 'G' logo emblem at (-0.220, +0.056) -> u < 0.08, v_top < 0.22
            kbCtx.fillStyle = '#121417';
            kbCtx.fillRect(0, 0, Math.round(kw * 0.08), Math.round(kh * 0.22));
            const cleanKbTex = new THREE.CanvasTexture(kbCanvas);
            cleanKbTex.colorSpace = THREE.SRGBColorSpace;
            cleanKbTex.flipY = srcTex.flipY;
            cleanKbTex.wrapS = srcTex.wrapS;
            cleanKbTex.wrapT = srcTex.wrapT;
            cleanKbTex.anisotropy = 8;
            glbScene.userData._gFreeKeyboardTex = cleanKbTex;
          }
          if (glbScene.userData._gFreeKeyboardTex) {
            mat.map = glbScene.userData._gFreeKeyboardTex;
            mat.emissiveMap = glbScene.userData._gFreeKeyboardTex;
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x00e5ff);
          } else {
            mat.emissive = new THREE.Color(0x00e5ff);
          }
          mat.emissiveIntensity = 2.6;
          mat.needsUpdate = true;
          continue;
        }

        // 3. Logitech G915 Glowing Cyan-Blue Switch Housing Under-Glow (Mat_Switch_Housing)
        if (matName === 'Mat_Switch_Housing') {
          if (mat.color) {
            mat.color.setHex(0x0a84ff);
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x00c8ff);
          } else {
            mat.emissive = new THREE.Color(0x00c8ff);
          }
          mat.emissiveIntensity = 2.4;
          mat.needsUpdate = true;
          continue;
        }

        // 4. Stealth Dark Charcoal/Black Gaming Mouse Safety Guarantee
        if (
          isMouseHierarchy ||
          matName === 'Mat_MouseShell_Matte' ||
          matName === 'Mat_MouseRubber_Grip' ||
          matName === 'Mat_MouseGloss_Trim'
        ) {
          if (mat.color) {
            if (matName === 'Mat_MouseRubber_Grip') {
              mat.color.setHex(0x101216);
            } else if (matName === 'Mat_MouseGloss_Trim') {
              mat.color.setHex(0x1f2229);
            } else {
              const maxR = 0x22 / 255;
              const maxG = 0x25 / 255;
              const maxB = 0x2c / 255;
              if (mat.color.r > maxR || mat.color.g > maxG || mat.color.b > maxB) {
                mat.color.setHex(0x16181d);
              }
            }
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x000000);
          }
          mat.emissiveIntensity = 0.0;
          if (mat.metalness !== undefined) {
            mat.metalness = Math.min(mat.metalness, 0.22);
          }
          if (mat.roughness !== undefined) {
            mat.roughness =
              matName === 'Mat_MouseGloss_Trim'
                ? 0.24
                : matName === 'Mat_MouseRubber_Grip'
                  ? 0.82
                  : Math.max(0.45, mat.roughness);
          }
          mat.needsUpdate = true;
          continue;
        }

        // 5. Warm/Orange Key-Light Desk Lamp: Glowing Warm Amber-Orange Diffuser + Warm-Tinted Porcelain Bezel
        if (
          isLampMesh ||
          matName === 'Mat_LampWarmDiffuser' ||
          matName === 'Mat_LampMatteWhite' ||
          matName === 'Mat_LampTrayRecess'
        ) {
          const isDiffuser =
            matName === 'Mat_LampWarmDiffuser' ||
            (child.name || '').toLowerCase().includes('diffuser');
          if (isDiffuser) {
            if (mat.color) mat.color.setHex(0xffcfa0);
            if (mat.emissive) mat.emissive.copy(warmOrangeDiffuser);
            mat.emissiveIntensity = 0.35 + 1.25 * currentLampScale;
            mat.roughness = 0.30;
            mat.metalness = 0.02;
            if (!lampDiffuserMaterials.includes(mat)) {
              lampDiffuserMaterials.push(mat);
            }
          } else {
            const isTray = matName === 'Mat_LampTrayRecess';
            if (mat.color) mat.color.setHex(isTray ? 0xc8c0b4 : 0xf4ece0);
            if (mat.emissive) mat.emissive.copy(warmOrangeDiffuser);
            mat.emissiveIntensity = 0.06;
            mat.roughness = isTray ? 0.55 : 0.78;
            mat.metalness = 0.03;
          }
          mat.needsUpdate = true;
        } else if (matName === 'Mat_ElectricBlueLED') {
          if (mat.color) mat.color.copy(electricBlue);
          if (mat.emissive) mat.emissive.copy(electricBlue);
          mat.emissiveIntensity = 1.15;
          mat.roughness = 0.18;
          mat.needsUpdate = true;
          if (!glbMicLedMaterials.includes(mat)) {
            glbMicLedMaterials.push(mat);
          }
        } else if (matName === 'Mat_WhiteOLED') {
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 0.35);
          }
          mat.needsUpdate = true;
        }
      }
    });

    // Attach the sculpted Fifine AmpliGame AM8 Microphone Head + Under-Mounted U-Yoke + Low-Profile Boom Arm
    if (!glbScene.userData._hasFifineMicReplacement) {
      glbScene.userData._hasFifineMicReplacement = true;
      const { group: fifineGlbGroup } = buildFifineAm8BoomMicGroup();
      fifineGlbGroup.userData._isFifineReplacement = true;
      glbScene.add(fifineGlbGroup);
      glbScene.updateMatrixWorld(true);
    }
  }

  return {
    root,
    nightGlowGroup,
    contactShadowGroup,
    contactShadowPlane,
    micBlueLedRing: blueLedRing,
    glbMicLedMaterials,
    goldenWindowMaterials,
    calibrateDeskPropsGlb,
    updateLightingMaterials,
    setMonitorHighScoresVisible,
  };
}
