const fs = require('fs');
const path = 'public/js/app.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.startsWith('const EMOJI_DATA = {'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.startsWith('};'));

if (startIndex !== -1 && endIndex !== -1) {
    const freshEmojiData = `const EMOJI_DATA = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃'],
    people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐'],
    activities: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🏓', '🏸'],
    objects: ['⌚️', '📱', '📲', '💻', '⌨️', '🖱', '🖲', '🕹', '🗜', '💽'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'],
    flags: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽']
};`;

    const newLines = [
        ...lines.slice(0, startIndex),
        freshEmojiData,
        ...lines.slice(endIndex + 1)
    ];

    fs.writeFileSync(path, newLines.join('\n'), 'utf8');
    console.log('Fixed EMOJI_DATA in public/js/app.js');
} else {
    console.error('Could not find EMOJI_DATA boundaries');
}
