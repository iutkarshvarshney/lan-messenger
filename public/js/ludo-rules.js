(function(root) {
    'use strict';
    const SAFE = [0,8,13,21,26,34,39,47];
    function square(game, player, progress) {
        return progress < 0 || progress >= 51 ? null : ((game.players[player].slot ?? player)*13+progress)%52;
    }
    function movable(game, player, roll) {
        if (!Number.isInteger(roll) || roll < 1 || roll > 6) return [];
        return (game.positions[player] || []).flatMap((p,i)=>p === -1 ? (roll===6?[i]:[]) : (p<56 && p+roll<=56?[i]:[]));
    }
    function move(game, player, token, roll) {
        if (!movable(game,player,roll).includes(token)) throw new Error('Illegal Ludo move');
        const current=game.positions[player][token];
        const next=current===-1?0:current+roll;
        game.positions[player][token]=next;
        const destination=square(game,player,next);
        let captured=0;
        if (destination!==null && !SAFE.includes(destination)) {
            game.positions.forEach((tokens,opponent)=>{
                if (opponent===player) return;
                const occupants=tokens.flatMap((p,i)=>square(game,opponent,p)===destination?[i]:[]);
                // Two pieces of the same colour protect one another. They do not block passage.
                if (occupants.length===1) { tokens[occupants[0]]=-1; captured++; }
            });
        }
        return {captured, finished:next===56, extraTurn:roll===6 || captured>0 || next===56};
    }
    const api={SAFE,square,movable,move};
    if (typeof module!=='undefined' && module.exports) module.exports=api;
    if(root) root.LudoRules=api;
})(typeof window!=='undefined'?window:globalThis);
