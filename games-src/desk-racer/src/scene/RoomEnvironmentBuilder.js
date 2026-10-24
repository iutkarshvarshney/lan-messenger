import * as THREE from 'three';
import { createNightWindowTexture } from './DeskDioramaBuilder.js';

let cachedRoomTextures = null;
let roomExternalUpgraded = false;

/**
 * Asynchronously upgrades a Three.js CanvasTexture in-place if any candidate URL exists
 * on the server (ignoring Vite SPA HTML fallbacks).
 */
function upgradeRoomTextureIfPresent(targetTex, urls, isSRGB = true) {
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
        // Keep procedural high-DPI CanvasTexture fallback
      }
    }
  })();
}

function triggerRoomTextureUpgrades(texSet) {
  if (!texSet || roomExternalUpgraded) return;
  roomExternalUpgraded = true;
  upgradeRoomTextureIfPresent(
    texSet.gemini4CandleLabelTex,
    [
      '/games/desk-racer/assets/textures/gemini_4_candle_label_2k.png?v=5.5',
      '/games/desk-racer/assets/textures/gemini_4_candle_label_2k.png?v=5.4',
      '/games/desk-racer/assets/textures/gemini_4_candle_label_2k.png',
    ],
    true
  );
  upgradeRoomTextureIfPresent(
    texSet.carpetAlbedoTex,
    [
      '/games/desk-racer/assets/textures/room_carpet_2k.png?v=5.5',
      '/games/desk-racer/assets/textures/room_carpet_2k.png?v=5.4',
      '/games/desk-racer/assets/textures/room_carpet_2k.png',
    ],
    true
  );
  upgradeRoomTextureIfPresent(
    texSet.carpetNormalTex,
    [
      '/games/desk-racer/assets/textures/room_carpet_normal_2k.png?v=5.5',
      '/games/desk-racer/assets/textures/room_carpet_normal_2k.png?v=5.4',
      '/games/desk-racer/assets/textures/room_carpet_normal_2k.png',
    ],
    false
  );
  upgradeRoomTextureIfPresent(
    texSet.darkWalnutTex,
    [
      '/games/desk-racer/assets/textures/room_walnut_wood_2k.png?v=5.5',
      '/games/desk-racer/assets/textures/room_walnut_wood_2k.png?v=5.4',
      '/games/desk-racer/assets/textures/room_walnut_wood_2k.png',
    ],
    true
  );
  upgradeRoomTextureIfPresent(
    texSet.windowCityFacadeTex,
    [
      '/games/desk-racer/assets/textures/window_city_facade_2k.png?v=5.5',
      '/games/desk-racer/assets/textures/window_city_facade_2k.png?v=5.4',
      '/games/desk-racer/assets/textures/window_city_facade_2k.png',
    ],
    true
  );
}

/**
 * Builds and caches all procedural high-DPI textures for the bedroom environment,
 * with optional asynchronous upgrade to 2K PNG textures in /assets/textures/.
 */
