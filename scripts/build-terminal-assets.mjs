import {mkdir,copyFile} from 'node:fs/promises';
const destination=new URL('../public/vendor/xterm/',import.meta.url);
await mkdir(destination,{recursive:true});
for(const [source,name]of [['@xterm/xterm/lib/xterm.js','xterm.js'],['@xterm/xterm/css/xterm.css','xterm.css'],['@xterm/xterm/LICENSE','LICENSE-xterm'],['@xterm/addon-fit/lib/addon-fit.js','addon-fit.js'],['@xterm/addon-fit/LICENSE','LICENSE-fit']])await copyFile(new URL('../node_modules/'+source,import.meta.url),new URL(name,destination));
console.log('Vendored xterm.js, fit addon and licenses');
