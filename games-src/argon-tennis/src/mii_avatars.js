let c=0;export const MII_PROFILES={player1:{id:"player1",name:"Player 1",team:"player",badgeBgInner:"rgba(255, 118, 88, 0.56)",badgeBgOuter:"rgba(220, 44, 24, 0.22)",badgeRim:"rgba(255, 230, 220, 0.72)",skinLight:"#fff4e8",skinMid:"#ffdfc4",skinShade:"#e8aa86",skinStroke:"#c9825b",earInner:"#de926b",blushColor:"rgba(255, 105, 95, 0.38)",hairLight:"#6b3c1e",hairMid:"#4a2812",hairDark:"#2e1709",hairSpecular:"rgba(255, 220, 185, 0.30)",hairStyle:"swept_puffs",headgear:"white_red_headband",browColor:"#361b0b",browTilt:"confident",irisLight:"#2c3d59",irisDark:"#121824",lashes:!1,glasses:!1,mouthStyle:"happy_grin",shirtLight:"#f64a35",shirtDark:"#c62312",collarAccent:"#e83b28"},player2:{id:"player2",name:"Maya",team:"player",badgeBgInner:"rgba(255, 132, 102, 0.52)",badgeBgOuter:"rgba(225, 52, 32, 0.20)",badgeRim:"rgba(255, 232, 222, 0.68)",skinLight:"#fff7ee",skinMid:"#ffe4cc",skinShade:"#ebb08a",skinStroke:"#cc8862",earInner:"#e29872",blushColor:"rgba(255, 112, 108, 0.42)",hairLight:"#874222",hairMid:"#632c13",hairDark:"#3f1a09",hairSpecular:"rgba(255, 210, 175, 0.32)",hairStyle:"bouncy_locks",headgear:"white_red_visor",browColor:"#4a200d",browTilt:"cheerful",irisLight:"#4a2e1b",irisDark:"#1f1209",lashes:!0,glasses:!1,mouthStyle:"joyful_smile",shirtLight:"#f64a35",shirtDark:"#c62312",collarAccent:"#e83b28"},opponent1:{id:"opponent1",name:"Matt",team:"opponent",badgeBgInner:"rgba(92, 148, 255, 0.56)",badgeBgOuter:"rgba(38, 78, 230, 0.24)",badgeRim:"rgba(215, 232, 255, 0.72)",skinLight:"#fff0dc",skinMid:"#f5cba7",skinShade:"#dc9c6e",skinStroke:"#bc7a4c",earInner:"#d48c5e",blushColor:"rgba(245, 115, 95, 0.28)",hairLight:"#313b52",hairMid:"#181c26",hairDark:"#0b0e14",hairSpecular:"rgba(165, 202, 255, 0.34)",hairStyle:"spiky_rival",headgear:"blue_white_headband",browColor:"#12161f",browTilt:"fierce_v",irisLight:"#263654",irisDark:"#0f1522",lashes:!1,glasses:!1,mouthStyle:"rival_smirk",shirtLight:"#4276ff",shirtDark:"#1c44c9",collarAccent:"#2b5cff"},opponent2:{id:"opponent2",name:"Akira",team:"opponent",badgeBgInner:"rgba(84, 165, 255, 0.52)",badgeBgOuter:"rgba(32, 92, 224, 0.22)",badgeRim:"rgba(215, 236, 255, 0.68)",skinLight:"#ffeed9",skinMid:"#f0c49e",skinShade:"#d6986a",skinStroke:"#b87648",earInner:"#ce895c",blushColor:"rgba(240, 115, 95, 0.26)",hairLight:"#2b3c63",hairMid:"#17223b",hairDark:"#0c1221",hairSpecular:"rgba(140, 210, 255, 0.32)",hairStyle:"sleek_parted",headgear:"blue_visor_band",browColor:"#121b30",browTilt:"focused",irisLight:"#1e3a5f",irisDark:"#0d1829",lashes:!1,glasses:!0,mouthStyle:"cool_smile",shirtLight:"#4276ff",shirtDark:"#1c44c9",collarAccent:"#2b5cff"}},ELEMENT_ID_TO_CHARACTER={"mii-icon-player":"player1","mii-icon-player-2":"player2","plate-mii-player":"player1","setup-mii-player":"player1","victory-mii-icon":"player1","mii-icon-opponent":"opponent1","mii-icon-opponent-2":"opponent2","setup-mii-opponent":"opponent1"};const t={head:"M 60 20 C 79 20, 91 31, 93 48 C 95 62, 96 71, 86 81 C 78 88, 69 91, 60 91 C 51 91, 42 88, 34 81 C 24 71, 25 62, 27 48 C 29 31, 41 20, 60 20 Z",foreheadGlow:"M 38 30 C 48 23, 72 23, 82 30 C 75 27, 45 27, 38 30 Z",shoulders:"M 15 120 C 17 95, 35 87, 60 87 C 85 87, 103 95, 105 120 Z",shoulderHighlight:"M 22 116 C 25 97, 40 90, 60 90 C 80 90, 95 97, 98 116 L 92 116 C 89 101, 76 94, 60 94 C 44 94, 31 101, 28 116 Z",collarLeft:"M 46 85 C 39 87, 37 94, 44 98 L 58 94 L 51 85 Z",collarRight:"M 74 85 C 81 87, 83 94, 76 98 L 62 94 L 69 85 Z",neckV:"M 51 85 L 60 96 L 69 85 Z",hairSweptBase:"M 23 43 C 20 26, 29 15, 41 16 C 47 9, 59 8, 65 14 C 72 9, 83 11, 88 19 C 96 22, 100 31, 97 43 C 95 49, 95 54, 93 55 L 91 41 C 83 35, 37 35, 29 41 L 27 55 C 25 54, 25 49, 23 43 Z",hairSweptPuffs:"M 27 38 C 27 25, 34 18, 43 20 C 48 13, 58 12, 64 18 C 70 13, 80 15, 84 22 C 91 24, 94 31, 93 38 Z",hairSweptHighlight:"M 33 25 C 37 19, 43 19, 46 23 C 51 16, 60 15, 64 21 C 70 16, 78 17, 83 24 C 77 21, 70 20, 64 24 C 58 19, 51 20, 46 26 C 41 22, 36 22, 33 25 Z",hairBouncyBase:"M 21 46 C 18 24, 34 10, 60 10 C 86 10, 102 24, 99 46 C 101 58, 99 69, 93 75 C 91 66, 92 54, 90 43 C 78 36, 42 36, 30 43 C 28 54, 29 66, 27 75 C 21 69, 19 58, 21 46 Z",hairBouncyCrown:"M 26 39 C 29 19, 44 12, 60 12 C 76 12, 91 19, 94 39 Z",hairBouncyHighlight:"M 36 23 C 48 15, 72 15, 84 23 C 72 19, 48 19, 36 23 Z",hairSpikyBase:"M 23 42 C 21 31, 23 21, 31 25 C 32 14, 39 9, 47 19 C 52 8, 57 4, 60 4 C 63 4, 68 8, 73 19 C 81 9, 88 14, 89 25 C 97 21, 99 31, 97 42 L 93 55 L 90 41 C 78 35, 42 35, 30 41 L 27 55 Z",hairSpikyTufts:"M 26 37 C 25 29, 27 24, 33 28 C 34 18, 40 13, 47 22 C 52 12, 57 7, 60 7 C 63 7, 68 12, 73 22 C 80 13, 86 18, 87 28 C 93 24, 95 29, 94 37 Z",hairSpikyHighlight:"M 36 24 C 38 17, 42 16, 45 23 C 41 20, 38 20, 36 24 Z M 54 19 C 57 10, 63 10, 66 19 C 62 14, 58 14, 54 19 Z M 75 23 C 78 16, 82 17, 84 24 C 82 20, 79 20, 75 23 Z",hairSleekBase:"M 23 43 C 20 23, 36 11, 60 11 C 85 11, 100 23, 97 43 L 93 55 L 90 41 C 80 35, 58 34, 42 42 C 36 38, 32 39, 30 42 L 27 55 Z",hairSleekFringe:"M 30 36 C 44 31, 68 32, 88 39 C 74 43, 52 44, 34 39 Z",hairSleekHighlight:"M 36 22 C 50 14, 74 15, 86 24 C 72 19, 50 18, 36 22 Z",headbandBand:"M 22 37 C 38 31, 82 31, 98 37 L 97 43.5 C 82 38, 38 38, 23 43.5 Z",headbandCenterStripe:"M 22.5 40.2 C 38 34.5, 82 34.5, 97.5 40.2",headbandTopTrim:"M 22.3 38.0 C 38 32.3, 82 32.3, 97.7 38.0",headbandBottomTrim:"M 22.8 42.4 C 38 36.8, 82 36.8, 97.2 42.4",visorBrim:"M 19 39 C 36 29, 84 29, 101 39 C 88 45, 32 45, 19 39 Z",noseContour:"M 55 58.5 C 54.2 62.8, 57 64.8, 60 64.8 C 63 64.8, 65.8 62.8, 65 58.5",mouthHappyOuter:"M 47.5 70.5 C 50.5 81, 69.5 81, 72.5 70.5 C 65 72.5, 55 72.5, 47.5 70.5 Z",mouthHappyTeeth:"M 49 71.2 C 55 72.8, 65 72.8, 71 71.2 L 69.5 74.8 C 64 75.8, 56 75.8, 50.5 74.8 Z",mouthHappyTongue:"M 52.5 76.2 C 56 74.2, 64 74.2, 67.5 76.2 C 64.5 79.5, 55.5 79.5, 52.5 76.2 Z",mouthJoyfulOuter:"M 46.5 69.8 C 49.5 82, 70.5 82, 73.5 69.8 C 65 72, 55 72, 46.5 69.8 Z",mouthJoyfulTeeth:"M 48 70.6 C 55 72.4, 65 72.4, 72 70.6 L 70.2 74.5 C 64 75.6, 56 75.6, 49.8 74.5 Z",mouthRivalOuter:"M 48.5 71.5 C 53 78.5, 68 77.5, 73 69.5 C 65 71.5, 55 72, 48.5 71.5 Z",mouthRivalTeeth:"M 50 71.8 C 56 72.5, 65 71.8, 71.5 70.2 L 69.5 73.8 C 63 74.8, 55 74.8, 51 73.8 Z",mouthCoolOuter:"M 49 71.2 C 52.5 78.5, 67.5 78.5, 71 71.2 C 64 72.6, 56 72.6, 49 71.2 Z",mouthCoolTeeth:"M 50.5 71.7 C 56 72.8, 64 72.8, 69.5 71.7 L 68 74.6 C 63 75.5, 57 75.5, 52 74.6 Z"};export function resolveMiiProfile(l){if(!l)return MII_PROFILES.player1;const a=String(l).trim();if(MII_PROFILES[a])return MII_PROFILES[a];const i=ELEMENT_ID_TO_CHARACTER[a];return i&&MII_PROFILES[i]?MII_PROFILES[i]:a.includes("opponent-2")||a.includes("opponent2")?MII_PROFILES.opponent2:a.includes("opponent")?MII_PROFILES.opponent1:a.includes("player-2")||a.includes("player2")?MII_PROFILES.player2:MII_PROFILES.player1}export function getMiiAvatarSVG(l="player1",a={}){const i=resolveMiiProfile(l),r=a.uid||`${i.id}-${++c}`;let e="";i.browTilt==="fierce_v"?e=`
      <path d="M 32 42.5 Q 43 44.5 52 47.5" stroke="${i.browColor}" stroke-width="4.4" stroke-linecap="round" fill="none" />
      <path d="M 88 42.5 Q 77 44.5 68 47.5" stroke="${i.browColor}" stroke-width="4.4" stroke-linecap="round" fill="none" />
    `:i.browTilt==="cheerful"?e=`
      <path d="M 33 45.5 Q 43 40.5 51 44" stroke="${i.browColor}" stroke-width="3.6" stroke-linecap="round" fill="none" />
      <path d="M 69 44 Q 77 40.5 87 45.5" stroke="${i.browColor}" stroke-width="3.6" stroke-linecap="round" fill="none" />
    `:i.browTilt==="focused"?e=`
      <path d="M 33 44.5 Q 43 43 52 45.5" stroke="${i.browColor}" stroke-width="3.8" stroke-linecap="round" fill="none" />
      <path d="M 87 44.5 Q 77 43 68 45.5" stroke="${i.browColor}" stroke-width="3.8" stroke-linecap="round" fill="none" />
    `:e=`
      <path d="M 33 45 Q 43 41 52 44.5" stroke="${i.browColor}" stroke-width="4.0" stroke-linecap="round" fill="none" />
      <path d="M 68 44.5 Q 77 41 87 45" stroke="${i.browColor}" stroke-width="4.0" stroke-linecap="round" fill="none" />
    `;let o="";i.hairStyle==="swept_puffs"?o=`
      <path d="${t.hairSweptBase}" fill="url(#hair-${r})" />
      <path d="${t.hairSweptPuffs}" fill="url(#hair-${r})" />
      <path d="${t.hairSweptHighlight}" fill="${i.hairSpecular}" />
      <!-- Forehead headband shadow -->
      <path d="${t.headbandBand}" transform="translate(0, 1.8)" fill="rgba(110, 52, 22, 0.25)" />
      <!-- Crisp White Tennis Headband with Orange-Red Stripe (matches render_03_assets_lineup.png) -->
      <path d="${t.headbandBand}" fill="url(#visor-white-${r})" stroke="#d5e0ec" stroke-width="0.9" />
      <path d="${t.headbandCenterStripe}" stroke="#e83b28" stroke-width="2.6" stroke-linecap="round" fill="none" />
    `:i.hairStyle==="bouncy_locks"?o=`
      <path d="${t.hairBouncyBase}" fill="url(#hair-${r})" />
      <path d="${t.hairBouncyCrown}" fill="url(#hair-${r})" />
      <path d="${t.hairBouncyHighlight}" fill="${i.hairSpecular}" />
      <!-- Sporty Red/White Tennis Sun Visor -->
      <path d="${t.headbandBand}" fill="#e83b28" />
      <path d="${t.headbandTopTrim}" stroke="#ffffff" stroke-width="1.3" fill="none" />
      <path d="${t.visorBrim}" fill="url(#visor-white-${r})" stroke="#ccd9e8" stroke-width="1.0" />
    `:i.hairStyle==="spiky_rival"?o=`
      <path d="${t.hairSpikyBase}" fill="url(#hair-${r})" />
      <path d="${t.hairSpikyTufts}" fill="url(#hair-${r})" />
      <path d="${t.hairSpikyHighlight}" fill="${i.hairSpecular}" />
      <!-- Forehead headband shadow -->
      <path d="${t.headbandBand}" transform="translate(0, 1.8)" fill="rgba(60, 30, 15, 0.24)" />
      <!-- Sleek Royal-Blue Headband with Crisp White Trim (matches render_03_assets_lineup.png) -->
      <path d="${t.headbandBand}" fill="url(#shirt-${r})" stroke="#1738a8" stroke-width="0.9" />
      <path d="${t.headbandTopTrim}" stroke="#ffffff" stroke-width="1.35" stroke-linecap="round" fill="none" />
      <path d="${t.headbandBottomTrim}" stroke="#ffffff" stroke-width="1.35" stroke-linecap="round" fill="none" />
    `:o=`
      <path d="${t.hairSleekBase}" fill="url(#hair-${r})" />
      <path d="${t.hairSleekFringe}" fill="url(#hair-${r})" />
      <path d="${t.hairSleekHighlight}" fill="${i.hairSpecular}" />
      <path d="${t.headbandBand}" fill="url(#shirt-${r})" />
      <path d="${t.headbandCenterStripe}" stroke="#7be0ff" stroke-width="2.0" stroke-linecap="round" fill="none" />
    `;const h=i.lashes?`
      <path d="M 34.5 50.5 L 31.5 48 M 36 48.2 L 33.8 45.5" stroke="#1a1412" stroke-width="2.0" stroke-linecap="round" />
      <path d="M 85.5 50.5 L 88.5 48 M 84 48.2 L 86.2 45.5" stroke="#1a1412" stroke-width="2.0" stroke-linecap="round" />
    `:"",f=i.glasses?`
      <g class="mii-sport-glasses">
        <rect x="31" y="46.5" width="24" height="14.5" rx="6" fill="rgba(85, 222, 255, 0.26)" stroke="#d8f6ff" stroke-width="1.8" />
        <rect x="65" y="46.5" width="24" height="14.5" rx="6" fill="rgba(85, 222, 255, 0.26)" stroke="#d8f6ff" stroke-width="1.8" />
        <path d="M 55 52.5 Q 60 50.5 65 52.5" stroke="#d8f6ff" stroke-width="2.0" fill="none" />
        <path d="M 25 51 L 31 52 M 89 52 L 95 51" stroke="#25a8f5" stroke-width="2.0" stroke-linecap="round" />
        <path d="M 35 49 L 40 58 M 69 49 L 74 58" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.6" stroke-linecap="round" />
      </g>
    `:"";let s="";return i.mouthStyle==="rival_smirk"?s=`
      <path d="${t.mouthRivalOuter}" fill="#591b16" stroke="#3d120e" stroke-width="1.4" stroke-linejoin="round" />
      <path d="${t.mouthRivalTeeth}" fill="#ffffff" />
      <path d="M 72.5 68.2 C 74.5 69.2, 75 71.2, 73.8 72.5" stroke="${i.skinStroke}" stroke-width="1.5" stroke-linecap="round" fill="none" />
    `:i.mouthStyle==="cool_smile"?s=`
      <path d="${t.mouthCoolOuter}" fill="#541a16" stroke="#3b110e" stroke-width="1.35" stroke-linejoin="round" />
      <path d="${t.mouthCoolTeeth}" fill="#ffffff" />
      <path d="${t.mouthHappyTongue}" fill="#ff7d7d" />
    `:i.mouthStyle==="joyful_smile"?s=`
      <path d="${t.mouthJoyfulOuter}" fill="#5e1b18" stroke="#421210" stroke-width="1.4" stroke-linejoin="round" />
      <path d="${t.mouthJoyfulTeeth}" fill="#ffffff" />
      <path d="${t.mouthHappyTongue}" fill="#ff7d7d" />
    `:s=`
      <path d="${t.mouthHappyOuter}" fill="#5e1b18" stroke="#421210" stroke-width="1.4" stroke-linejoin="round" />
      <path d="${t.mouthHappyTeeth}" fill="#ffffff" />
      <path d="${t.mouthHappyTongue}" fill="#ff7d7d" />
      <path d="M 45.8 69.5 C 44.5 70.8, 44.8 72.5, 46.2 73.2 M 74.2 69.5 C 75.5 70.8, 75.2 72.5, 73.8 73.2" stroke="${i.skinStroke}" stroke-width="1.3" stroke-linecap="round" fill="none" />
    `,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="wii-mii-svg" data-mii-id="${i.id}" role="img" aria-label="${i.name} Mii Portrait">
  <defs>
    <clipPath id="badge-clip-${r}">
      <circle cx="60" cy="60" r="56" />
    </clipPath>
    <radialGradient id="badge-bg-${r}" cx="50%" cy="45%" r="56%">
      <stop offset="0%" stop-color="${i.badgeBgInner}" />
      <stop offset="72%" stop-color="${i.badgeBgOuter}" />
      <stop offset="100%" stop-color="rgba(12, 16, 22, 0.35)" />
    </radialGradient>
    <radialGradient id="skin-${r}" cx="42%" cy="35%" r="64%">
      <stop offset="0%" stop-color="${i.skinLight}" />
      <stop offset="58%" stop-color="${i.skinMid}" />
      <stop offset="100%" stop-color="${i.skinShade}" />
    </radialGradient>
    <radialGradient id="nose-${r}" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="${i.skinLight}" />
      <stop offset="55%" stop-color="${i.skinMid}" />
      <stop offset="100%" stop-color="${i.earInner}" />
    </radialGradient>
    <radialGradient id="blush-${r}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${i.blushColor}" />
      <stop offset="100%" stop-color="rgba(255, 110, 100, 0)" />
    </radialGradient>
    <linearGradient id="hair-${r}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${i.hairLight}" />
      <stop offset="55%" stop-color="${i.hairMid}" />
      <stop offset="100%" stop-color="${i.hairDark}" />
    </linearGradient>
    <linearGradient id="shirt-${r}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${i.shirtLight}" />
      <stop offset="100%" stop-color="${i.shirtDark}" />
    </linearGradient>
    <linearGradient id="visor-white-${r}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e5eef7" />
    </linearGradient>
    <linearGradient id="iris-${r}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${i.irisDark}" />
      <stop offset="100%" stop-color="${i.irisLight}" />
    </linearGradient>
  </defs>

  <g clip-path="url(#badge-clip-${r})">
    <!-- Glowing Team Backdrop -->
    <circle cx="60" cy="60" r="56" fill="url(#badge-bg-${r})" />

    <!-- Sporty Polo Shirt Shoulders & Crisp White Collar -->
    <path d="${t.shoulders}" fill="url(#shirt-${r})" stroke="rgba(0,0,0,0.28)" stroke-width="1.4" />
    <path d="${t.shoulderHighlight}" fill="rgba(255,255,255,0.16)" />

    <!-- Neck & Chin Shadow -->
    <rect x="50" y="80" width="20" height="14" rx="6" fill="${i.skinShade}" />
    <path d="${t.neckV}" fill="${i.skinShade}" />

    <!-- White Polo Placket & Collar Flaps (matches render_03_assets_lineup.png) -->
    <rect x="56.2" y="91" width="7.6" height="19" rx="2.6" fill="#ffffff" stroke="#d4e0ec" stroke-width="0.9" />
    <circle cx="60" cy="96.5" r="1.2" fill="#b8c8d8" />
    <circle cx="60" cy="102.5" r="1.2" fill="#b8c8d8" />
    <path d="${t.collarLeft}" fill="#ffffff" stroke="#d0dce8" stroke-width="1.1" stroke-linejoin="round" />
    <path d="${t.collarRight}" fill="#ffffff" stroke="#d0dce8" stroke-width="1.1" stroke-linejoin="round" />

    <!-- Symmetrical Plump Mii Ears -->
    <g>
      <ellipse cx="23" cy="57.5" rx="7.2" ry="10.2" transform="rotate(-7 23 57.5)" fill="url(#skin-${r})" stroke="${i.skinStroke}" stroke-width="1.5" />
      <path d="M 23.5 53 C 20.5 54, 20.5 60, 23.8 61.5" stroke="${i.earInner}" stroke-width="1.7" stroke-linecap="round" fill="none" />
      <ellipse cx="97" cy="57.5" rx="7.2" ry="10.2" transform="rotate(7 97 57.5)" fill="url(#skin-${r})" stroke="${i.skinStroke}" stroke-width="1.5" />
      <path d="M 96.5 53 C 99.5 54, 99.5 60, 96.2 61.5" stroke="${i.earInner}" stroke-width="1.7" stroke-linecap="round" fill="none" />
    </g>

    <!-- Plump Rounded Nintendo Mii Head -->
    <path d="${t.head}" fill="url(#skin-${r})" stroke="${i.skinStroke}" stroke-width="1.6" stroke-linejoin="round" />
    <path d="${t.foreheadGlow}" fill="rgba(255, 255, 255, 0.34)" />

    <!-- Warm Rosy Cheek Blushes -->
    <ellipse cx="35.5" cy="65.5" rx="8.5" ry="5.2" fill="url(#blush-${r})" />
    <ellipse cx="84.5" cy="65.5" rx="8.5" ry="5.2" fill="url(#blush-${r})" />

    <!-- Expressive Nintendo Mii Eyes (Left cx=43.5, Right cx=76.5, cy=54.5) -->
    <g class="mii-eyes">
      <!-- Left Eye -->
      <ellipse cx="43.5" cy="54.5" rx="8.2" ry="9.4" fill="#ffffff" stroke="#cfdbe6" stroke-width="0.9" />
      <ellipse cx="44.2" cy="54.8" rx="5.6" ry="6.7" fill="url(#iris-${r})" />
      <circle cx="44.2" cy="54.8" r="3.1" fill="#090c12" />
      <circle cx="41.8" cy="51.8" r="2.5" fill="#ffffff" />
      <circle cx="46.2" cy="57.2" r="1.25" fill="#ffffff" />
      <path d="M 34.8 53.5 C 35.8 46.2, 51.2 46.2, 52.2 53.5" stroke="#181412" stroke-width="2.6" stroke-linecap="round" fill="none" />

      <!-- Right Eye -->
      <ellipse cx="76.5" cy="54.5" rx="8.2" ry="9.4" fill="#ffffff" stroke="#cfdbe6" stroke-width="0.9" />
      <ellipse cx="75.8" cy="54.8" rx="5.6" ry="6.7" fill="url(#iris-${r})" />
      <circle cx="75.8" cy="54.8" r="3.1" fill="#090c12" />
      <circle cx="73.8" cy="51.8" r="2.5" fill="#ffffff" />
      <circle cx="78.2" cy="57.2" r="1.25" fill="#ffffff" />
      <path d="M 67.8 53.5 C 68.8 46.2, 84.2 46.2, 85.2 53.5" stroke="#181412" stroke-width="2.6" stroke-linecap="round" fill="none" />
      ${h}
    </g>

    ${f}

    <!-- Sculpted 3D Nintendo Mii Button Nose -->
    <g class="mii-nose">
      <ellipse cx="60" cy="61.8" rx="5.4" ry="4.2" fill="rgba(165, 88, 48, 0.24)" />
      <ellipse cx="60" cy="59.6" rx="5.4" ry="4.6" fill="url(#nose-${r})" />
      <path d="${t.noseContour}" stroke="${i.skinStroke}" stroke-width="1.65" stroke-linecap="round" fill="none" />
      <ellipse cx="58.4" cy="57.8" rx="2.1" ry="1.4" fill="rgba(255, 255, 255, 0.55)" />
    </g>

    <!-- Mouth / Smile -->
    <g class="mii-mouth">
      ${s}
    </g>

    <!-- Eyebrows -->
    <g class="mii-brows">
      ${e}
    </g>

    <!-- Hair & Athletic Headband / Visor -->
    <g class="mii-hair-headgear">
      ${o}
    </g>
  </g>

  <!-- Subtle Crisp Outer Badge Rim Highlight -->
  <circle cx="60" cy="60" r="55.2" fill="none" stroke="${i.badgeRim}" stroke-width="1.6" />
</svg>`}export function drawMiiCanvasHiDPI(l,a="player1"){if(!l||typeof l.getContext!="function")return;const i=resolveMiiProfile(a),r=192;l.width!==r&&(l.width=r),l.height!==r&&(l.height=r);const e=l.getContext("2d");if(!e)return;e.save(),e.clearRect(0,0,r,r),e.scale(r/120,r/120),e.beginPath(),e.arc(60,60,56,0,Math.PI*2),e.clip();const o=e.createRadialGradient(60,54,4,60,60,56);o.addColorStop(0,i.badgeBgInner),o.addColorStop(.72,i.badgeBgOuter),o.addColorStop(1,"rgba(12, 16, 22, 0.35)"),e.fillStyle=o,e.fillRect(0,0,120,120);const h=typeof Path2D=="function",f=e.createLinearGradient(60,86,60,120);f.addColorStop(0,i.shirtLight),f.addColorStop(1,i.shirtDark),e.fillStyle=f,h?e.fill(new Path2D(t.shoulders)):(e.beginPath(),e.arc(60,118,42,Math.PI,0,!1),e.fill()),e.fillStyle=i.skinShade,e.fillRect(50,80,20,14),h&&(e.fillStyle="#ffffff",e.fill(new Path2D(t.collarLeft)),e.fill(new Path2D(t.collarRight)));const s=e.createRadialGradient(50,42,6,60,56,46);if(s.addColorStop(0,i.skinLight),s.addColorStop(.58,i.skinMid),s.addColorStop(1,i.skinShade),e.fillStyle=s,e.strokeStyle=i.skinStroke,e.lineWidth=1.5,[-1,1].forEach(n=>{e.beginPath(),e.ellipse(60+n*37,57.5,7.2,10.2,n*.12,0,Math.PI*2),e.fill(),e.stroke()}),e.fillStyle=s,e.strokeStyle=i.skinStroke,e.lineWidth=1.6,h){const n=new Path2D(t.head);e.fill(n),e.stroke(n)}else e.beginPath(),e.arc(60,56,35,0,Math.PI*2),e.fill(),e.stroke();[35.5,84.5].forEach(n=>{const d=e.createRadialGradient(n,65.5,1,n,65.5,8.5);d.addColorStop(0,i.blushColor),d.addColorStop(1,"rgba(255, 110, 100, 0)"),e.fillStyle=d,e.beginPath(),e.ellipse(n,65.5,8.5,5.2,0,0,Math.PI*2),e.fill()}),[{ex:43.5,ix:44.2,cx1:41.8,cx2:46.2},{ex:76.5,ix:75.8,cx1:73.8,cx2:78.2}].forEach(({ex:n,ix:d,cx1:k,cx2:u})=>{e.fillStyle="#ffffff",e.beginPath(),e.ellipse(n,54.5,8.2,9.4,0,0,Math.PI*2),e.fill(),e.fillStyle=i.irisDark,e.beginPath(),e.ellipse(d,54.8,5.6,6.7,0,0,Math.PI*2),e.fill(),e.fillStyle="#ffffff",e.beginPath(),e.arc(k,51.8,2.5,0,Math.PI*2),e.arc(u,57.2,1.25,0,Math.PI*2),e.fill()}),e.fillStyle=i.skinMid,e.beginPath(),e.ellipse(60,59.6,5.4,4.6,0,0,Math.PI*2),e.fill(),h&&(e.strokeStyle=i.skinStroke,e.lineWidth=1.65,e.lineCap="round",e.stroke(new Path2D(t.noseContour))),h&&(i.mouthStyle==="rival_smirk"?(e.fillStyle="#591b16",e.fill(new Path2D(t.mouthRivalOuter)),e.fillStyle="#ffffff",e.fill(new Path2D(t.mouthRivalTeeth))):i.mouthStyle==="cool_smile"?(e.fillStyle="#541a16",e.fill(new Path2D(t.mouthCoolOuter)),e.fillStyle="#ffffff",e.fill(new Path2D(t.mouthCoolTeeth)),e.fillStyle="#ff7d7d",e.fill(new Path2D(t.mouthHappyTongue))):(e.fillStyle="#5e1b18",e.fill(new Path2D(t.mouthHappyOuter)),e.fillStyle="#ffffff",e.fill(new Path2D(t.mouthHappyTeeth)),e.fillStyle="#ff7d7d",e.fill(new Path2D(t.mouthHappyTongue))));const p=e.createLinearGradient(60,8,60,55);p.addColorStop(0,i.hairLight),p.addColorStop(.55,i.hairMid),p.addColorStop(1,i.hairDark),e.fillStyle=p,h&&(i.hairStyle==="spiky_rival"?(e.fill(new Path2D(t.hairSpikyBase)),e.fill(new Path2D(t.hairSpikyTufts)),e.fillStyle=f,e.fill(new Path2D(t.headbandBand))):i.hairStyle==="bouncy_locks"?(e.fill(new Path2D(t.hairBouncyBase)),e.fill(new Path2D(t.hairBouncyCrown)),e.fillStyle="#ffffff",e.fill(new Path2D(t.visorBrim))):i.hairStyle==="sleek_parted"?(e.fill(new Path2D(t.hairSleekBase)),e.fill(new Path2D(t.hairSleekFringe)),e.fillStyle=f,e.fill(new Path2D(t.headbandBand))):(e.fill(new Path2D(t.hairSweptBase)),e.fill(new Path2D(t.hairSweptPuffs)),e.fillStyle="#ffffff",e.fill(new Path2D(t.headbandBand)),e.strokeStyle="#e83b28",e.lineWidth=2.6,e.stroke(new Path2D(t.headbandCenterStripe)))),e.strokeStyle=i.badgeRim,e.lineWidth=1.6,e.beginPath(),e.arc(60,60,55.2,0,Math.PI*2),e.stroke(),e.restore()}export function renderMiiAvatar(l,a=null,i={}){const r=typeof l=="string"?document.getElementById(l):l;if(!r)return null;const e=a||r.dataset?.miiId||r.id||"player1",o=resolveMiiProfile(e),h=i.uid||(r.id?`${r.id}-${o.id}`:`${o.id}-${++c}`),f=getMiiAvatarSVG(o.id,{...i,uid:h});if(r.tagName&&r.tagName.toLowerCase()==="canvas"){drawMiiCanvasHiDPI(r,o.id),r.classList.add("mii-canvas-backed");const s=r.parentElement;if(s){const p=s.querySelector(`svg.wii-mii-svg[data-for-canvas="${r.id}"]`);if(p)p.outerHTML=f.replace('class="wii-mii-svg"',`class="wii-mii-svg" data-for-canvas="${r.id}"`);else{const n=document.createElement("div");n.innerHTML=f.trim();const d=n.firstElementChild;d&&(r.id&&d.setAttribute("data-for-canvas",r.id),s.insertBefore(d,r.nextSibling))}}return r}return r.innerHTML=f,r}export function renderAllHudMiiAvatars(){Object.entries(ELEMENT_ID_TO_CHARACTER).forEach(([l,a])=>{const i=document.getElementById(l);i&&renderMiiAvatar(i,a)})}