function getRoomEnvironmentTextures(upgradeExternal = false) {
  if (cachedRoomTextures) {
    if (upgradeExternal) triggerRoomTextureUpgrades(cachedRoomTextures);
    return cachedRoomTextures;
  }

  // -------------------------------------------------------------------------
  // 1. HIGH-DPI "GEMINI 4" SCENTED CANDLE APOTHECARY LABEL (1024x1024)
  //    Reads: PARFUM DE CODE / GEMINI 4 / 1:87 MICRO EDITION • 240G
  // -------------------------------------------------------------------------
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 1024;
  const lCtx = labelCanvas.getContext('2d');

  // Dark smoked-glass wrap background outside the front cream paper label
  lCtx.fillStyle = '#0c0b0e';
  lCtx.fillRect(0, 0, 1024, 1024);

  // Cream cotton paper label centered on the front face of the cylinder (X in [140, 884], Y in [120, 904])
  const lx = 140;
  const ly = 120;
  const lw = 744;
  const lh = 784;
  lCtx.fillStyle = '#f6efe2';
  lCtx.fillRect(lx, ly, lw, lh);

  // Subtle warm paper grain
  lCtx.fillStyle = 'rgba(190, 168, 134, 0.08)';
  for (let i = 0; i < 180; i++) {
    const py = ly + ((i * 37) % lh);
    lCtx.fillRect(lx, py, lw, 2);
  }

  // Double apothecary hairline border (outer charcoal + inner gold foil)
  lCtx.strokeStyle = '#1d1a16';
  lCtx.lineWidth = 6;
  lCtx.strokeRect(lx + 24, ly + 24, lw - 48, lh - 48);

  lCtx.strokeStyle = '#b68d40';
  lCtx.lineWidth = 3;
  lCtx.strokeRect(lx + 36, ly + 36, lw - 72, lh - 72);

  lCtx.textAlign = 'center';
  lCtx.textBaseline = 'middle';

  // Top collection subtitle
  lCtx.fillStyle = '#4a4137';
  lCtx.font = '600 28px "Inter", "Helvetica Neue", sans-serif';
  lCtx.letterSpacing = '6px';
  lCtx.fillText('PARFUM DE CODE', 512, ly + 118);

  // Thin decorative rule
  lCtx.strokeStyle = '#b68d40';
  lCtx.lineWidth = 2.5;
  lCtx.beginPath();
  lCtx.moveTo(332, ly + 158);
  lCtx.lineTo(692, ly + 158);
  lCtx.stroke();

  // Hero Brand Title: GEMINI 4
  lCtx.fillStyle = '#12100e';
  lCtx.font = '800 104px "Georgia", "Times New Roman", serif';
  lCtx.fillText('GEMINI 4', 512, ly + 292);

  // Golden-hour star emblem
  lCtx.fillStyle = '#c29138';
  lCtx.font = '600 30px "Georgia", serif';
  lCtx.fillText('✦   1 : 87   M I C R O   E D I T I O N   ✦', 512, ly + 392);

  // Scent notes block
  lCtx.fillStyle = '#2b2520';
  lCtx.font = '500 26px "Inter", "Helvetica Neue", sans-serif';
  lCtx.fillText('GOLDEN HOUR OAK  •  ESPRESSO  •  WARM SILICON', 512, ly + 485);

  lCtx.fillStyle = '#5c5146';
  lCtx.font = 'italic 24px "Georgia", serif';
  lCtx.fillText('Hand-Poured in Mountain View & London', 512, ly + 548);

  // Bottom divider & net weight
  lCtx.strokeStyle = '#1d1a16';
  lCtx.lineWidth = 2;
  lCtx.beginPath();
  lCtx.moveTo(260, ly + 622);
  lCtx.lineTo(764, ly + 622);
  lCtx.stroke();

  lCtx.fillStyle = '#161310';
  lCtx.font = '700 28px "JetBrains Mono", monospace';
  lCtx.fillText('1:87 MICRO EDITION  •  240G / 8.5 OZ', 512, ly + 678);

  const gemini4CandleLabelTex = new THREE.CanvasTexture(labelCanvas);
  gemini4CandleLabelTex.colorSpace = THREE.SRGBColorSpace;
  gemini4CandleLabelTex.wrapS = THREE.ClampToEdgeWrapping;
  gemini4CandleLabelTex.wrapT = THREE.ClampToEdgeWrapping;
  gemini4CandleLabelTex.anisotropy = 16;

  // -------------------------------------------------------------------------
  // 2. PLUSH CREAM LOOP-PILE CARPET ALBEDO & NORMAL TEXTURE (512x512)
  // -------------------------------------------------------------------------
  const cw = 512;
  const ch = 512;
  const carpetCanvas = document.createElement('canvas');
  carpetCanvas.width = cw;
  carpetCanvas.height = ch;
  const cCtx = carpetCanvas.getContext('2d');
  const cImg = cCtx.createImageData(cw, ch);
  const cData = cImg.data;

  const carpetNormCanvas = document.createElement('canvas');
  carpetNormCanvas.width = cw;
  carpetNormCanvas.height = ch;
  const cnCtx = carpetNormCanvas.getContext('2d');
  const cnImg = cnCtx.createImageData(cw, ch);
  const cnData = cnImg.data;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const idx = (y * cw + x) * 4;
      const n1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const tuft = n1 - Math.floor(n1);
      const wave = Math.sin(x * 0.45) * Math.cos(y * 0.45) * 0.5 + 0.5;
      const blend = tuft * 0.65 + wave * 0.35;

      // Warm plush oatmeal-cream wool carpet (#e5ddd0 .. #f0e9de)
      cData[idx + 0] = Math.round(226 + blend * 16);
      cData[idx + 1] = Math.round(218 + blend * 16);
      cData[idx + 2] = Math.round(204 + blend * 15);
      cData[idx + 3] = 255;

      const nx = THREE.MathUtils.clamp(0.5 + (tuft - 0.5) * 0.22, 0.35, 0.65);
      const ny = THREE.MathUtils.clamp(0.5 + (wave - 0.5) * 0.22, 0.35, 0.65);
      cnData[idx + 0] = Math.round(nx * 255);
      cnData[idx + 1] = Math.round(ny * 255);
      cnData[idx + 2] = 242;
      cnData[idx + 3] = 255;
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  cnCtx.putImageData(cnImg, 0, 0);

  const carpetAlbedoTex = new THREE.CanvasTexture(carpetCanvas);
  carpetAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  carpetAlbedoTex.wrapS = THREE.RepeatWrapping;
  carpetAlbedoTex.wrapT = THREE.RepeatWrapping;
  carpetAlbedoTex.repeat.set(8, 8);
  carpetAlbedoTex.anisotropy = 8;

  const carpetNormalTex = new THREE.CanvasTexture(carpetNormCanvas);
  carpetNormalTex.wrapS = THREE.RepeatWrapping;
  carpetNormalTex.wrapT = THREE.RepeatWrapping;
  carpetNormalTex.repeat.set(8, 8);
  carpetNormalTex.anisotropy = 8;

  // -------------------------------------------------------------------------
  // 3. DARK WALNUT MID-CENTURY DRESSER WOOD & CONCENTRIC ARC FLUTING (512x512)
  // -------------------------------------------------------------------------
  const ww = 512;
  const wh = 512;
  const walnutCanvas = document.createElement('canvas');
  walnutCanvas.width = ww;
  walnutCanvas.height = wh;
  const wCtx = walnutCanvas.getContext('2d');
  const wImg = wCtx.createImageData(ww, wh);
  const wData = wImg.data;

  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < ww; x++) {
      const idx = (y * ww + x) * 4;
      const grain =
        Math.sin(y * 0.14 + Math.sin(x * 0.035) * 4.2) * 0.5 +
        Math.sin(y * 0.42 + x * 0.02) * 0.25 +
        0.5;
      // Concentric quarter-circle fluting arcs for mid-century drawer relief
      const distArc = Math.hypot((x % 256) - 128, (y % 170));
      const arcFlute = Math.sin(distArc * 0.36) * 0.18;
      const v = THREE.MathUtils.clamp(grain * 0.75 + arcFlute, 0.0, 1.0);

      // Rich dark chocolate walnut (#2d190e .. #52301c)
      wData[idx + 0] = Math.round(45 + v * 38);
      wData[idx + 1] = Math.round(25 + v * 23);
      wData[idx + 2] = Math.round(14 + v * 14);
      wData[idx + 3] = 255;
    }
  }
  wCtx.putImageData(wImg, 0, 0);

  const darkWalnutTex = new THREE.CanvasTexture(walnutCanvas);
  darkWalnutTex.colorSpace = THREE.SRGBColorSpace;
  darkWalnutTex.wrapS = THREE.RepeatWrapping;
  darkWalnutTex.wrapT = THREE.RepeatWrapping;
  darkWalnutTex.anisotropy = 16;

  // -------------------------------------------------------------------------
  // 4. EXTERIOR SUNLIT BRICK & GLASS APARTMENT BUILDING FACADE (1024x512)
  // -------------------------------------------------------------------------
  const fw = 1024;
  const fh = 512;
  const facadeCanvas = document.createElement('canvas');
  facadeCanvas.width = fw;
  facadeCanvas.height = fh;
  const fCtx = facadeCanvas.getContext('2d');

  // Warm golden-hour sky & sunlit terracotta/amber brick facade across the street
  const skyGrad = fCtx.createLinearGradient(0, 0, 0, fh);
  skyGrad.addColorStop(0.0, '#ffd899');
  skyGrad.addColorStop(0.35, '#e8a864');
  skyGrad.addColorStop(1.0, '#9c5a38');
  fCtx.fillStyle = skyGrad;
  fCtx.fillRect(0, 0, fw, fh);

  // Horizontal brick courses
  for (let by = 40; by < fh; by += 14) {
    fCtx.fillStyle = by % 28 === 0 ? 'rgba(125, 62, 36, 0.42)' : 'rgba(150, 78, 45, 0.36)';
    fCtx.fillRect(0, by, fw, 11);
  }

  // Sunlit apartment windows with warm golden reflections
  const winCols = 5;
  const winRows = 3;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = 75 + c * 188;
      const wy = 58 + r * 145;
      const wwBox = 116;
      const whBox = 98;

      // Limestone lintel & sill
      fCtx.fillStyle = '#ead5b4';
      fCtx.fillRect(wx - 8, wy - 10, wwBox + 16, 10);
      fCtx.fillRect(wx - 6, wy + whBox, wwBox + 12, 8);

      // Dark window frame
      fCtx.fillStyle = '#2a2421';
      fCtx.fillRect(wx, wy, wwBox, whBox);

      // Golden-hour glass reflection
      const gGrad = fCtx.createLinearGradient(wx, wy, wx + wwBox, wy + whBox);
      gGrad.addColorStop(0.0, '#fff0c4');
      gGrad.addColorStop(0.55, '#f2a852');
      gGrad.addColorStop(1.0, '#593e38');
      fCtx.fillStyle = gGrad;
      fCtx.fillRect(wx + 6, wy + 6, wwBox - 12, whBox - 12);

      // Window mullions
      fCtx.fillStyle = '#2a2421';
      fCtx.fillRect(wx + wwBox / 2 - 2, wy, 4, whBox);
      fCtx.fillRect(wx, wy + whBox * 0.48, wwBox, 4);
    }
  }

  const windowCityFacadeTex = new THREE.CanvasTexture(facadeCanvas);
  windowCityFacadeTex.colorSpace = THREE.SRGBColorSpace;
  windowCityFacadeTex.anisotropy = 8;

  // -------------------------------------------------------------------------
  // 5. DIGITAL THERMOSTAT OLED SCREEN (256x256: "21.0°C")
  // -------------------------------------------------------------------------
  const thermoCanvas = document.createElement('canvas');
  thermoCanvas.width = 256;
  thermoCanvas.height = 256;
  const tCtx = thermoCanvas.getContext('2d');
  tCtx.fillStyle = '#0c1017';
  tCtx.fillRect(0, 0, 256, 256);
  tCtx.strokeStyle = '#283244';
  tCtx.lineWidth = 6;
  tCtx.strokeRect(12, 12, 232, 232);
  tCtx.fillStyle = '#7ad4ff';
  tCtx.font = '600 24px "Inter", sans-serif';
  tCtx.textAlign = 'center';
  tCtx.fillText('COMFORT ECO', 128, 66);
  tCtx.fillStyle = '#ffffff';
  tCtx.font = '700 68px "JetBrains Mono", monospace';
  tCtx.fillText('21.0°C', 128, 148);
  tCtx.fillStyle = '#ffaa44';
  tCtx.font = '500 22px "Inter", sans-serif';
  tCtx.fillText('● HEAT AUTO  46%', 128, 204);

  const thermostatTex = new THREE.CanvasTexture(thermoCanvas);
  thermostatTex.colorSpace = THREE.SRGBColorSpace;

  // -------------------------------------------------------------------------
  // 6. SOFT RADIAL CONTACT-SHADOW AO TEXTURE (256x256)
  // -------------------------------------------------------------------------
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = 256;
  aoCanvas.height = 256;
  const aoCtx = aoCanvas.getContext('2d');
  const aoGrad = aoCtx.createRadialGradient(128, 128, 18, 128, 128, 124);
  aoGrad.addColorStop(0.0, 'rgba(24, 16, 10, 0.52)');
  aoGrad.addColorStop(0.55, 'rgba(28, 19, 12, 0.28)');
  aoGrad.addColorStop(0.85, 'rgba(32, 22, 14, 0.08)');
  aoGrad.addColorStop(1.0, 'rgba(32, 22, 14, 0.0)');
  aoCtx.fillStyle = aoGrad;
  aoCtx.fillRect(0, 0, 256, 256);

  const contactAoTex = new THREE.CanvasTexture(aoCanvas);

  // -------------------------------------------------------------------------
  // 7. LIGHT WARM-GREIGE WOVEN UPHOLSTERY FABRIC ALBEDO & NORMAL (256x256)
  //    Matches the real headboard fabric in media_1790346289621.jpg (#b4ada2)
  // -------------------------------------------------------------------------
  const bw = 512;
  const bh = 512;
  const bedCanvas = document.createElement('canvas');
  bedCanvas.width = bw;
  bedCanvas.height = bh;
  const bCtx = bedCanvas.getContext('2d');
  const bImg = bCtx.createImageData(bw, bh);
  const bData = bImg.data;

  const bedNormCanvas = document.createElement('canvas');
  bedNormCanvas.width = bw;
  bedNormCanvas.height = bh;
  const bnCtx = bedNormCanvas.getContext('2d');
  const bnImg = bnCtx.createImageData(bw, bh);
  const bnData = bnImg.data;

  const hash2D = (ix, iy) => {
    let n = (ix * 374761393 + iy * 668265263) ^ 0x5bf03635;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295.0;
  };

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const idx = (y * bw + x) * 4;
      const g0 = hash2D(x, y) - 0.5;
      const gx0 = (x >> 1) & 255;
      const gy0 = (y >> 1) & 255;
      const gx1 = (gx0 + 1) & 255;
      const gy1 = (gy0 + 1) & 255;
      const fx = (x & 1) * 0.5;
      const fy = (y & 1) * 0.5;
      const c00 = hash2D(gx0 + 101, gy0 + 211);
      const c10 = hash2D(gx1 + 101, gy0 + 211);
      const c01 = hash2D(gx0 + 101, gy1 + 211);
      const c11 = hash2D(gx1 + 101, gy1 + 211);
      const gSoft = (c00 * (1 - fx) + c10 * fx) * (1 - fy) + (c01 * (1 - fx) + c11 * fx) * fy - 0.5;
      const delta = g0 * 6.5 + gSoft * 5.0;
      bData[idx + 0] = Math.round(THREE.MathUtils.clamp(166 + delta, 152, 180));
      bData[idx + 1] = Math.round(THREE.MathUtils.clamp(160 + delta * 0.96, 146, 174));
      bData[idx + 2] = Math.round(THREE.MathUtils.clamp(150 + delta * 0.92, 136, 164));
      bData[idx + 3] = 255;

      const nx = hash2D((x + 1) & 511, y) - hash2D((x + 511) & 511, y);
      const ny = hash2D(x, (y + 1) & 511) - hash2D(x, (y + 511) & 511);
      bnData[idx + 0] = Math.round(THREE.MathUtils.clamp(128 + nx * 18, 108, 148));
      bnData[idx + 1] = Math.round(THREE.MathUtils.clamp(128 + ny * 18, 108, 148));
      bnData[idx + 2] = 248;
      bnData[idx + 3] = 255;
    }
  }
  bCtx.putImageData(bImg, 0, 0);
  bnCtx.putImageData(bnImg, 0, 0);

  const bedFabricAlbedoTex = new THREE.CanvasTexture(bedCanvas);
  bedFabricAlbedoTex.colorSpace = THREE.SRGBColorSpace;
  bedFabricAlbedoTex.wrapS = THREE.RepeatWrapping;
  bedFabricAlbedoTex.wrapT = THREE.RepeatWrapping;
  bedFabricAlbedoTex.repeat.set(4, 4);
  bedFabricAlbedoTex.anisotropy = 8;

  const bedFabricNormalTex = new THREE.CanvasTexture(bedNormCanvas);
  bedFabricNormalTex.wrapS = THREE.RepeatWrapping;
  bedFabricNormalTex.wrapT = THREE.RepeatWrapping;
  bedFabricNormalTex.repeat.set(4, 4);
  bedFabricNormalTex.anisotropy = 8;

  cachedRoomTextures = {
    gemini4CandleLabelTex,
    carpetAlbedoTex,
    carpetNormalTex,
    darkWalnutTex,
    windowCityFacadeTex,
    thermostatTex,
    contactAoTex,
    bedFabricAlbedoTex,
    bedFabricNormalTex,
  };
  return cachedRoomTextures;
}

/**
 * Helper to create a grounded soft floor contact-shadow AO quad at a given position & size.
 */
function createContactAoQuad(contactAoTex, x, y, z, width, depth, opacity = 0.68) {
  const mat = new THREE.MeshBasicMaterial({
    map: contactAoTex,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Populates persistent soft floor & dresser-top contact-shadow AO quads (`Y = -0.728m`)
 * matching the V5.5 Bedroom Environment floor plan.
 */
export function buildRoomContactShadows(roomContactAoGroup, contactAoTex) {
  const floorAoY = -0.728;
  // 1. Under Grey Upholstered Platform Bed (X = -1.32m, Z = +0.635m)
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, -1.32, floorAoY, 0.635, 1.56, 2.12, 0.72)
  );
  // 2. Under South-Wall Dark Walnut 3-Drawer Cabinet Opposite Desk (X = 0.00m, Z = +2.33m, 0.92m x 0.52m)
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 0.00, floorAoY, 2.33, 0.92, 0.52, 0.74)
  );
  // 3. Under Smooth Cream Bouclé Desk Chair (X = +0.02m, Z = +0.46m)
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 0.02, floorAoY, 0.46, 0.58, 0.58, 0.68)
  );
  // 4. Under Standing Desk Left & Right T-Feet
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, -0.42, floorAoY, -0.01, 0.26, 0.64, 0.68)
  );
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 0.42, floorAoY, -0.01, 0.26, 0.64, 0.68)
  );
  // 5. Under 3D Rectangular Built-In Oak Wardrobe (X = +1.04m, Z = +0.525m, 0.72m wide x 1.84m long for 0.62m deep footprint!)
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 1.04, floorAoY, 0.525, 0.72, 1.84, 0.68)
  );
  // 6. Subtle Dresser-Top Contact AO Quads (Y = +0.0512m, Z = +2.33m) under Spiral Jade Pot (+0.24m), GEMINI 4 Candle (0.00m) & Edison Lamp (-0.24m)
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 0.24, 0.0512, 2.33, 0.16, 0.16, 0.52)
  );
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, 0.00, 0.0512, 2.33, 0.14, 0.14, 0.56)
  );
  roomContactAoGroup.add(
    createContactAoQuad(contactAoTex, -0.24, 0.0512, 2.33, 0.17, 0.17, 0.54)
  );
}

