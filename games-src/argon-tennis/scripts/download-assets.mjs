import fs from 'node:fs/promises';
import path from 'node:path';

const GSTATIC_BASE = 'https://www.gstatic.com/aistudio/starter-apps/tennis';

const ASSETS_TO_DOWNLOAD = [
  // 3D Models (.glb)
  'models/stadium_court.glb',
  'models/tennis_net.glb',
  'models/mii_player.glb',
  'models/mii_opponent.glb',
  'models/tennis_racket.glb',
  'models/tennis_ball.glb',
  'models/mii_crowd.glb',
  // MediaPipe Hands binary/model assets
  'mediapipe/hands/hands.binarypb',
  'mediapipe/hands/hands_solution_packed_assets.data',
  'mediapipe/hands/hands_solution_simd_wasm_bin.wasm',
  'mediapipe/hands/hands_solution_wasm_bin.wasm',
  'mediapipe/hands/hand_landmark_full.tflite',
  'mediapipe/hands/hand_landmark_lite.tflite',
];

async function downloadAsset(relPath) {
  const destPath = path.resolve('public', 'assets', relPath);
  try {
    const stat = await fs.stat(destPath);
    if (stat.size > 0) {
      return;
    }
  } catch {
    // File does not exist yet; proceed with download
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const url = `${GSTATIC_BASE}/${relPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
  console.log(`[download-assets] Downloaded ${relPath} (${buffer.length} bytes)`);
}

async function main() {
  console.log('[download-assets] Ensuring static 3D models and MediaPipe assets in public/assets/...');
  await Promise.all(ASSETS_TO_DOWNLOAD.map(downloadAsset));
  console.log('[download-assets] All static assets ready.');
}

main().catch((err) => {
  console.error('[download-assets] Error:', err);
  process.exit(1);
});
