(function(root) {
'use strict';
const LUDO_TRACK = [
    [6,1], [6,2], [6,3], [6,4], [6,5],
    [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], [0,7], [0,8],
    [1,8], [2,8], [3,8], [4,8], [5,8],
    [6,9], [6,10], [6,11], [6,12], [6,13], [6,14], [7,14],
    [8,14], [8,13], [8,12], [8,11], [8,10], [8,9],
    [9,8], [10,8], [11,8], [12,8], [13,8], [14,8], [14,7], [14,6],
    [13,6], [12,6], [11,6], [10,6], [9,6],
    [8,5], [8,4], [8,3], [8,2], [8,1], [8,0], [7,0], [6,0]
];
const LUDO_SLOTS = [
    {
        name: 'Red',
        color: '#e53935',
        light: '#ffd8d5',
        yardBox: [0, 0, 6, 6],
        yard: [[1.5,1.5], [1.5,3.5], [3.5,1.5], [3.5,3.5]],
        homeLane: [[7,1], [7,2], [7,3], [7,4], [7,5]]
    },
    {
        name: 'Green',
        color: '#16a34a',
        light: '#d7f5df',
        yardBox: [0, 9, 6, 6],
        yard: [[1.5,10.5], [1.5,12.5], [3.5,10.5], [3.5,12.5]],
        homeLane: [[1,7], [2,7], [3,7], [4,7], [5,7]]
    },
    {
        name: 'Yellow',
        color: '#f6c343',
        light: '#fff1be',
        yardBox: [9, 9, 6, 6],
        yard: [[10.5,10.5], [10.5,12.5], [12.5,10.5], [12.5,12.5]],
        homeLane: [[7,13], [7,12], [7,11], [7,10], [7,9]]
    },
    {
        name: 'Blue',
        color: '#1e88e5',
        light: '#d7ebff',
        yardBox: [9, 0, 6, 6],
        yard: [[10.5,1.5], [10.5,3.5], [12.5,1.5], [12.5,3.5]],
        homeLane: [[13,7], [12,7], [11,7], [10,7], [9,7]]
    }
];

function point(slotIndex, tokenIndex, progress, unit = 1) {
    const slot = LUDO_SLOTS[slotIndex] || LUDO_SLOTS[0];
    let row;
    let col;
    if (progress === -1) {
        [row, col] = slot.yard[tokenIndex] || slot.yard[0];
    } else if (progress >= 56) {
        const centers = [[6.7,7.5],[7.5,6.7],[8.3,7.5],[7.5,8.3]];
        const offsets = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];
        const [ox, oy] = offsets[tokenIndex] || [0, 0];
        const [cx,cy] = centers[slotIndex] || centers[0];
        return { x: (cx + ox) * unit, y: (cy + oy) * unit };
    } else if (progress >= 51) {
        [row, col] = slot.homeLane[Math.min(slot.homeLane.length - 1, progress - 51)];
    } else {
        [row, col] = LUDO_TRACK[((slotIndex * 13 + progress) % 52)];
    }
    return { x: (col + 0.5) * unit, y: (row + 0.5) * unit };
}

// Positions remain authoritative; these paths only animate the received change.
function motions(before, after) {
    const result=[];
    after.players.forEach((player,index)=>{
        const previousIndex=before.players.findIndex(p=>p.id===player.id);
        if(previousIndex<0)return;
        const slot=player.slot??index;
        (after.positions[index]||[]).forEach((next,token)=>{
            const previous=before.positions[previousIndex]?.[token];
            if(!Number.isInteger(previous)||previous===next)return;
            let steps;
            if(previous===-1&&next===0)steps=[-1,0];
            else if(next===-1)steps=[previous,-1];
            else if(next>previous&&next-previous<=6)steps=Array.from({length:next-previous+1},(_,i)=>previous+i);
            else return;
            result.push({key:`${player.id}:${token}`,points:steps.map(progress=>point(slot,token,progress)),
                stepMs:next===-1?260:160,delay:0,captured:next===-1});
        });
    });
    const arrival=Math.max(0,...result.filter(p=>!p.captured).map(p=>(p.points.length-1)*p.stepMs));
    result.forEach(p=>{if(p.captured)p.delay=arrival;});
    return result;
}
function sample(motion, elapsed) {
    const time=Math.max(0,elapsed-motion.delay);
    const duration=(motion.points.length-1)*motion.stepMs;
    if(time>=duration)return {...motion.points.at(-1),lift:0,done:true};
    const step=Math.floor(time/motion.stepMs),fraction=(time%motion.stepMs)/motion.stepMs;
    const eased=fraction*fraction*(3-2*fraction),from=motion.points[step],to=motion.points[step+1];
    return {x:from.x+(to.x-from.x)*eased,y:from.y+(to.y-from.y)*eased,
        lift:Math.sin(Math.PI*fraction)*.22,done:false};
}
const api = {track:LUDO_TRACK, slots:LUDO_SLOTS, point, motions, sample};
if(typeof module==='object'&&module.exports) module.exports=api;else root.LudoBoard=api;
})(typeof window==='undefined'?globalThis:window);