/**
 * Traverses `room_environment.glb` when loaded, enforcing:
 * - `child.castShadow = false` and `child.receiveShadow = true` on every mesh
 *   (preserving 100% of the 4096x4096 directional shadow map for the desk & coaster track!)
 * - Calibrated V5.5 PBR materials for `Mat_Gemini4CandleLabel`, `Mat_EdisonFilament`,
 *   `Mat_SmokedBulbGlass`, `Mat_DarkWalnut`, `Mat_CreamBoucle`, `Mat_ChampagneGold`,
 *   `Mat_ChairLegOak`, `Mat_BedGreyFabric`, `Mat_CrispWhiteDuvet`, `Mat_BedroomCarpet`,
 *   and `Mat_WindowCityFacade`.
 */
export function calibrateRoomEnvironmentGlb(glbScene, trackedMaterials = null) {
  if (!glbScene) return;

  const {
    gemini4CandleLabelTex,
    carpetAlbedoTex,
    carpetNormalTex,
    darkWalnutTex,
    windowCityFacadeTex,
    bedFabricAlbedoTex,
    bedFabricNormalTex,
  } = getRoomEnvironmentTextures();

  glbScene.traverse((child) => {
    if (!child.isMesh) return;
    // CRITICAL: Room meshes never cast directional shadows (keeping the 4096x4096 shadow map dedicated to the desk),
    // and bed & chair meshes do not receive desk-lamp directional shadow projections so no stray desk/track shadows fall on the bed or chair seat!
    const n = child.name || '';
    const pName = child.parent ? child.parent.name || '' : '';
    const meshName = n.toLowerCase();
    const mats = child.material
      ? Array.isArray(child.material)
        ? child.material
        : [child.material]
      : [];
    const matNames = mats.map((m) => (m && m.name ? m.name : ''));
    const isBedMesh =
      meshName.includes('bed') ||
      meshName.includes('duvet') ||
      meshName.includes('pillow') ||
      meshName.includes('mattress');
    const isChairMesh =
      n.includes('BoucleDeskChair') ||
      pName.includes('BoucleDeskChair') ||
      meshName.includes('chair') ||
      meshName.includes('boucle') ||
      matNames.some((m) => m.includes('Boucle') || m.includes('Chair'));
    child.castShadow = false;
    child.receiveShadow = !(isBedMesh || isChairMesh);
    child.frustumCulled = true;
    if (child.geometry && !child.geometry.boundingSphere) {
      child.geometry.computeBoundingSphere();
    }

    if (!child.material) return;

    for (const mat of mats) {
      if (!mat) continue;
      const matName = mat.name || '';
      const matLower = matName.toLowerCase();

      // 1. Black Glass "GEMINI 4" Scented Candle Label
      if (
        matName === 'Mat_Gemini4CandleLabel' ||
        matLower.includes('gemini4candlelabel') ||
        matLower.includes('candle_label') ||
        (meshName.includes('candle') && meshName.includes('label'))
      ) {
        if (mat.color) mat.color.setHex(0xffffff);
        if (!mat.map) {
          mat.map = gemini4CandleLabelTex;
        } else {
          mat.map.anisotropy = 16;
        }
        if (mat.emissive) {
          mat.emissive.setHex(0xffe4b8);
        } else {
          mat.emissive = new THREE.Color(0xffe4b8);
        }
        mat.emissiveMap = mat.map || gemini4CandleLabelTex;
        mat.emissiveIntensity = 0.16;
        mat.roughness = 0.36;
        mat.metalness = 0.04;
        mat.needsUpdate = true;
        continue;
      }

      // 2. Glowing Amber Spiral Edison Filament (#ff9424)
      if (
        matName === 'Mat_EdisonFilament' ||
        matLower.includes('edisonfilament') ||
        meshName.includes('filament')
      ) {
        if (mat.color) mat.color.setHex(0xff9424);
        if (mat.emissive) {
          mat.emissive.setHex(0xff9424);
        } else {
          mat.emissive = new THREE.Color(0xff9424);
        }
        mat.emissiveIntensity = 2.8;
        mat.roughness = 0.18;
        mat.metalness = 0.1;
        if (trackedMaterials && !trackedMaterials.filamentMaterials.includes(mat)) {
          trackedMaterials.filamentMaterials.push(mat);
        }
        mat.needsUpdate = true;
        continue;
      }

      // 3. Translucent Smoked-Amber Bulb Glass
      if (
        matName === 'Mat_SmokedBulbGlass' ||
        matLower.includes('smokedbulbglass') ||
        (meshName.includes('bulb') && meshName.includes('glass'))
      ) {
        if (mat.color) mat.color.setHex(0xffae52);
        if (mat.emissive) {
          mat.emissive.setHex(0xff8c24);
        } else {
          mat.emissive = new THREE.Color(0xff8c24);
        }
        mat.emissiveIntensity = 0.22;
        mat.transparent = true;
        mat.opacity = 0.42;
        mat.roughness = 0.12;
        mat.metalness = 0.08;
        mat.depthWrite = false;
        mat.needsUpdate = true;
        continue;
      }

      // 4. Dark Walnut Mid-Century 3-Drawer Chest
      if (
        matName === 'Mat_DarkWalnut' ||
        matLower.includes('darkwalnut') ||
        matLower.includes('walnut')
      ) {
        if (!mat.map) {
          mat.map = darkWalnutTex;
          if (mat.color) mat.color.setHex(0xffffff);
        }
        mat.roughness = 0.46;
        mat.metalness = 0.04;
        mat.needsUpdate = true;
        continue;
      }

      // 5. Smooth Continuous Cream Bouclé Desk Chair Cushion
      if (
        matName === 'Mat_CreamBoucle' ||
        matLower.includes('creamboucle') ||
        matLower.includes('boucle')
      ) {
        if (mat.color) mat.color.setHex(0xf4eee1);
        if (!mat.normalMap) {
          mat.normalMap = carpetNormalTex;
        }
        mat.normalScale = new THREE.Vector2(0.28, 0.28);
        mat.roughness = 0.88;
        mat.metalness = 0.0;
        mat.needsUpdate = true;
        continue;
      }

      // 6. Brushed Champagne-Brass External Chair Frame & Ferrules
      if (
        matName === 'Mat_ChampagneGold' ||
        matLower.includes('champagnegold') ||
        matLower.includes('brass')
      ) {
        if (mat.color) mat.color.setHex(0xd4af6a);
        mat.metalness = 0.88;
        mat.roughness = 0.24;
        mat.needsUpdate = true;
        continue;
      }

      // 7. Warm Natural Oak Lower Chair Legs
      if (
        matName === 'Mat_ChairLegOak' ||
        matLower.includes('chairlegoak') ||
        matLower.includes('chairnaturaloak')
      ) {
        if (mat.color) mat.color.setHex(0x8e7355);
        mat.roughness = 0.50;
        mat.metalness = 0.04;
        mat.needsUpdate = true;
        continue;
      }

      // 8. Lighter Warm-Greige Woven Fabric Bed Frame & Headboard (matches media_1790346289621.jpg)
      if (
        matName === 'Mat_BedGreyFabric' ||
        matName === 'Mat_BedOatmealFabric' ||
        matLower.includes('bedgreyfabric') ||
        matLower.includes('bedoatmealfabric') ||
        matLower.includes('bedupholstery')
      ) {
        if (mat.color) mat.color.setHex(0xffffff);
        mat.map = bedFabricAlbedoTex;
        mat.normalMap = bedFabricNormalTex;
        mat.normalScale = new THREE.Vector2(0.12, 0.12);
        mat.roughness = 0.93;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.14;
        mat.needsUpdate = true;
        continue;
      }

      // 9. Crisp Pure Hotel-White Duvet, Fitted Mattress Sheet & Pillows
      if (
        matName === 'Mat_CrispWhiteDuvet' ||
        matName === 'Mat_CrispWhiteLinen' ||
        matLower.includes('crispwhiteduvet') ||
        matLower.includes('crispwhitelinen') ||
        matLower.includes('duvet') ||
        matLower.includes('mattress') ||
        matLower.includes('pillow')
      ) {
        if (mat.color) mat.color.setHex(0xf4f7fc);
        mat.roughness = 0.82;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.12;
        mat.needsUpdate = true;
        continue;
      }

      // 10. Plush Cream Bedroom Carpet
      if (
        matName === 'Mat_BedroomCarpet' ||
        matLower.includes('bedroomcarpet') ||
        matLower.includes('carpet')
      ) {
        if (!mat.map) {
          mat.map = carpetAlbedoTex;
          if (mat.color) mat.color.setHex(0xffffff);
        }
        if (!mat.normalMap) {
          mat.normalMap = carpetNormalTex;
          mat.normalScale = new THREE.Vector2(0.28, 0.28);
        }
        mat.roughness = 0.94;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.14;
        mat.needsUpdate = true;
        continue;
      }

      // 11. Night Window Outside Desk (dark night window)
      if (
        matName === 'Mat_WindowCityFacade' ||
        matLower.includes('windowcityfacade') ||
        matLower.includes('facade')
      ) {
        const nightWinTex = createNightWindowTexture();
        if (mat.map && mat.map !== nightWinTex) {
          mat.map.dispose();
        }
        if (mat.emissiveMap && mat.emissiveMap !== nightWinTex) {
          mat.emissiveMap.dispose();
        }
        mat.map = nightWinTex;
        mat.emissiveMap = nightWinTex;
        mat.fog = false;
        if (mat.color) mat.color.setHex(0xffffff);
        if (mat.emissive) {
          mat.emissive.setHex(0xffffff);
        } else {
          mat.emissive = new THREE.Color(0xffffff);
        }
        mat.emissiveIntensity = 0.20;
        mat.roughness = 0.28;
        mat.metalness = 0.06;
        if (trackedMaterials && !trackedMaterials.facadeMaterials.includes(mat)) {
          trackedMaterials.facadeMaterials.push(mat);
        }
        mat.needsUpdate = true;
        continue;
      }

      // 12. Matte Bedroom Plaster Walls & Ceiling (with 3D Multi-Wall Edison Warm Bounce Blending)
      if (
        matName === 'Mat_BedroomPlasterWall' ||
        matName === 'Mat_BedroomWall' ||
        matName === 'Mat_BedroomCeiling' ||
        matLower.includes('plasterwall') ||
        matLower.includes('bedroomwall') ||
        matLower.includes('bedroomceiling')
      ) {
        if (mat.color) mat.color.setHex(0xd8cab8);
        if (mat.emissive) {
          mat.emissive.setHex(0x000000);
        } else {
          mat.emissive = new THREE.Color(0x000000);
        }
        mat.emissiveIntensity = 0.0;
        mat.roughness = 0.88;
        mat.metalness = 0.0;
        mat.envMapIntensity = 0.12;
        attachSouthWallOrangeGradientShader(mat, edisonWallGlowUniforms, 1.0);
        mat.needsUpdate = true;
        continue;
      }

      // 13. Door, Skirting & Wardrobe receive subtle warm 3D Edison bounce light near the South wall
      if (
        matName === 'Mat_DoorWhite' ||
        matName === 'Mat_SkirtingWhite' ||
        matName === 'Mat_WhiteSkirting' ||
        matLower.includes('doorwhite') ||
        matLower.includes('skirting')
      ) {
        attachSouthWallOrangeGradientShader(mat, edisonWallGlowUniforms, 0.52);
        mat.needsUpdate = true;
        continue;
      }

      if (
        matName === 'Mat_WardrobePaleOak' ||
        matName === 'Mat_WardrobeTaupeOak' ||
        matLower.includes('wardrobe')
      ) {
        attachSouthWallOrangeGradientShader(mat, edisonWallGlowUniforms, 0.45);
        mat.needsUpdate = true;
      }
    }
  });
}

