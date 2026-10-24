import * as THREE from 'three';
import { calibrateTrackCoasterGlb } from './CoasterTrackBuilder.js';

/**
 * Creates the V3.0/V4.0 Golden-Hour Window Sunlight (3200K, #ffb84d -> #ffe8a3),
 * 10 Overlapping Diagonal Volumetric Sunbeam Shafts + 4 Striated God-Ray Curtains,
 * Multi-Light Warm Golden-Hour Illumination (Window Bounce, Golden Fill, Keyboard Cyan Backlight),
 * 2,000 Floating Golden Dust Motes with bokeh sparkle shader,
 * and Vivid Electric-Blue (#1e6bff) Microphone Spot/Aura Lighting with Zero Specular Orbs.
 */
export function buildGoldenHourAtmosphere(scene) {
  const atmosphereGroup = new THREE.Group();
  atmosphereGroup.name = 'GoldenHourAtmosphere';

  // -------------------------------------------------------------------------
  // 1. WARM NIGHT-TIME DESK LAMP KEY ILLUMINATION + OPTIONAL GOLDEN-HOUR SUNLIGHT
  //    Default sunScale = 0.00x (Night Scene), defaultLampScale = 1.15x (Warm/Orange Desk Lamp Key Light)
  // -------------------------------------------------------------------------
  const defaultSunScale = 0.0;
  const defaultLampScale = 1.15;

  const hemiLight = new THREE.HemisphereLight(
    0x1c2238,
    0x090706,
    0.045 + 0.025 * defaultLampScale + 0.42 * defaultSunScale
  );
  atmosphereGroup.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffb84d, 0.85 * defaultSunScale);
  // Angled from upper-left rear window (~38° diagonal down-and-right across desk)
  sunLight.position.set(-0.36, 0.68, -0.52);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.08;
  sunLight.shadow.camera.far = 2.4;
  sunLight.shadow.camera.left = -0.55;
  sunLight.shadow.camera.right = 0.55;
  sunLight.shadow.camera.top = 0.48;
  sunLight.shadow.camera.bottom = -0.42;
  sunLight.shadow.bias = -0.00012;
  sunLight.shadow.normalBias = 0.0006;
  sunLight.shadow.radius = 1.15;
  sunLight.shadow.autoUpdate = false;
  sunLight.shadow.needsUpdate = true;
  sunLight.visible = defaultSunScale > 0.005;
  atmosphereGroup.add(sunLight);

  // Warm Window Area/Bounce Light moved behind the monitor (z = -0.42 < -0.233)
  const windowGlowLight = new THREE.PointLight(
    0xffbe58,
    0.50 * defaultSunScale,
    1.8,
    1.2
  );
  windowGlowLight.position.set(0.0, 0.46, -0.42);
  windowGlowLight.visible = defaultSunScale > 0.005;
  atmosphereGroup.add(windowGlowLight);

  // Warm Front-Left Fill Light
  const goldenFillLight = new THREE.DirectionalLight(
    0xffc978,
    0.24 * defaultSunScale
  );
  goldenFillLight.position.set(-0.55, 0.52, 0.35);
  goldenFillLight.visible = defaultSunScale > 0.005;
  atmosphereGroup.add(goldenFillLight);

  // Golden-hour counter-rim (completely off at night so it never washes out desk/room shadows)
  const rimLight = new THREE.DirectionalLight(0xffa652, 0.22 * defaultSunScale);
  rimLight.position.set(-0.38, 0.48, 0.62);
  rimLight.visible = defaultSunScale > 0.005;
  atmosphereGroup.add(rimLight);
  const roomFillLight = rimLight;

  // Primary Warm Key-Light Desk Lamp (Sector 4, casting crisp diagonal shadows across the desk!)
  const lampTarget = new THREE.Object3D();
  lampTarget.position.set(-0.09, 0.0, 0.065);
  atmosphereGroup.add(lampTarget);

  const lampKeyLight = new THREE.SpotLight(
    0xffb266,
    2.55 * defaultLampScale,
    1.68,
    Math.PI * 0.31,
    0.78,
    1.85
  );
  lampKeyLight.position.set(0.352, 0.355, -0.085);
  lampKeyLight.target = lampTarget;
  lampKeyLight.castShadow = true;
  lampKeyLight.shadow.mapSize.width = 2048;
  lampKeyLight.shadow.mapSize.height = 2048;
  lampKeyLight.shadow.camera.near = 0.06;
  lampKeyLight.shadow.camera.far = 1.35;
  lampKeyLight.shadow.bias = -0.00035;
  lampKeyLight.shadow.normalBias = 0.0012;
  lampKeyLight.shadow.radius = 1.15;
  lampKeyLight.shadow.autoUpdate = false;
  lampKeyLight.shadow.needsUpdate = true;
  atmosphereGroup.add(lampKeyLight);

  // Warm orange diffuser surface aura around the lamp head & corkscrew
  const lampGlowPoint = new THREE.PointLight(0xff9438, 0.38 * defaultLampScale, 0.42, 1.75);
  lampGlowPoint.position.set(0.342, 0.345, -0.062);
  atmosphereGroup.add(lampGlowPoint);

  // Localized Cyan Keyboard RGB Backlight tight to keycap deck so it doesn't wash out front coaster truss shadows
  const kbBacklight = new THREE.PointLight(0x00e5ff, 0.24, 0.16, 2.0);
  kbBacklight.position.set(-0.161, 0.018, 0.118);
  atmosphereGroup.add(kbBacklight);

  // -------------------------------------------------------------------------
  // 2. LOCALIZED ELECTRIC-BLUE MICROPHONE LED RING GLOW (#1868ff)
  // -------------------------------------------------------------------------
  const micPos = new THREE.Vector3(-0.025, 0.105, -0.045);

  // Zeroed/short-range point light (distance = 0.09, intensity = 0.0) so no blue dot reflects on the monitor screen!
  // Marked visible = false so Three.js excludes it from the per-pixel PBR point-light loop.
  const micPointLight = new THREE.PointLight(0x1e6bff, 0.0, 0.09, 1.8);
  micPointLight.position.copy(micPos);
  micPointLight.visible = false;
  atmosphereGroup.add(micPointLight);

  const micSpotTarget = new THREE.Object3D();
  micSpotTarget.position.set(-0.015, 0.0, -0.025);
  atmosphereGroup.add(micSpotTarget);

  const micSpotLight = new THREE.SpotLight(
    0x1868ff,
    0.48,
    0.28,
    Math.PI * 0.36,
    0.85,
    1.5
  );
  micSpotLight.position.copy(micPos);
  micSpotLight.target = micSpotTarget;
  atmosphereGroup.add(micSpotLight);

  // Disabled micAuraCone (kept as hidden/zero-opacity reference so no translucent blue cone floats on the desk)
  const micAuraUniforms = {
    uColor: { value: new THREE.Color(0x1e6bff) },
    uIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const micAuraMat = new THREE.MeshBasicMaterial({
    color: 0x1e6bff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  const micAuraCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.01, 0.01, 8, 1, true),
    micAuraMat
  );
  micAuraCone.position.set(-0.025, 0.048, -0.038);
  micAuraCone.visible = false;

  // -------------------------------------------------------------------------
  // 3. 3D VOLUMETRIC GOLDEN-HOUR WINDOW SUNBEAM SHAFTS & STRIATED GOD-RAY CURTAINS
  //    10 rich diagonal golden-hour shafts (rTop: 0.055..0.095, rBot: 0.16..0.26,
  //    baseOpacity: 0.042..0.065) streaming from upper-left/rear window at ~38°
  //    down and to the right, PLUS 4 wide soft diagonal god-ray planes!
  // -------------------------------------------------------------------------
  const sunbeamUniforms = {
    uColorWarm: { value: new THREE.Color(0xffb84d) },
    uColorCore: { value: new THREE.Color(0xffe8a3) },
    uIntensity: { value: defaultSunScale },
    uTime: { value: 0.0 },
  };

  function createSunbeamConeMaterial(baseOpacity) {
    const compensatedOpacity = baseOpacity * 1.62;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColorWarm: sunbeamUniforms.uColorWarm,
        uColorCore: sunbeamUniforms.uColorCore,
        uIntensity: sunbeamUniforms.uIntensity,
        uTime: sunbeamUniforms.uTime,
        uBaseOpacity: { value: compensatedOpacity },
      },
      transparent: true,
      opacity: compensatedOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vec4 mvPos = viewMatrix * worldPos;
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorWarm;
        uniform vec3 uColorCore;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uBaseOpacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        void main() {
          // Soft radial cylinder edge falloff + smooth top/bottom longitudinal fade
          float fresnel = pow(max(0.0, abs(dot(vNormal, vViewDir))), 1.55);
          float longiFade = smoothstep(0.0, 0.20, vUv.y) * smoothstep(1.0, 0.12, vUv.y);
          // Diagonal 38-degree venetian/window light ray striations
          float diagCoord = vWorldPos.x * 0.788 + vWorldPos.y * 0.615;
          float bands = 0.76 + 0.24 * sin(diagCoord * 34.0 + uTime * 0.35)
                             + 0.12 * sin(diagCoord * 78.0 - uTime * 0.22);
          float effIntensity = pow(max(0.0, uIntensity), 0.92);
          float alpha = clamp(fresnel * longiFade * bands * uBaseOpacity * effIntensity, 0.0, 0.62);
          vec3 col = mix(uColorWarm, uColorCore, clamp(fresnel * 0.52 + (1.0 - vUv.y) * 0.25, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    mat.userData.baseOpacity = baseOpacity;
    return mat;
  }

  function createGodRayCurtainMaterial(baseOpacity, phaseOffset = 0.0) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColorWarm: sunbeamUniforms.uColorWarm,
        uColorCore: sunbeamUniforms.uColorCore,
        uIntensity: sunbeamUniforms.uIntensity,
        uTime: sunbeamUniforms.uTime,
        uBaseOpacity: { value: baseOpacity },
        uPhase: { value: phaseOffset },
      },
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorWarm;
        uniform vec3 uColorCore;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uBaseOpacity;
        uniform float uPhase;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          // Soft 4-edge vignette so the plane blends seamlessly into the room air
          float edgeX = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.18, vUv.x);
          float edgeY = smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
          float envelope = edgeX * edgeY;

          // Diagonal ~38° ray coordinate perpendicular to the upper-left -> lower-right sun vector
          // Ray travel direction: (+0.62, -0.78), perpendicular axis: (+0.78, +0.62)
          float rayPerp = vWorldPos.x * 0.788 + vWorldPos.y * 0.615 + uPhase;
          float rayAlong = (vWorldPos.x * 0.615 - vWorldPos.y * 0.788);

          // Multi-layered striated golden-hour god-rays matching media_1789990164702.jpg
          float s1 = 0.5 + 0.5 * sin(rayPerp * 26.0 + uTime * 0.18);
          float s2 = 0.5 + 0.5 * sin(rayPerp * 58.0 - 1.4 + uTime * 0.11);
          float s3 = 0.5 + 0.5 * sin(rayPerp * 112.0 + 2.7);
          float striations = pow(s1, 1.6) * 0.55 + pow(s2, 2.2) * 0.32 + pow(s3, 3.0) * 0.18;

          // Brighter near upper-left window origin, gently attenuating down-and-right
          float sourceBoost = smoothstep(0.55, -0.45, rayAlong) * 0.65 + 0.35;
          float effIntensity = pow(max(0.0, uIntensity), 0.90);
          float alpha = clamp(envelope * (0.28 + 0.72 * striations) * sourceBoost * uBaseOpacity * effIntensity, 0.0, 0.58);

          vec3 col = mix(uColorWarm, uColorCore, clamp(striations * 0.65 + sourceBoost * 0.25, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    mat.userData.baseOpacity = baseOpacity;
    return mat;
  }

  const sunbeamGroup = new THREE.Group();
  sunbeamGroup.name = 'VolumetricSunbeams';
  const sunbeamsGroup = sunbeamGroup;

  // 10 rich, overlapping diagonal golden-hour sunbeam shafts (rTop: 0.055..0.095, rBot: 0.16..0.26,
  // baseOpacity: 0.042..0.065) streaming from upper-left / rear window (X in [-0.42..+0.38],
  // Y in [0.52..0.68], Z in [-0.46..-0.38]) at ~38° diagonal angle down-and-right across the desk!
  const beamConfigs = [
    { from: [-0.42, 0.66, -0.44], to: [0.04, 0.02, 0.08], rTop: 0.075, rBot: 0.22, opacity: 0.062 },
    { from: [-0.34, 0.68, -0.45], to: [0.14, 0.02, 0.12], rTop: 0.085, rBot: 0.24, opacity: 0.065 },
    { from: [-0.26, 0.65, -0.44], to: [0.22, 0.02, 0.06], rTop: 0.080, rBot: 0.23, opacity: 0.058 },
    { from: [-0.18, 0.66, -0.46], to: [0.30, 0.02, 0.14], rTop: 0.090, rBot: 0.25, opacity: 0.060 },
    { from: [-0.08, 0.64, -0.45], to: [0.38, 0.02, 0.10], rTop: 0.095, rBot: 0.26, opacity: 0.056 },
    { from: [0.02, 0.66, -0.44], to: [0.46, 0.04, 0.04], rTop: 0.082, rBot: 0.22, opacity: 0.052 },
    { from: [0.14, 0.62, -0.42], to: [0.52, 0.06, -0.02], rTop: 0.070, rBot: 0.19, opacity: 0.048 },
    { from: [-0.38, 0.56, -0.40], to: [-0.02, 0.01, 0.18], rTop: 0.065, rBot: 0.18, opacity: 0.050 },
    { from: [-0.12, 0.58, -0.42], to: [0.26, 0.01, 0.20], rTop: 0.072, rBot: 0.20, opacity: 0.046 },
    { from: [0.24, 0.54, -0.38], to: [0.54, 0.02, 0.12], rTop: 0.055, rBot: 0.16, opacity: 0.042 },
  ];

  for (const cfg of beamConfigs) {
    const pStart = new THREE.Vector3(...cfg.from);
    const pEnd = new THREE.Vector3(...cfg.to);
    const dir = new THREE.Vector3().subVectors(pEnd, pStart);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);

    const coneGeo = new THREE.CylinderGeometry(cfg.rTop, cfg.rBot, len, 28, 1, true);
    const coneMat = createSunbeamConeMaterial(cfg.opacity);
    const beamMesh = new THREE.Mesh(coneGeo, coneMat);
    beamMesh.position.copy(mid);
    beamMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      dir.clone().normalize()
    );
    sunbeamGroup.add(beamMesh);
  }

  // 4 wide soft diagonal volumetric god-ray planes behind and across the desk
  // recreating the striated diagonal golden light rays on the left wall & across monitor/lamp
  const curtainConfigs = [
    {
      pos: [-0.14, 0.34, -0.35],
      size: [1.24, 0.72],
      rot: [0.0, 0.06, 0.0],
      opacity: 0.064,
      phase: 0.0,
    },
    {
      pos: [0.02, 0.32, -0.26],
      size: [1.18, 0.66],
      rot: [0.04, -0.04, 0.0],
      opacity: 0.054,
      phase: 0.85,
    },
    {
      pos: [0.04, 0.26, -0.11],
      size: [1.14, 0.58],
      rot: [0.08, 0.03, 0.0],
      opacity: 0.044,
      phase: 1.7,
    },
    {
      pos: [0.06, 0.21, 0.05],
      size: [1.08, 0.50],
      rot: [0.12, -0.02, 0.0],
      opacity: 0.035,
      phase: 2.55,
    },
  ];

  const godRayCurtainGroup = new THREE.Group();
  godRayCurtainGroup.name = 'GodRayCurtainPlanesGroup';
  for (const cCfg of curtainConfigs) {
    const planeGeo = new THREE.PlaneGeometry(cCfg.size[0], cCfg.size[1], 1, 1);
    const planeMat = createGodRayCurtainMaterial(cCfg.opacity, cCfg.phase);
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.position.set(...cCfg.pos);
    planeMesh.rotation.set(...cCfg.rot);
    godRayCurtainGroup.add(planeMesh);
  }
  sunbeamGroup.add(godRayCurtainGroup);

  atmosphereGroup.add(sunbeamGroup);

  // -------------------------------------------------------------------------
  // 4. 2,000 FLOATING GOLDEN DUST MOTES (Warm Golden Sparkle in Sunbeams)
  // -------------------------------------------------------------------------
  const moteCount = 2000;
  const motePositions = new Float32Array(moteCount * 3);
  const motePhases = new Float32Array(moteCount);
  const moteScales = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3 + 0] = (Math.random() - 0.5) * 1.14;
    motePositions[i * 3 + 1] = 0.01 + Math.random() * 0.54;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.64;
    motePhases[i] = Math.random() * Math.PI * 2.0;
    moteScales[i] = 0.65 + Math.random() * 1.65;
  }

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(motePhases, 1));
  moteGeo.setAttribute('aScale', new THREE.BufferAttribute(moteScales, 1));

  const moteUniforms = {
    uTime: { value: 0.0 },
    uIntensity: { value: defaultSunScale },
    uOpacity: { value: 0.44 },
    uMicPos: { value: micPos },
  };

  const moteMat = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aScale;
      uniform float uTime;
      uniform vec3 uMicPos;
      varying float vTwinkle;
      varying float vBlueBlend;
      void main() {
        vec3 pos = position;
        // Gentle golden-hour convection drift
        pos.x += sin(uTime * 0.32 + aPhase) * 0.012;
        pos.y += cos(uTime * 0.24 + aPhase * 1.3) * 0.009;
        pos.z += sin(uTime * 0.29 + aPhase * 0.7) * 0.011;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float distToMic = length(pos - uMicPos);
        vBlueBlend = smoothstep(0.18, 0.03, distToMic);
        vTwinkle = 0.45 + 0.55 * sin(uTime * 2.1 + aPhase * 3.0);

        gl_PointSize = clamp((13.5 * aScale) / max(0.14, -mvPosition.z), 1.2, 8.5);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      uniform float uOpacity;
      varying float vTwinkle;
      varying float vBlueBlend;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;

        // Soft circular bokeh disc falloff
        float bokeh = smoothstep(0.5, 0.08, d);
        vec3 goldCol = vec3(0.98, 0.78, 0.44);
        vec3 blueCol = vec3(0.22, 0.58, 0.96);
        vec3 col = mix(goldCol, blueCol, vBlueBlend);

        float alpha = bokeh * vTwinkle * uOpacity * clamp(uIntensity * 0.65, 0.0, 2.2);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const dustPoints = new THREE.Points(moteGeo, moteMat);
  dustPoints.name = 'GoldenDustMotes2000';
  atmosphereGroup.add(dustPoints);

  scene.add(atmosphereGroup);

  // Reusable colors for smooth scene.background / scene.fog interpolation across 0.0x .. 5.0x
  const bgDarkSlate = new THREE.Color(0x06070b);
  const bgGoldenMid = new THREE.Color(0x3a2919);
  const bgGoldenMax = new THREE.Color(0x5c4126);
  const tmpBgColor = new THREE.Color();

  let lastSunScale = -1;
  let lastLampScale = -1;
  let lastMicScale = -1;

  function requestShadowMapUpdate() {
    if (sunLight.visible) sunLight.shadow.needsUpdate = true;
    lampKeyLight.shadow.needsUpdate = true;
  }

  function updateAtmosphere(
    elapsedTime,
    settings = {},
    renderer = null,
    bloomPass = null,
    targetScene = scene,
    diorama = null
  ) {
    const sunScale = settings.sunIntensity ?? settings.sunbeamIntensity ?? 0.0;
    const lampScale = settings.lampIntensity ?? 1.15;
    const micScale = settings.micGlowIntensity ?? 0.85;
    const hasSun = sunScale > 0.005;

    sunbeamGroup.visible = hasSun;
    if (hasSun) {
      sunbeamUniforms.uTime.value = elapsedTime;
      sunbeamUniforms.uIntensity.value = sunScale;
    }

    const showMotes = (settings.showDustMotes ?? false) && hasSun;
    dustPoints.visible = showMotes;
    if (showMotes) {
      moteUniforms.uTime.value = elapsedTime;
      moteUniforms.uIntensity.value = sunScale;
    }

    const lightingChanged =
      Math.abs(sunScale - lastSunScale) > 1e-5 ||
      Math.abs(lampScale - lastLampScale) > 1e-5 ||
      Math.abs(micScale - lastMicScale) > 1e-5;

    if (lightingChanged) {
      const prevHasSun = lastSunScale > 0.005;
      lastSunScale = sunScale;
      lastLampScale = lampScale;
      lastMicScale = micScale;

      sunLight.visible = hasSun;
      windowGlowLight.visible = hasSun;
      goldenFillLight.visible = hasSun;
      rimLight.visible = hasSun;
      if (hasSun && !prevHasSun) {
        sunLight.shadow.needsUpdate = true;
      }

      // Dark Cozy Night-Time Desk Lamp Key Light + High-Contrast Shadows
      sunLight.intensity = 0.85 * sunScale;
      hemiLight.intensity = 0.045 + 0.025 * lampScale + 0.42 * sunScale;
      hemiLight.color.setHex(0x1c2238);
      hemiLight.groundColor.setHex(0x090706);
      windowGlowLight.intensity = 0.50 * sunScale;
      goldenFillLight.intensity = 0.24 * sunScale;
      rimLight.intensity = 0.22 * sunScale;
      lampKeyLight.intensity = 2.40 * lampScale;
      lampGlowPoint.intensity = 0.45 * lampScale;
      kbBacklight.intensity = 0.45;

      // Ensure micAuraCone stays completely disabled/invisible
      micAuraCone.visible = false;
      micAuraMat.opacity = 0.0;
      micAuraUniforms.uIntensity.value = 0.0;

      // Localized blue microphone accent light
      micPointLight.intensity = 0.0;
      micPointLight.visible = false;
      micSpotLight.intensity = 0.48 * micScale;

      // Dynamic Tone Mapping Exposure scaling: balanced warm night indoor exposure
      if (renderer) {
        renderer.toneMappingExposure = 0.74 + 0.07 * sunScale + 0.06 * lampScale;
      }

      // Dynamically blend scene.background and scene.fog.color from #06070b (0x) -> #3a2919 (2.25x) -> #5c4126 (5.0x)
      const activeScene = targetScene || scene;
      if (activeScene) {
        if (sunScale <= 2.25) {
          const t = THREE.MathUtils.clamp(sunScale / 2.25, 0.0, 1.0);
          tmpBgColor.lerpColors(bgDarkSlate, bgGoldenMid, t);
        } else {
          const t = THREE.MathUtils.clamp((sunScale - 2.25) / 2.75, 0.0, 1.0);
          tmpBgColor.lerpColors(bgGoldenMid, bgGoldenMax, t);
        }
        if (activeScene.background && activeScene.background.isColor) {
          activeScene.background.copy(tmpBgColor);
        } else {
          activeScene.background = tmpBgColor.clone();
        }
        if (activeScene.fog) {
          if (activeScene.fog.color) {
            activeScene.fog.color.copy(tmpBgColor);
          }
          if (activeScene.fog.density !== undefined) {
            activeScene.fog.density = 0.018;
          }
        }
      }

      if (diorama && typeof diorama.updateLightingMaterials === 'function') {
        diorama.updateLightingMaterials(sunScale, lampScale);
      }
    } else if (renderer) {
      renderer.toneMappingExposure = 0.74 + 0.07 * sunScale + 0.06 * lampScale;
    }

    if (bloomPass) {
      bloomPass.strength = settings.bloomStrength ?? 0.06;
      bloomPass.radius = 0.24;
      bloomPass.threshold = 1.12;
    }
  }

  // Run initial calibration immediately
  updateAtmosphere(0.0, { sunIntensity: defaultSunScale, lampIntensity: defaultLampScale, showDustMotes: false }, null, null, scene, null);

  return {
    atmosphereGroup,
    sunLight,
    hemiLight,
    windowGlowLight,
    goldenFillLight,
    kbBacklight,
    rimLight,
    roomFillLight,
    lampKeyLight,
    lampGlowPoint,
    micPointLight,
    micSpotLight,
    micAuraCone,
    sunbeamGroup,
    sunbeamsGroup,
    godRayCurtainGroup,
    dustPoints,
    requestShadowMapUpdate,
    updateAtmosphere,
    update: updateAtmosphere,
  };
}
