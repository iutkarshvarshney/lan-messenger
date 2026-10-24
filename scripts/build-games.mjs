import {spawnSync}from'node:child_process';
import {fileURLToPath}from'node:url';
for(const game of['desk-racer','wizard-chess-3d','argon-tennis']){
 console.log('Building '+game);
 const run=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:fileURLToPath(new URL('../games-src/'+game+'/',import.meta.url)),stdio:'inherit'});
 if(run.status!==0)process.exit(run.status||1);
}