const edisonWallGlowUniforms = {
  uEdisonGlowScale: { value: 1.15 },
};

/**
 * Attaches an `onBeforeCompile` shader hook to room architectural surfaces (`Mat_BedroomWall`,
 * `Mat_BedroomPlasterWall`, `Mat_BedroomCeiling`, `Mat_DoorWhite`, `Mat_SkirtingWhite`, `Mat_WardrobePaleOak`)
 * that renders:
 * 1) A warm Edison bulb radial halo on the South wall (`Z ≈ +2.55m`) that smoothly attenuates
 *    before the West/East/Ceiling corner edges (`southCornerFade`), AND
 * 2) A continuous 3D world-space warm orange bounce radiosity field (`bounceField`) centered near
 *    the Edison lamp (`vec3(-0.34, 0.38, 2.48)`) that wraps seamlessly across the South-West wall
 *    corner, Ceiling, Door, and East wall with zero hard corner seams.
 */
function attachSouthWallOrangeGradientShader(
  mat,
  glowUniforms = edisonWallGlowUniforms,
  surfaceBounceWeight = 1.0
) {
  if (!mat || mat.userData?.hasSouthWallOrangeGradient) return;
  mat.userData = mat.userData || {};
  mat.userData.hasSouthWallOrangeGradient = true;

  const weightStr = Number(surfaceBounceWeight).toFixed(3);
  mat.customProgramCacheKey = () => `south_wall_edison_3d_bounce_v3_${weightStr}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEdisonGlowScale = glowUniforms.uEdisonGlowScale;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
varying vec3 vRoomWallWorldPos;
varying vec3 vRoomWallWorldNormal;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
vRoomWallWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vRoomWallWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform float uEdisonGlowScale;
varying vec3 vRoomWallWorldPos;
varying vec3 vRoomWallWorldNormal;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `{
  float sScale = clamp(uEdisonGlowScale / 1.15, 0.0, 1.8);
  float surfWeight = ${weightStr};

  // Continuous 3D world-space warm orange radiance & bounce field centered at the Edison bulb
  // Evaluates identically across both sides of every wall-to-wall and wall-to-ceiling corner seam!
  vec3 dGlow = vec3(
    (vRoomWallWorldPos.x - (-0.24)) * 0.54,
    (vRoomWallWorldPos.y - 0.25) * 0.65,
    (vRoomWallWorldPos.z - 2.44) * 0.66
  );
  float r3d = length(dGlow);
  float zFalloff = smoothstep(0.65, 2.55, vRoomWallWorldPos.z);

  float core3d = exp(-r3d * r3d * 5.6) * zFalloff;
  float mid3d  = exp(-r3d * r3d * 1.18) * zFalloff;
  float wide3d = exp(-r3d * 0.88) * (zFalloff * zFalloff);

  vec3 edisonLinear = (
    vec3(0.310, 0.035, 0.0018) * wide3d +
    vec3(0.500, 0.094, 0.0045) * mid3d +
    vec3(0.750, 0.265, 0.0280) * core3d
  ) * sScale * surfWeight;

  float glowStrength = clamp((wide3d * 0.78 + mid3d * 0.55 + core3d * 0.45) * surfWeight, 0.0, 0.94);
  // Warm bounce light only ADDS and warms the surface — never darkens gl_FragColor.rgb!
  vec3 warmedWall = max(gl_FragColor.rgb, edisonLinear) + gl_FragColor.rgb * vec3(0.42, 0.16, 0.03) * glowStrength;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, warmedWall, glowStrength);
}
#include <dithering_fragment>`
    );
  };
  mat.needsUpdate = true;
}

/**
 * Builds a sculpted 44x44 rectangular pinched-corner cotton pillow BufferGeometry.
 */
function createPinchedPillowGeometry(nu = 44, nv = 44) {
  const hw = 0.305;
  const hl = 0.215;
  const halfThickTop = 0.082;
  const halfThickBot = 0.052;

  const geo = new THREE.BoxGeometry(1, 1, 1, nu - 1, 1, nv - 1);
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const u = posAttr.getX(i) * 2.0; // [-1, +1]
    const sy = posAttr.getY(i);      // +0.5 top, -0.5 bottom
    const v = -posAttr.getZ(i) * 2.0; // [-1, +1]
    const u2 = u * u;
    const v2 = v * v;
    const pinch = 1.0 + 0.095 * u2 * v2 - 0.045 * (u2 * (1.0 - v2) + v2 * (1.0 - u2));
    const px = u * hw * pinch;
    const pz = -v * hl * pinch;
    const profile =
      Math.pow(Math.max(0.0, 1.0 - u2), 0.55) * Math.pow(Math.max(0.0, 1.0 - v2), 0.55);
    const cradle = -0.012 * Math.exp(-(u2 * 1.8 + v2 * 2.2));
    const creases =
      0.0038 * Math.sin(u * 5.0 + v * 2.0) * Math.cos(v * 4.0 - u * 1.5) * profile;
    const py =
      sy >= 0.0
        ? 0.0012 + (halfThickTop + cradle) * profile + creases
        : -0.0012 - halfThickBot * profile;
    posAttr.setXYZ(i, px, py, pz);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the procedural Grey Fabric Upholstered Bed with a single continuous
 * sculpted organic overhanging white duvet and 2 rectangular pinched-corner pillows.
 */
function buildProceduralBed(bedGreyFabricMat, crispWhiteDuvetMat, darkWalnutMat) {
  const bedGroup = new THREE.Group();
  bedGroup.name = 'NeatUpholsteredBed';

  // 1. Rounded Architectural Grey Woven Fabric Headboard (X in [-2.02, -0.62], Z in [-0.35, -0.24], Y in [-0.730, +0.26m])
  const headboardMain = new THREE.Mesh(
    new THREE.BoxGeometry(1.40, 0.94, 0.11),
    bedGreyFabricMat
  );
  headboardMain.position.set(-1.32, -0.26, -0.295);
  headboardMain.receiveShadow = true;
  bedGroup.add(headboardMain);

  const headboardTopRoll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 1.40, 20),
    bedGreyFabricMat
  );
  headboardTopRoll.rotation.z = Math.PI / 2;
  headboardTopRoll.position.set(-1.32, 0.21, -0.295);
  headboardTopRoll.receiveShadow = true;
  bedGroup.add(headboardTopRoll);

  // 2. Grey Upholstered Platform Bed Frame Base (X in [-1.995, -0.645], Z in [-0.24, +1.595], Y in [-0.730, -0.420])
  const bedFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.31, 1.835),
    bedGreyFabricMat
  );
  bedFrame.position.set(-1.32, -0.575, 0.6775);
  bedFrame.receiveShadow = true;
  bedGroup.add(bedFrame);

  // 4 Recessed Dark Oak Corner Legs (Y in [-0.730, -0.67])
  for (const [bx, bz] of [
    [-1.94, -0.18],
    [-0.70, -0.18],
    [-1.94, 1.54],
    [-0.70, 1.54],
  ]) {
    const bLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.02, 0.065, 12),
      darkWalnutMat
    );
    bLeg.position.set(bx, -0.697, bz);
    bedGroup.add(bLeg);
  }

  // 3. Crisp Hotel-White Fitted Mattress (contoured inside overhanging duvet)
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.155, 1.72),
    crispWhiteDuvetMat
  );
  mattress.position.set(-1.32, -0.3425, 0.66);
  mattress.receiveShadow = true;
  bedGroup.add(mattress);

  // 4. Generous Overhanging Organic Draped White Duvet (56x56 sculpted cloth grid)
  //    Spans X in [-2.015, -0.625] (half_w = 0.695m around cx_bed = -1.320m) and Z in [-0.045, +1.610],
  //    dropping down by -0.215m * (edge_drape ** 1.65) to Y = -0.465m to cover the side of the mattress!
  const segX = 56;
  const segZ = 56;
  const x0 = -2.015;
  const x1 = -0.625;
  const cxBed = -1.320;
  const halfW = (x1 - x0) * 0.5; // 0.695m
  const y0Bl = -1.610;
  const y1Bl = 0.045;
  const duvetGeo = new THREE.PlaneGeometry(x1 - x0, y1Bl - y0Bl, segX, segZ);
  duvetGeo.rotateX(-Math.PI / 2);
  const posAttr = duvetGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i); // [-0.695, +0.695]
    const lz = posAttr.getZ(i); // [-0.8275, +0.8275]
    const vx = (lx + halfW) / (x1 - x0);
    const vy = 1.0 - (lz + (y1Bl - y0Bl) * 0.5) / (y1Bl - y0Bl); // 0 at foot, 1 at head
    const x = x0 + vx * (x1 - x0);
    const yBl = y0Bl + vy * (y1Bl - y0Bl);

    const dxNorm = Math.abs(x - cxBed) / halfW;
    const sideDrape = Math.max(0.0, (dxNorm - 0.78) / 0.22);
    const footDrape = Math.max(0.0, (0.12 - vy) / 0.12);
    const edgeDrape =
      1.0 - (1.0 - Math.pow(sideDrape, 1.75)) * (1.0 - Math.pow(footDrape, 1.75));

    const crownX = Math.cos(Math.min(1.0, dxNorm * 0.90) * (Math.PI * 0.5));
    const crownY = Math.pow(
      Math.sin(THREE.MathUtils.clamp((vy - 0.04) / 0.92, 0.0, 1.0) * Math.PI),
      0.52
    );
    const pillowyCrown = 0.026 * crownX * crownY;

    const organicRipples =
      (0.0055 * Math.sin(vx * 3.2 * Math.PI + 0.3) * Math.cos(vy * 3.8 * Math.PI) +
        0.0038 * Math.cos(vx * 5.2 * Math.PI + vy * 2.4 * Math.PI) * Math.sin(vy * 4.8 * Math.PI) +
        0.0024 * Math.sin((vx * 7.0 - vy * 5.0) * Math.PI)) *
      (1.0 - 0.65 * edgeDrape);

    const drapePleats =
      0.0075 * Math.sin(vy * 6.5 * Math.PI) * Math.pow(sideDrape, 0.8) +
      0.0055 * Math.sin(vx * 6.0 * Math.PI) * Math.pow(footDrape, 0.8);

    const pillowIndent =
      Math.exp(-Math.pow((x - -1.635) / 0.24, 2.0)) +
      Math.exp(-Math.pow((x - -1.005) / 0.24, 2.0));
    const foldCrest =
      0.024 * Math.exp(-Math.pow((yBl - -0.055) / 0.065, 2.0)) * (1.0 - 0.35 * sideDrape);
    const foldValley =
      -0.0095 * Math.exp(-Math.pow((yBl - -0.178) / 0.048, 2.0)) * (1.0 - 0.45 * sideDrape);
    const headTuck =
      -0.012 * Math.exp(-Math.pow((yBl - 0.038) / 0.032, 2.0)) * (0.55 + 0.45 * pillowIndent);

    const loftThick = 0.045 * (1.0 - 0.38 * Math.min(1.0, Math.max(sideDrape, footDrape)));
    const wy =
      -0.250 +
      loftThick +
      pillowyCrown +
      organicRipples +
      foldCrest +
      foldValley +
      headTuck +
      0.45 * drapePleats -
      0.215 * Math.pow(edgeDrape, 1.65);

    const sideSign = x >= cxBed ? 1.0 : -1.0;
    const worldX =
      x +
      sideSign *
        (0.0075 * Math.sin(vy * 6.5 * Math.PI) * Math.pow(sideDrape, 0.8) +
          0.016 * Math.pow(sideDrape, 1.1));
    const worldZ =
      -yBl +
      0.0055 * Math.sin(vx * 6.0 * Math.PI) * Math.pow(footDrape, 0.8) +
      0.016 * Math.pow(footDrape, 1.1);
    posAttr.setXYZ(i, worldX, wy, worldZ);
  }
  duvetGeo.computeVertexNormals();
  const sculptedDuvet = new THREE.Mesh(duvetGeo, crispWhiteDuvetMat);
  sculptedDuvet.name = 'OrganicDrapedWhiteDuvet';
  sculptedDuvet.receiveShadow = true;
  bedGroup.add(sculptedDuvet);

  // 5. Two Sculpted 44x44 Rectangular Pinched-Corner Cotton Pillows
  const pillowGeo = createPinchedPillowGeometry(44, 44);
  const pillowSpecs = [
    { px: -1.635, yawDeg: 4.0 },
    { px: -1.005, yawDeg: -3.5 },
  ];
  for (const { px, yawDeg } of pillowSpecs) {
    const pillow = new THREE.Mesh(pillowGeo, crispWhiteDuvetMat);
    pillow.position.set(px, -0.138, -0.075);
    pillow.rotation.set(
      THREE.MathUtils.degToRad(28.0),
      THREE.MathUtils.degToRad(yawDeg),
      0.0
    );
    pillow.receiveShadow = true;
    bedGroup.add(pillow);
  }

  return bedGroup;
}

