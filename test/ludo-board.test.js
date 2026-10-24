const test = require('node:test');
const assert = require('node:assert/strict');
const board = require('../public/js/ludo-board');

test('all four base tokens sit symmetrically inside their home square', () => {
    const centers = [[3,3],[12,3],[12,12],[3,12]];
    centers.forEach(([cx,cy],slot) => {
        const points = [0,1,2,3].map(token => board.point(slot,token,-1));
        assert.deepEqual(points, [
            {x:cx-1,y:cy-1},{x:cx+1,y:cy-1},
            {x:cx-1,y:cy+1},{x:cx+1,y:cy+1}
        ]);
    });
});

test('a moved token follows each track square and reaches its exact destination', () => {
    assert.equal(typeof board.motions,'function');
    const before={players:[{id:'a',slot:0}],positions:[[4,-1,-1,-1]]};
    const after={players:before.players,positions:[[7,-1,-1,-1]]};
    const [motion]=board.motions(before,after);
    assert.deepEqual(motion.points,[{x:5.5,y:6.5},{x:6.5,y:5.5},{x:6.5,y:4.5},{x:6.5,y:3.5}]);
    assert.equal(motion.key,'a:0');
    assert.deepEqual(board.sample(motion,0),{x:5.5,y:6.5,lift:0,done:false});
    const halfStep=board.sample(motion,80);
    assert.ok(halfStep.x>5.5&&halfStep.x<6.5);
    assert.ok(halfStep.lift>0);
    assert.deepEqual(board.sample(motion,10000),{x:6.5,y:3.5,lift:0,done:true});
});

test('capture waits for the arriving token and then returns the captured piece to base', () => {
    assert.equal(typeof board.motions,'function');
    const players=[{id:'a',slot:0},{id:'b',slot:2}];
    const paths=board.motions({players,positions:[[4,-1,-1,-1],[31,-1,-1,-1]]},
        {players,positions:[[5,-1,-1,-1],[-1,-1,-1,-1]]});
    const captured=paths.find(p=>p.key==='b:0');
    assert.equal(captured.delay,160);
    assert.deepEqual(board.sample(captured,80),{...board.point(2,0,31),lift:0,done:false});
    assert.deepEqual(board.sample(captured,10000),{x:11,y:11,lift:0,done:true});
});

test('resume without changed positions does not replay movement', () => {
    assert.equal(typeof board.motions,'function');
    const game={players:[{id:'a',slot:0}],positions:[[4,-1,-1,-1]]};
    assert.deepEqual(board.motions(game,game),[]);
    assert.deepEqual(board.motions({players:[],positions:[]},game),[]);
});

test('entry and the home lane animate in order, including the exact home finish', () => {
    const players=[{id:'a',slot:0}];
    const [entry]=board.motions({players,positions:[[-1,-1,-1,-1]]},{players,positions:[[0,-1,-1,-1]]});
    assert.deepEqual(entry.points,[{x:2,y:2},{x:1.5,y:6.5}]);
    const [finish]=board.motions({players,positions:[[50,-1,-1,-1]]},{players,positions:[[56,-1,-1,-1]]});
    assert.deepEqual(finish.points.slice(0,6),[
        {x:.5,y:7.5},{x:1.5,y:7.5},{x:2.5,y:7.5},
        {x:3.5,y:7.5},{x:4.5,y:7.5},{x:5.5,y:7.5}
    ]);
    assert.equal(finish.points.length,7);
});

test('finished pieces stay inside their own colour triangle without overlapping other players', () => {
    const all=[];
    for(let slot=0;slot<4;slot++)for(let token=0;token<4;token++)all.push(board.point(slot,token,56));
    assert.equal(new Set(all.map(p=>`${p.x}:${p.y}`)).size,16);
    assert.ok(all.every(p=>p.x>6&&p.x<9&&p.y>6&&p.y<9));
});
