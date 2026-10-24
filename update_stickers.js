const fs = require('fs');
const path = require('path');

const memeGifDir = '/home/uv/Videos/Messenger/meme gif';
const destDir = '/home/uv/Videos/Messenger/public/stickers/gif_memes';
const stickersJsPath = '/home/uv/Videos/Messenger/public/js/stickers.js';

// Get all gifs
const files = fs.readdirSync(memeGifDir).filter(f => f.endsWith('.gif'));

// Copy files
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
// Clear destDir
fs.readdirSync(destDir).forEach(f => fs.unlinkSync(path.join(destDir, f)));

files.forEach(f => {
  fs.copyFileSync(path.join(memeGifDir, f), path.join(destDir, f));
});

console.log(`Copied ${files.length} gifs to ${destDir}`);

// Generate new array
let newStickers = [];
files.forEach((f, index) => {
  newStickers.push(`      { id: "gif_meme_${index}", src: "/stickers/gif_memes/${f}", label: "Meme ${index + 1}" }`);
});

const packStr = `const IMAGE_STICKER_PACKS = [
  {
    id: "gif-memes",
    name: "GIF Memes",
    icon: "🎬",
    stickers: [
${newStickers.join(',\n')}
    ]
  }
];`;

let stickersContent = fs.readFileSync(stickersJsPath, 'utf-8');
stickersContent = stickersContent.replace(/const IMAGE_STICKER_PACKS = \[[\s\S]*?\];\n/, packStr + '\n');
fs.writeFileSync(stickersJsPath, stickersContent);
console.log('Updated stickers.js');

