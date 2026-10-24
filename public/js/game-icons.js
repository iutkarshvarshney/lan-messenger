/* Distinct local SVG artwork; independent of emoji fonts. */
(()=>{
 const board='M3 3h18v18H3Z ';
 const paths={
 wizardchess:'M7 21h13 M10 21l1-6-4 1-3-4 6-8h6l3 6v11 M10 4V2l5 2 M12 8h.01 M7 12h4',
 ludo:board+'M3 9h6V3 M15 3v6h6 M3 15h6v6 M15 21v-6h6 M9 9l6 6 M15 9l-6 6 M6 6h.01 M18 6h.01 M6 18h.01 M18 18h.01',
 scribble:'m14 3 7 7-9 9-7-7Z M5 12c-5 1-1 6-4 9 5 0 10-2 8-6 M12 5l7 7',
 memorymatch:'M3 6h8v15H3Z M14 3h7v15h-7Z M5 11l2-2 2 2-2 3Z M16 8l2-2 1 2-1 3Z',
 wordscramble:'M3 17 8 4l5 13 M5 12h6 M16 8h5l-5 9h5 M15 4h6',
 rallyclub:'M17 14a6 7 40 1 0-9-9 6 7 40 0 0 9 9 M9 14l-6 8 M6 17l2 2 M11 4l7 6 M8 7l7 6 M19 18a2 2 0 1 1 0 4 2 2 0 0 1 0-4',
 deskracer:'M3 17v-6l3-6h12l3 6v6Z M3 11h18 M5 17v3h3v-3 M16 17v3h3v-3 M6 14h2 M16 14h2',
 tictactoe:board+'M9 3v18 M15 3v18 M3 9h18 M3 15h18 M5 5l2 2 M5 7l2-2 M17 17l2 2 M17 19l2-2 M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
 dotsandboxes:'M5 5h.01 M12 5h.01 M19 5h.01 M5 12h.01 M19 12h.01 M5 19h.01 M12 19h.01 M19 19h.01 M5 5h7v7H5Z M12 12h7v7',
 connectfour:board+'M7 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M12 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M17 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M7 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M17 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M7 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M12 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M17 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
 rockpaperscissors:'M8 13 5 5a1.4 1.4 0 0 1 2.5-1L12 11l2-8a1.4 1.4 0 0 1 2.7.6L15 13l3-2a1.5 1.5 0 0 1 2 2l-4 7H9l-5-6a1.5 1.5 0 0 1 2-2l3 3',
 retropong:'M3 5h3v14H3Z M18 5h3v14h-3Z M12 2v3 M12 8v3 M12 14v3 M12 20v2 M10 11h3v3h-3Z',
 stickfight:'M6 21v-5l-3-3V8l3-1 2 3V4l3-1 2 1 3-1 3 2v7l-3 4v5Z M8 10h4 M12 4v5 M16 4v5 M6 17h10',
 reversi:'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18 M12 3v18 M4 9h8 M3 12h9 M4 15h8 M6 18h6 M6 6h6',
 gomoku:board+'M9 3v18 M15 3v18 M3 9h18 M3 15h18 M6 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M18 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
 snake:'M5 5h10a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10 M5 3v4 M18 19v4 M13 7h.01 M16 7h.01',
 mines:'M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12 M12 2v4 M12 18v4 M2 12h4 M18 12h4 M5 5l3 3 M16 16l3 3 M5 19l3-3 M16 8l3-3 M10 9h.01',
 breakout:'M3 3h18v7H3Z M9 3v7 M15 3v7 M3 6h18 M7 21h10 M13 12l-4 6 M15 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2',
 '2048':board
 };
 const svg=type=>`<svg class="arc-icon game-art-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[type]||paths.ludo}"/>${type==='2048'?'<text x="12" y="14" text-anchor="middle" fill="currentColor" stroke="none" font-size="6.5" font-weight="700" font-family="system-ui,sans-serif">2048</text>':''}</svg>`;
 window.MessengerGameIcons={svg};
})();