/**
 * Builds the procedural V5.5 Sculpted Cream Bouclé Desk Chair (`BoucleDeskChair`):
 * - Single continuous smooth curved torus-arc backrest with hemispherical capsule ends (zero vertical cylinders!)
 * - External brushed-brass horizontal back bars (`0xd4af6a`) routed outside/behind the backrest fabric
 * - Dual-material hybrid legs: brushed brass upper rear leg uprights (`Y in [-0.280m, +0.085m]`) +
 *   4 angled warm natural oak lower legs (`Y in [-0.705m, -0.280m]`) + H-style stretchers + brass bottom ferrules
 */
function buildProceduralChair(creamBoucleMat, champagneGoldMat, naturalOakLegMat, blackSteelMat) {
  const chairGroup = new THREE.Group();
  chairGroup.name = 'BoucleDeskChair';
  chairGroup.position.set(0.02, -0.73, 0.46);
  chairGroup.rotation.y = THREE.MathUtils.degToRad(-12.0);

  // 1. Plush Round Cream Bouclé Seat Cushion (local Y = 0.450m -> world Y = -0.280m)
  const chairSeat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.235, 0.225, 0.086, 40),
    creamBoucleMat
  );
  chairSeat.position.set(0, 0.45, 0);
  chairSeat.receiveShadow = false;
  chairGroup.add(chairSeat);

  // 2. Smooth Continuous Curved Torus-Arc Backrest Pillow (local Y = 0.705m -> world Y = -0.025m)
  //    Built from a single continuous high-segment TorusGeometry arc + hemispherical capsule end caps (zero vertical cylinders!)
  const R_backrest = 0.218;
  const tubeRadius = 0.056;
  const arcSpan = Math.PI * 0.92;
  const arcStart = Math.PI * 0.5 - arcSpan * 0.5; // Centered at +Z (theta = Math.PI / 2 in XY torus rotated +90 deg X)
  const smoothBackrestArc = new THREE.Mesh(
    new THREE.TorusGeometry(R_backrest, tubeRadius, 28, 64, arcSpan),
    creamBoucleMat
  );
  smoothBackrestArc.rotation.x = Math.PI / 2;
  smoothBackrestArc.rotation.z = arcStart;
  smoothBackrestArc.scale.set(1.0, 1.0, 1.88); // Plump 210mm vertical kidney profile, 68mm thickness
  smoothBackrestArc.position.set(0, 0.705, 0);
  smoothBackrestArc.receiveShadow = false;
  chairGroup.add(smoothBackrestArc);

  // Rounded hemispherical capsule end caps at both ends of the smooth backrest arc
  for (const endAngle of [arcStart, arcStart + arcSpan]) {
    const endCap = new THREE.Mesh(
      new THREE.SphereGeometry(tubeRadius, 24, 20),
      creamBoucleMat
    );
    endCap.scale.set(1.0, 1.88, 1.0);
    endCap.position.set(
      Math.cos(endAngle) * R_backrest,
      0.705,
      Math.sin(endAngle) * R_backrest
    );
    endCap.receiveShadow = false;
    chairGroup.add(endCap);
  }

  // 3. External Brushed-Brass Back Frame (`R_outer = R_backrest + 0.064m`, completely outside/behind the fabric!)
  const R_outerBrass = R_backrest + 0.064;
  const brassArcSpan = Math.PI * 0.82;
  const brassArcStart = Math.PI * 0.5 - brassArcSpan * 0.5;
  for (const barY of [0.665, 0.745]) {
    const externalBrassBar = new THREE.Mesh(
      new THREE.TorusGeometry(R_outerBrass, 0.0085, 16, 48, brassArcSpan),
      champagneGoldMat
    );
    externalBrassBar.rotation.x = Math.PI / 2;
    externalBrassBar.rotation.z = brassArcStart;
    externalBrassBar.position.set(0, barY, 0);
    chairGroup.add(externalBrassBar);
  }

  // Brass side mounting brackets & dark screw heads connecting the external brass bars to the rear of the cushion
  for (const bracketAngle of [brassArcStart + 0.05, brassArcStart + brassArcSpan - 0.05]) {
    const bx = Math.cos(bracketAngle) * (R_backrest + 0.045);
    const bz = Math.sin(bracketAngle) * (R_backrest + 0.045);
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.096, 0.028),
      champagneGoldMat
    );
    bracket.position.set(bx, 0.705, bz);
    bracket.rotation.y = -bracketAngle + Math.PI / 2;
    chairGroup.add(bracket);

    const screwHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.006, 12),
      blackSteelMat
    );
    screwHead.rotation.x = Math.PI / 2;
    screwHead.position.set(
      Math.cos(bracketAngle) * (R_outerBrass + 0.006),
      0.705,
      Math.sin(bracketAngle) * (R_outerBrass + 0.006)
    );
    chairGroup.add(screwHead);
  }

  // 4. Hybrid Dual-Material Legs:
  //    - Upper Rear Leg Uprights (local Y in [0.450, 0.815] -> world Y in [-0.280m, +0.085m]) in Brushed Brass
  //    - Lower 4 Angled Tapered Legs (local Y in [0.025, 0.450] -> world Y in [-0.705m, -0.280m]) in Warm Natural Oak
  //    - Bottom Brass Sabots / Ferrules (local Y in [0.000, 0.025] -> world Y in [-0.730m, -0.705m])
  for (const sx of [-1, 1]) {
    const ux = sx * 0.238;
    const uz = 0.152;
    const rearBrassUpright = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.012, 0.365, 16),
      champagneGoldMat
    );
    rearBrassUpright.position.set(ux, 0.615, uz);
    rearBrassUpright.rotation.x = 0.06;
    rearBrassUpright.rotation.z = -sx * 0.06;
    chairGroup.add(rearBrassUpright);
  }

  const legConfigs = [
    // [lx, lz, rx, rz]
    [-0.175, -0.145, 0.10, -0.10],
    [0.175, -0.145, 0.10, 0.10],
    [-0.238, 0.152, -0.08, -0.08],
    [0.238, 0.152, -0.08, 0.08],
  ];
  for (const [lx, lz, rx, rz] of legConfigs) {
    // Warm Natural Oak Lower Leg (local Y = 0.025 to 0.450)
    const oakLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.012, 0.425, 16),
      naturalOakLegMat
    );
    oakLeg.position.set(lx, 0.2375, lz);
    oakLeg.rotation.x = rx;
    oakLeg.rotation.z = rz;
    oakLeg.receiveShadow = false;
    chairGroup.add(oakLeg);

    // Brushed Brass Bottom Sabot / Ferrule (local Y = 0.000 to 0.025)
    const footX = lx - rz * 0.21;
    const footZ = lz + rx * 0.21;
    const brassSabot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0125, 0.0105, 0.026, 16),
      champagneGoldMat
    );
    brassSabot.position.set(footX, 0.013, footZ);
    brassSabot.rotation.x = rx;
    brassSabot.rotation.z = rz;
    chairGroup.add(brassSabot);
  }

  // H-Style Warm Oak Under-Seat Stretchers (local Y = 0.22m)
  for (const sx of [-0.15, 0.15]) {
    const sideStretcher = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.30, 12),
      naturalOakLegMat
    );
    sideStretcher.rotation.x = Math.PI / 2;
    sideStretcher.position.set(sx, 0.22, 0.005);
    chairGroup.add(sideStretcher);
  }
  const centerStretcher = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.30, 12),
    naturalOakLegMat
  );
  centerStretcher.rotation.z = Math.PI / 2;
  centerStretcher.position.set(0, 0.22, 0.005);
  chairGroup.add(centerStretcher);

  return chairGroup;
}

/**
 * Builds the complete V5.5 1:87 real-scale Bedroom Environment surrounding the standing desk:
 * - Expanded Room Bounds: West `X = -2.12m`, East `X = +1.36m`, North `Z = -0.365m`, South `Z = +2.55m`,
 *   Floor `Y = -0.730m`, Ceiling `Y = +1.770m`.
 * - True 3D Rectangular Wardrobe (`BuiltInOakWardrobe`) at `X in [+0.74m, +1.36m]`, `Z in [-0.365m, +1.415m]`,
 *   `Y in [-0.730m, +1.720m]` (`0.62m` deep × `1.78m` long × `2.45m` tall) with exposed South return wall at `Z = +1.415m`.
 * - Walnut 3-Drawer Cabinet Opposite Desk (`WalnutDresserAndGemini4Vignette`) on the South wall at
 *   `X = 0.00m, Y = -0.730m, Z = +2.33m` facing `-Z` toward the Desk, topped by:
 *   Left (`X = +0.24m`): Spiral ceramic pot + jade succulent; Center (`X = 0.00m`): `GEMINI 4` candle facing `-Z`;
 *   Right (`X = -0.24m`): Black marble base + glowing amber Edison globe lamp (`edisonPointLight` at `(-0.24, 0.225, 2.30)`).
 * - Closed White Bedroom Door (`BedroomDoorAndThermostat`) on the South wall at `X in [+0.58m, +1.28m]`, `Z = +2.55m`
 *   (to the left of the cabinet when facing the cabinet!), with lever handle at `(+0.66m, +0.24m, +2.51m)`,
 *   rocker switch at `(+0.49m, +0.36m, +2.53m)`, and `21.0°C` thermostat at `(+0.20m, +0.44m, +2.53m)`.
 */
export function buildRoomEnvironment(scene, settings = {}) {
  const roomRoot = new THREE.Group();
  roomRoot.name = 'RoomEnvironmentGroup';

  const proceduralRoomGroup = new THREE.Group();
  proceduralRoomGroup.name = 'ProceduralRoomFallbackGroup';
  roomRoot.add(proceduralRoomGroup);

  const roomContactAoGroup = new THREE.Group();
  roomContactAoGroup.name = 'RoomContactAoGroup';
  roomRoot.add(roomContactAoGroup);

  const {
    gemini4CandleLabelTex,
    carpetAlbedoTex,
    carpetNormalTex,
    darkWalnutTex,
    windowCityFacadeTex,
    thermostatTex,
    contactAoTex,
    bedFabricAlbedoTex,
    bedFabricNormalTex,
  } = getRoomEnvironmentTextures();

  // Shared V5.5 PBR Materials
  const carpetMat = new THREE.MeshStandardMaterial({
    name: 'Mat_BedroomCarpet',
    color: 0xffffff,
    map: carpetAlbedoTex,
    normalMap: carpetNormalTex,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.94,
    metalness: 0.0,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    name: 'Mat_BedroomWall',
    color: 0xd8cab8,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.12,
  });
  attachSouthWallOrangeGradientShader(wallMat, edisonWallGlowUniforms, 1.0);

  const ceilingMat = new THREE.MeshStandardMaterial({
    name: 'Mat_BedroomCeiling',
    color: 0xd8cab8,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.12,
  });
  attachSouthWallOrangeGradientShader(ceilingMat, edisonWallGlowUniforms, 1.0);

  const skirtingMat = new THREE.MeshStandardMaterial({
    name: 'Mat_WhiteSkirting',
    color: 0xfaf8f5,
    roughness: 0.48,
    metalness: 0.03,
    envMapIntensity: 0.14,
  });
  attachSouthWallOrangeGradientShader(skirtingMat, edisonWallGlowUniforms, 0.52);

  const bedGreyFabricMat = new THREE.MeshStandardMaterial({
    name: 'Mat_BedGreyFabric',
    color: 0xffffff,
    map: bedFabricAlbedoTex,
    normalMap: bedFabricNormalTex,
    normalScale: new THREE.Vector2(0.48, 0.48),
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.16,
  });

  const crispWhiteDuvetMat = new THREE.MeshStandardMaterial({
    name: 'Mat_CrispWhiteDuvet',
    color: 0xf4f7fc,
    normalMap: carpetNormalTex,
    normalScale: new THREE.Vector2(0.10, 0.10),
    roughness: 0.82,
    metalness: 0.0,
    envMapIntensity: 0.12,
  });

  const creamBoucleMat = new THREE.MeshStandardMaterial({
    name: 'Mat_CreamBoucle',
    color: 0xf4eee1,
    normalMap: carpetNormalTex,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.88,
    metalness: 0.0,
  });

  const naturalOakLegMat = new THREE.MeshStandardMaterial({
    name: 'Mat_ChairLegOak',
    color: 0x8e7355,
    roughness: 0.50,
    metalness: 0.04,
  });

  const champagneGoldMat = new THREE.MeshStandardMaterial({
    name: 'Mat_ChampagneGold',
    color: 0xd4af6a,
    roughness: 0.24,
    metalness: 0.88,
  });

  const wardrobeTaupeOakMat = new THREE.MeshStandardMaterial({
    name: 'Mat_WardrobeTaupeOak',
    color: 0xb6ac9c,
    roughness: 0.62,
    metalness: 0.04,
  });
  attachSouthWallOrangeGradientShader(wardrobeTaupeOakMat, edisonWallGlowUniforms, 0.45);

  const darkWalnutMat = new THREE.MeshStandardMaterial({
    name: 'Mat_DarkWalnut',
    color: 0xffffff,
    map: darkWalnutTex,
    roughness: 0.46,
    metalness: 0.04,
  });

  const smokedBlackGlassMat = new THREE.MeshStandardMaterial({
    name: 'Mat_CandleBlackGlass',
    color: 0x0d0e12,
    roughness: 0.12,
    metalness: 0.18,
  });

  const gemini4LabelMat = new THREE.MeshStandardMaterial({
    name: 'Mat_Gemini4CandleLabel',
    color: 0xffffff,
    map: gemini4CandleLabelTex,
    emissive: new THREE.Color(0xffe4b8),
    emissiveMap: gemini4CandleLabelTex,
    emissiveIntensity: 0.16,
    roughness: 0.36,
    metalness: 0.04,
  });

  const smokedBulbGlassMat = new THREE.MeshStandardMaterial({
    name: 'Mat_SmokedBulbGlass',
    color: 0xffae52,
    emissive: new THREE.Color(0xff8c24),
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.42,
    roughness: 0.12,
    metalness: 0.08,
    depthWrite: false,
  });

  const edisonFilamentMat = new THREE.MeshStandardMaterial({
    name: 'Mat_EdisonFilament',
    color: 0xff9424,
    emissive: new THREE.Color(0xff9424),
    emissiveIntensity: 2.8,
    roughness: 0.18,
    metalness: 0.1,
  });

  const nightWinTex = createNightWindowTexture();
  const windowFacadeMat = new THREE.MeshStandardMaterial({
    name: 'Mat_WindowCityFacade',
    color: 0xffffff,
    map: nightWinTex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: nightWinTex,
    emissiveIntensity: 0.20,
    roughness: 0.28,
    metalness: 0.06,
    fog: false,
  });

  const blackSteelMat = new THREE.MeshStandardMaterial({
    name: 'Mat_BlackSteel',
    color: 0x181a20,
    roughness: 0.36,
    metalness: 0.82,
  });

  const trackedMaterials = {
    filamentMaterials: [edisonFilamentMat],
    facadeMaterials: [windowFacadeMat],
  };

  // -------------------------------------------------------------------------
  // A1. EXPANDED V5.5 ROOM BOUNDS: FLOOR, WALLS, CEILING & SKIRTING
  //     West wall at X = -2.12m, East wall at X = +1.36m (width = 3.48m, center X = -0.38m)
  //     North wall at Z = -0.365m, South wall at Z = +2.55m (depth = 2.915m, center Z = +1.0925m)
  //     Floor at Y = -0.730m, Ceiling at Y = +1.770m (height = 2.50m, center Y = +0.52m)
  // -------------------------------------------------------------------------
  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(3.54, 0.04, 2.98), carpetMat);
  roomFloor.position.set(-0.38, -0.75, 1.0925);
  roomFloor.receiveShadow = true;
  proceduralRoomGroup.add(roomFloor);

  // Ceiling (Y = +1.770m)
  const roomCeiling = new THREE.Mesh(new THREE.BoxGeometry(3.54, 0.04, 2.98), ceilingMat);
  roomCeiling.position.set(-0.38, 1.79, 1.0925);
  proceduralRoomGroup.add(roomCeiling);

  // West Wall (X = -2.12m)
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.52, 2.98), wallMat);
  westWall.position.set(-2.14, 0.52, 1.0925);
  westWall.receiveShadow = true;
  proceduralRoomGroup.add(westWall);

  // East Wall (X = +1.36m — expanded to fit the 0.62m-deep 3D rectangular wardrobe & doorway foyer!)
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.52, 2.98), wallMat);
  eastWall.position.set(1.38, 0.52, 1.0925);
  eastWall.receiveShadow = true;
  proceduralRoomGroup.add(eastWall);

  // South Wall opposite the Standing Desk (Z = +2.55m)
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(3.54, 2.52, 0.04), wallMat);
  southWall.position.set(-0.38, 0.52, 2.57);
  southWall.receiveShadow = true;
  proceduralRoomGroup.add(southWall);

  // Non-overlapping 22cm-Deep North Wall & Recessed Window Alcove (Z in [-0.585m, -0.365m], center Z = -0.475m)
  // Eliminates all coplanar jamb/wall Z-fighting along X = -0.350m and X = +0.560m!
  // 1) Left Plain North Wall (X in [-2.120, -0.350], W = 1.770m, center X = -1.235m)
  const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(1.77, 2.50, 0.22), wallMat);
  backWallLeft.position.set(-1.235, 0.52, -0.475);
  backWallLeft.receiveShadow = true;
  proceduralRoomGroup.add(backWallLeft);

  // 2) Lower Plain North Wall Dado (below Window Sill, behind Desk: X in [-0.350, +0.560], Y in [-0.730, +0.065])
  const backWallDado = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.795, 0.22), wallMat);
  backWallDado.position.set(0.105, -0.3325, -0.475);
  backWallDado.receiveShadow = true;
  proceduralRoomGroup.add(backWallDado);

  // 3) Right Plain North Wall (between Window & East Wall/Wardrobe: X in [+0.560, +1.380], W = 0.820m, center X = +0.970m)
  const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.50, 0.22), wallMat);
  backWallRight.position.set(0.97, 0.52, -0.475);
  backWallRight.receiveShadow = true;
  proceduralRoomGroup.add(backWallRight);

  // 4) Upper North Wall Header Above Window Recess (X in [-0.350, +0.560], Y in [+1.755, +1.770])
  const backWallHeader = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.015, 0.22), wallMat);
  backWallHeader.position.set(0.105, 1.7625, -0.475);
  backWallHeader.receiveShadow = true;
  proceduralRoomGroup.add(backWallHeader);

  // 5) Inset Recessed Window Sill inside the 22cm Alcove (X in [-0.349, +0.559], Z in [-0.580, -0.368])
  const windowSill = new THREE.Mesh(new THREE.BoxGeometry(0.908, 0.016, 0.212), skirtingMat);
  windowSill.position.set(0.105, 0.073, -0.474);
  windowSill.receiveShadow = true;
  proceduralRoomGroup.add(windowSill);

  // 5) Recessed Inner Perimeter Window Casement Frame at back of 22cm recess (ZERO bars over glass!)
  //    White casement perimeter rails (Z = -0.562m):
  const winStileLeft = new THREE.Mesh(new THREE.BoxGeometry(0.036, 1.672, 0.024), skirtingMat);
  winStileLeft.position.set(-0.324, 0.91, -0.562);
  proceduralRoomGroup.add(winStileLeft);

  const winStileRight = new THREE.Mesh(new THREE.BoxGeometry(0.036, 1.672, 0.024), skirtingMat);
  winStileRight.position.set(0.534, 0.91, -0.562);
  proceduralRoomGroup.add(winStileRight);

  const winRailBot = new THREE.Mesh(new THREE.BoxGeometry(0.894, 0.036, 0.024), skirtingMat);
  winRailBot.position.set(0.105, 0.092, -0.562);
  proceduralRoomGroup.add(winRailBot);

  const winRailTop = new THREE.Mesh(new THREE.BoxGeometry(0.894, 0.036, 0.024), skirtingMat);
  winRailTop.position.set(0.105, 1.728, -0.562);
  proceduralRoomGroup.add(winRailTop);

  //    Thin dark rubber glazing gasket inside the white casement perimeter (Z = -0.568m):
  const gasketLeft = new THREE.Mesh(new THREE.BoxGeometry(0.010, 1.608, 0.016), blackSteelMat);
  gasketLeft.position.set(-0.302, 0.91, -0.568);
  proceduralRoomGroup.add(gasketLeft);

  const gasketRight = new THREE.Mesh(new THREE.BoxGeometry(0.010, 1.608, 0.016), blackSteelMat);
  gasketRight.position.set(0.512, 0.91, -0.568);
  proceduralRoomGroup.add(gasketRight);

  const gasketBot = new THREE.Mesh(new THREE.BoxGeometry(0.824, 0.010, 0.016), blackSteelMat);
  gasketBot.position.set(0.105, 0.112, -0.568);
  proceduralRoomGroup.add(gasketBot);

  const gasketTop = new THREE.Mesh(new THREE.BoxGeometry(0.824, 0.010, 0.016), blackSteelMat);
  gasketTop.position.set(0.105, 1.708, -0.568);
  proceduralRoomGroup.add(gasketTop);

  //    Small White Window Latch Handle on bottom casement rail:
  const winLatchBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.016), skirtingMat);
  winLatchBase.position.set(0.085, 0.092, -0.546);
  proceduralRoomGroup.add(winLatchBase);

  const winLatchLever = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.012, 0.012), skirtingMat);
  winLatchLever.position.set(0.118, 0.098, -0.536);
  proceduralRoomGroup.add(winLatchLever);

  // White Skirting Boards along the walls (height = 0.095m, Y = -0.6825m)
  const skirtWest = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.095, 2.915), skirtingMat);
  skirtWest.position.set(-2.111, -0.6825, 1.0925);
  proceduralRoomGroup.add(skirtWest);

  const skirtEastFoyer = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.095, 1.135), skirtingMat);
  skirtEastFoyer.position.set(1.351, -0.6825, 1.9825);
  proceduralRoomGroup.add(skirtEastFoyer);

  const skirtNorth = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.095, 0.018), skirtingMat);
  skirtNorth.position.set(-0.69, -0.6825, -0.356);
  proceduralRoomGroup.add(skirtNorth);

  // South wall skirting (from X = -2.12m to bedroom door edge X = +0.58m)
  const skirtSouth = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.095, 0.018), skirtingMat);
  skirtSouth.position.set(-0.77, -0.6825, 2.541);
  proceduralRoomGroup.add(skirtSouth);

  // Single Uninterrupted Night Window Glass Plane at back of 22cm recess (X = +0.105m, Y = +0.910m, Z = -0.580m)
  const facadePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.62), windowFacadeMat);
  facadePlane.position.set(0.105, 0.91, -0.580);
  proceduralRoomGroup.add(facadePlane);

  // Standing Desk Floor-Length Legs Extension & T-Feet (Y = -0.730m to -0.03m)
  const deskFloorLegsGroup = new THREE.Group();
  deskFloorLegsGroup.name = 'StandingDeskFloorLegsExtension';
  for (const lx of [-0.42, 0.42]) {
    const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.50, 0.068), blackSteelMat);
    lowerLeg.position.set(lx, -0.46, -0.02);
    lowerLeg.receiveShadow = true;
    deskFloorLegsGroup.add(lowerLeg);

    // Horizontal T-foot base on the carpet
    const tFoot = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.022, 0.52), blackSteelMat);
    tFoot.position.set(lx, -0.719, -0.01);
    tFoot.receiveShadow = true;
    deskFloorLegsGroup.add(tFoot);
  }
  roomRoot.add(deskFloorLegsGroup);

  // -------------------------------------------------------------------------
  // A2. GREY UPHOLSTERED PLATFORM BED & ORGANIC DRAPED WHITE DUVET (`NeatUpholsteredBed`)
  //     X in [-2.02, -0.62], Z in [-0.35, +1.62], Floor Y = -0.730m
  // -------------------------------------------------------------------------
  const bedGroup = buildProceduralBed(bedGreyFabricMat, crispWhiteDuvetMat, darkWalnutMat);
  proceduralRoomGroup.add(bedGroup);

  // -------------------------------------------------------------------------
  // A3. SMOOTH CONTINUOUS BOUCLÉ DESK CHAIR (`BoucleDeskChair`)
  //     X = +0.02m, Y = -0.730m, Z = +0.46m (Facing Desk -Z)
  // -------------------------------------------------------------------------
  const chairGroup = buildProceduralChair(
    creamBoucleMat,
    champagneGoldMat,
    naturalOakLegMat,
    blackSteelMat
  );
  proceduralRoomGroup.add(chairGroup);

  // -------------------------------------------------------------------------
  // A4. TRUE 3D RECTANGULAR WARDROBE (`BuiltInOakWardrobe`)
  //     Occupies X in [+0.74m, +1.36m] (0.62m deep!), Z in [-0.365m, +1.415m] (1.78m long),
  //     Y in [-0.730m, +1.720m] (2.45m tall) with exposed South return wall at Z = +1.415m
  //     and 3 pale taupe-oak doors on X = +0.74m.
  // -------------------------------------------------------------------------
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.name = 'BuiltInOakWardrobe';

  // Full 0.62m-deep x 1.78m-long x 2.45m-tall 3D rectangular cabinet volume (center X = +1.05m, Y = +0.495m, Z = +0.525m)
  const wardrobeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 2.45, 1.78),
    wardrobeTaupeOakMat
  );
  wardrobeBody.position.set(1.05, 0.495, 0.525);
  wardrobeBody.receiveShadow = true;
  wardrobeGroup.add(wardrobeBody);

  // Top Architectural Soffit Frame & Bottom Plinth Kickboard
  const wardrobeSoffit = new THREE.Mesh(
    new THREE.BoxGeometry(0.635, 0.055, 1.795),
    skirtingMat
  );
  wardrobeSoffit.position.set(1.045, 1.742, 0.525);
  wardrobeGroup.add(wardrobeSoffit);

  const wardrobePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.615, 0.08, 1.775),
    wardrobeTaupeOakMat
  );
  wardrobePlinth.position.set(1.05, -0.69, 0.525);
  wardrobeGroup.add(wardrobePlinth);

  // Exposed South Return Wall Panel at Z = +1.415m (X in [+0.74m, +1.36m], 0.62m deep!) facing the doorway foyer
  const southReturnPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 2.45, 0.024),
    wardrobeTaupeOakMat
  );
  southReturnPanel.position.set(1.05, 0.495, 1.415);
  southReturnPanel.receiveShadow = true;
  wardrobeGroup.add(southReturnPanel);

  // Skirting trim wrapping the exposed South return wall at Z = +1.425m
  const southReturnSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.095, 0.016),
    skirtingMat
  );
  southReturnSkirt.position.set(1.05, -0.6825, 1.425);
  wardrobeGroup.add(southReturnSkirt);

  // 3 Tall Pale Taupe-Oak Doors on Front Face (X = +0.74m, facing -X into the bedroom)
  // Z centers across [-0.365m, +1.415m]: -0.070m, +0.525m, +1.120m
  const doorCentersZ = [-0.070, 0.525, 1.120];
  for (let i = 0; i < 3; i++) {
    const dz = doorCentersZ[i];
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 2.33, 0.582),
      wardrobeTaupeOakMat
    );
    doorPanel.position.set(0.735, 0.505, dz);
    doorPanel.receiveShadow = true;
    wardrobeGroup.add(doorPanel);

    // Deep recessed dark-bronze / black-steel vertical handle channel (`Mat_BlackSteel`)
    const pullZ = i === 0 ? dz + 0.24 : dz - 0.24;
    const handleChannel = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.34, 0.016),
      blackSteelMat
    );
    handleChannel.position.set(0.721, 0.32, pullZ);
    wardrobeGroup.add(handleChannel);
  }

  proceduralRoomGroup.add(wardrobeGroup);

  // -------------------------------------------------------------------------
  // A5. WALNUT 3-DRAWER CABINET OPPOSITE DESK (`WalnutDresserAndGemini4Vignette`)
  //     Positioned on the South wall at X = 0.00m, Y = -0.730m, Z = +2.33m (Facing -Z toward the Desk!)
  //     Cabinet W = 0.84m (X in [-0.42m, +0.42m]), D = 0.44m (Z in [+2.11m, +2.55m]), H = 0.78m (top Y = +0.050m)
  // -------------------------------------------------------------------------
  const dresserGroup = new THREE.Group();
  dresserGroup.name = 'WalnutDresserAndGemini4Vignette';

  // Main Dark Walnut Cabinet Carcass (X in [-0.42, +0.42], Y in [-0.56, +0.04], Z in [+2.11, +2.55])
  const dresserCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.60, 0.44),
    darkWalnutMat
  );
  dresserCabinet.position.set(0.00, -0.26, 2.33);
  dresserCabinet.receiveShadow = true;
  dresserGroup.add(dresserCabinet);

  // Beveled Top Overhang Slab (top surface at Y = +0.050m)
  const dresserTopSlab = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.022, 0.46),
    darkWalnutMat
  );
  dresserTopSlab.position.set(0.00, 0.039, 2.33);
  dresserTopSlab.receiveShadow = true;
  dresserGroup.add(dresserTopSlab);

  // 3 Fluted Walnut Drawer Fronts on the -Z Face (Z = +2.10m, facing -Z toward the Desk!) + Brushed Brass Vertical Pulls
  const drawerYPositions = [-0.45, -0.26, -0.07];
  for (const dy of drawerYPositions) {
    const drawerFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.80, 0.178, 0.022),
      darkWalnutMat
    );
    drawerFront.position.set(0.00, dy, 2.10);
    drawerFront.receiveShadow = true;
    dresserGroup.add(drawerFront);

    // Concentric semi-circular fluted relief arc ring on drawer front (facing -Z)
    const arcRelief = new THREE.Mesh(
      new THREE.RingGeometry(0.042, 0.082, 24, 1, 0, Math.PI),
      darkWalnutMat
    );
    arcRelief.rotation.y = Math.PI;
    arcRelief.position.set(0.00, dy - 0.018, 2.087);
    dresserGroup.add(arcRelief);

    // Brushed Brass Vertical Pull Handle
    const brassPull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0085, 0.0085, 0.072, 16),
      champagneGoldMat
    );
    brassPull.position.set(0.00, dy + 0.008, 2.081);
    dresserGroup.add(brassPull);
  }

  // 4 Tapered Walnut Mid-Century Legs with Brass Ferrules (Y in [-0.730m, -0.560m])
  for (const [lx, lz] of [
    [-0.36, 2.16],
    [0.36, 2.16],
    [-0.36, 2.49],
    [0.36, 2.49],
  ]) {
    const wLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.013, 0.17, 14),
      darkWalnutMat
    );
    wLeg.position.set(lx, -0.645, lz);
    dresserGroup.add(wLeg);

    const ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0145, 0.013, 0.04, 14),
      champagneGoldMat
    );
    ferrule.position.set(lx, -0.71, lz);
    dresserGroup.add(ferrule);
  }

  // -------------------------------------------------------------------------
  // A5-1. LEFT ON DRESSER TOP (X = +0.24m, Y = +0.050m, Z = +2.33m — Nearest the Door):
  //       White Spiral-Ribbed Ceramic Pot + Green Jade Succulent (`Crassula ovata`)
  // -------------------------------------------------------------------------
  const jadePlantGroup = new THREE.Group();
  jadePlantGroup.name = 'SpiralPotJadeSucculentGroup';
  jadePlantGroup.position.set(0.24, 0.05, 2.33);

  const ceramicPotMat = new THREE.MeshStandardMaterial({
    color: 0xf4f0e8,
    roughness: 0.32,
    metalness: 0.04,
  });
  const potCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.044, 0.096, 24),
    ceramicPotMat
  );
  potCylinder.position.set(0, 0.048, 0);
  jadePlantGroup.add(potCylinder);

  for (let r = 0; r < 5; r++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.051 + r * 0.001, 0.0045, 10, 28),
      ceramicPotMat
    );
    rib.rotation.x = Math.PI / 2 + 0.08;
    rib.position.set(0, 0.016 + r * 0.018, 0);
    jadePlantGroup.add(rib);
  }

  const jadeLeafMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e3c,
    roughness: 0.38,
    metalness: 0.04,
  });
  const leafCount = 22;
  for (let i = 0; i < leafCount; i++) {
    const angle = i * 2.39996;
    const radius = 0.012 + Math.sqrt(i / leafCount) * 0.048;
    const height = 0.105 + (1.0 - i / leafCount) * 0.065 + (i % 3) * 0.012;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 10), jadeLeafMat);
    leaf.scale.set(1.35, 0.42, 0.82);
    leaf.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    leaf.rotation.y = -angle;
    leaf.rotation.z = -0.35 - (i / leafCount) * 0.35;
    jadePlantGroup.add(leaf);
  }
  dresserGroup.add(jadePlantGroup);

  // -------------------------------------------------------------------------
  // A5-2. CENTER ON DRESSER TOP (X = 0.00m, Y = +0.050m, Z = +2.33m):
  //       Smoked-Black Glass "GEMINI 4" Scented Candle Facing -Z toward Desk & Camera 8
  // -------------------------------------------------------------------------
  const candleGroup = new THREE.Group();
  candleGroup.name = 'Gemini4ScentedCandleGroup';
  candleGroup.position.set(0.00, 0.05, 2.33);

  const candleJar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.045, 0.106, 32),
    smokedBlackGlassMat
  );
  candleJar.position.set(0, 0.053, 0);
  candleGroup.add(candleJar);

  // Wrap-around Front Apothecary Label Shell facing -Z (theta = Math.PI) toward Camera 8 & Standing Desk!
  const labelGeo = new THREE.CylinderGeometry(
    0.0466,
    0.0456,
    0.082,
    36,
    1,
    true,
    Math.PI * 0.62,
    Math.PI * 0.76
  );
  const candleLabelMesh = new THREE.Mesh(labelGeo, gemini4LabelMat);
  candleLabelMesh.name = 'Gemini4CandleLabelMesh';
  candleLabelMesh.position.set(0, 0.052, 0);
  candleGroup.add(candleLabelMesh);

  const waxPool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.012, 24),
    new THREE.MeshStandardMaterial({
      color: 0xf5ebd6,
      emissive: new THREE.Color(0xff9d3b),
      emissiveIntensity: 0.25,
      roughness: 0.42,
    })
  );
  waxPool.position.set(0, 0.096, 0);
  candleGroup.add(waxPool);

  const wickFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.0055, 12, 12),
    edisonFilamentMat
  );
  wickFlame.scale.set(0.7, 1.8, 0.7);
  wickFlame.position.set(0, 0.108, 0);
  candleGroup.add(wickFlame);

  dresserGroup.add(candleGroup);

  // -------------------------------------------------------------------------
  // A5-3. RIGHT ON DRESSER TOP (X = -0.24m, Y = +0.050m, Z = +2.33m — Nearest the Bed):
  //       Black Marble Cylinder Base + Glowing Amber Edison Globe Lamp
  // -------------------------------------------------------------------------
  const edisonLampGroup = new THREE.Group();
  edisonLampGroup.name = 'SmokedGlassEdisonGlobeLampGroup';
  edisonLampGroup.position.set(-0.24, 0.05, 2.33);

  const blackMarbleMat = new THREE.MeshStandardMaterial({
    color: 0x161618,
    roughness: 0.22,
    metalness: 0.15,
  });
  const lampPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054, 0.058, 0.058, 28),
    blackMarbleMat
  );
  lampPlinth.position.set(0, 0.029, 0);
  edisonLampGroup.add(lampPlinth);

  const brassCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.038, 0.018, 24),
    champagneGoldMat
  );
  brassCollar.position.set(0, 0.064, 0);
  edisonLampGroup.add(brassCollar);

  // 3D Glowing Amber Helical Spiral Filament Tube (#ff9424, centered at world Y = +0.225m)
  const spiralPts = [];
  const turns = 4.5;
  const numSpiralSamples = 72;
  for (let i = 0; i <= numSpiralSamples; i++) {
    const t = i / numSpiralSamples;
    const ang = t * Math.PI * 2.0 * turns;
    const r = 0.018 * Math.sin(t * Math.PI * 0.85 + 0.15);
    const y = 0.082 + t * 0.095;
    spiralPts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
  }
  const spiralCurve = new THREE.CatmullRomCurve3(spiralPts);
  const filamentTubeGeo = new THREE.TubeGeometry(spiralCurve, 72, 0.0024, 8, false);
  const filamentMesh = new THREE.Mesh(filamentTubeGeo, edisonFilamentMat);
  filamentMesh.name = 'EdisonSpiralFilamentMesh';
  edisonLampGroup.add(filamentMesh);

  // Translucent Smoked-Amber Glass Globe Bulb (radius = 0.086m, centered at local Y = 0.142m -> world Y = 0.192m..0.225m)
  const globeBulbMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.086, 32, 24),
    smokedBulbGlassMat
  );
  globeBulbMesh.scale.set(1.0, 1.08, 1.0);
  globeBulbMesh.position.set(0, 0.142, 0);
  edisonLampGroup.add(globeBulbMesh);

  dresserGroup.add(edisonLampGroup);
  proceduralRoomGroup.add(dresserGroup);

  // -------------------------------------------------------------------------
  // A6. CLOSED WHITE BEDROOM DOOR (`BedroomDoorAndThermostat`) ON SOUTH WALL
  //     Door at X in [+0.58m, +1.28m], Z = +2.55m (To the LEFT of the cabinet when facing cabinet!)
  //     Brushed-silver lever handle at X = +0.66m, Y = +0.24m, Z = +2.51m
  //     Dual rocker switch at X = +0.49m, Y = +0.36m, Z = +2.53m
  //     21.0°C digital thermostat at X = +0.20m, Y = +0.44m, Z = +2.53m
  // -------------------------------------------------------------------------
  const doorGroup = new THREE.Group();
  doorGroup.name = 'BedroomDoorAndThermostat';

  // Flush White Bedroom Door Panel on South Wall (X in [+0.58m, +1.28m], Y in [-0.730m, +1.31m], Z = +2.536m)
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 2.04, 0.028),
    skirtingMat
  );
  doorPanel.position.set(0.93, 0.29, 2.536);
  doorPanel.receiveShadow = true;
  doorGroup.add(doorPanel);

  // Door Frame Architrave Casing (Left jamb X = +0.57m, Right jamb X = +1.29m, Top header Y = +1.325m)
  const jambLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.07, 0.036), skirtingMat);
  jambLeft.position.set(0.568, 0.305, 2.534);
  doorGroup.add(jambLeft);

  const jambRight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.07, 0.036), skirtingMat);
  jambRight.position.set(1.292, 0.305, 2.534);
  doorGroup.add(jambRight);

  const jambHeader = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.035, 0.036), skirtingMat);
  jambHeader.position.set(0.93, 1.325, 2.534);
  doorGroup.add(jambHeader);

  // Brushed Silver Lever Handle & Escutcheon at X = +0.66m, Y = +0.24m, Z = +2.51m (on the cabinet side!)
  const silverMetalMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce2,
    roughness: 0.22,
    metalness: 0.88,
  });
  const handleRose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.012, 20),
    silverMetalMat
  );
  handleRose.rotation.x = Math.PI / 2;
  handleRose.position.set(0.66, 0.24, 2.52);
  doorGroup.add(handleRose);

  const handleLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.115, 0.014, 0.022),
    silverMetalMat
  );
  handleLever.position.set(0.70, 0.24, 2.505);
  doorGroup.add(handleLever);

  // Dual Rocker Switch at X = +0.49m, Y = +0.36m, Z = +2.53m
  const switchPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.086, 0.086, 0.016),
    skirtingMat
  );
  switchPlate.position.set(0.49, 0.36, 2.535);
  doorGroup.add(switchPlate);

  // Digital Wall Thermostat (21.0°C) at X = +0.20m, Y = +0.44m, Z = +2.53m (above the Walnut Cabinet!)
  const thermoHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.088, 0.088, 0.018),
    skirtingMat
  );
  thermoHousing.position.set(0.20, 0.44, 2.535);
  doorGroup.add(thermoHousing);

  const thermoScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.072, 0.072),
    new THREE.MeshBasicMaterial({ map: thermostatTex })
  );
  thermoScreen.rotation.y = Math.PI; // Facing -Z toward Camera 8 & the Desk!
  thermoScreen.position.set(0.20, 0.44, 2.525);
  doorGroup.add(thermoScreen);

  proceduralRoomGroup.add(doorGroup);

  // -------------------------------------------------------------------------
  // B. PERSISTENT SOFT FLOOR CONTACT-SHADOW AO QUADS (`roomContactAoGroup`)
  // -------------------------------------------------------------------------
  buildRoomContactShadows(roomContactAoGroup, contactAoTex);

  // -------------------------------------------------------------------------
  // C. LOCALIZED COZY EDISON GLOBE LAMP & DESK RGB BLUE SPILL ON BLANKETS
  //    (`edisonPointLight` + `roomBounceLight`)
  // -------------------------------------------------------------------------
  const edisonPointLight = new THREE.PointLight(0xff6810, 0.85, 2.85, 1.65);
  edisonPointLight.name = 'EdisonGlobeAmberPointLight';
  edisonPointLight.position.set(-0.24, 0.225, 2.30);
  edisonPointLight.castShadow = false;
  roomRoot.add(edisonPointLight);

  // Repurposed into a localized Desk RGB Blue Spill Light shifted toward the bed
  // casting rich electric-blue light onto the adjacent blankets and pillows without spilling onto the laptop stand
  const roomBounceLight = new THREE.PointLight(0x1278ff, 0.85, 1.32, 1.75);
  roomBounceLight.name = 'DeskRgbBlueSpillPointLight';
  roomBounceLight.position.set(-0.76, 0.13, 0.08);
  roomBounceLight.castShadow = false;
  roomRoot.add(roomBounceLight);

  let lastSunScale = -1;
  let lastLampScale = -1;

  /**
   * Dynamically updates the Edison globe point light, South back wall orange gradient,
   * Desk RGB blue spill light, filament emissive glow, and night window glass.
   */
  function updateRoomLighting(sunScale = 0.0, lampScale = 1.15) {
    if (
      Math.abs(sunScale - lastSunScale) < 1e-4 &&
      Math.abs(lampScale - lastLampScale) < 1e-4
    ) {
      return;
    }
    lastSunScale = sunScale;
    lastLampScale = lampScale;

    edisonPointLight.intensity = 0.82 * lampScale;
    edisonWallGlowUniforms.uEdisonGlowScale.value = lampScale;
    roomBounceLight.intensity = 0.85 * lampScale;

    const targetFilamentEmissive = 2.6 + 1.5 * lampScale;
    for (const mat of trackedMaterials.filamentMaterials) {
      if (mat) mat.emissiveIntensity = targetFilamentEmissive;
    }

    for (const mat of trackedMaterials.facadeMaterials) {
      if (mat) {
        mat.fog = false;
        mat.emissiveIntensity = 0.20;
      }
    }
  }

  // Initialize lighting with initial settings
  updateRoomLighting(
    settings.sunIntensity ?? 0.0,
    settings.lampIntensity ?? 1.15
  );

  if (scene) {
    scene.add(roomRoot);
  }

  return {
    roomRoot,
    proceduralRoomGroup,
    roomContactAoGroup,
    edisonPointLight,
    roomBounceLight,
    calibrateRoomEnvironmentGlb: (glbScene) => {
      calibrateRoomEnvironmentGlb(glbScene, trackedMaterials);
      const s = lastSunScale >= 0 ? lastSunScale : (settings.sunIntensity ?? 0.65);
      const l = lastLampScale >= 0 ? lastLampScale : (settings.lampIntensity ?? 0.40);
      lastSunScale = -1;
      lastLampScale = -1;
      updateRoomLighting(s, l);
    },
    updateRoomLighting,
  };
}

