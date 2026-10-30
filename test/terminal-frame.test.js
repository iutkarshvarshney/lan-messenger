const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {Terminal}=require('@xterm/xterm');
function fixture(){
 const instances=[],sent=[],handlers={},parent={postMessage:data=>sent.push(data)};
 class TestTerminal extends Terminal{constructor(options){super(options);instances.push(this);}open(){}focus(){}loadAddon(){}}
 const screen={replaceChildren(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/terminal-frame.js'),'utf8'),{
  Terminal:TestTerminal,FitAddon:{FitAddon:class{proposeDimensions(){return {cols:80,rows:24};}dispose(){}}},ResizeObserver:class{observe(){}},
  innerWidth:800,innerHeight:600,document:{referrer:'https://messenger.local/',getElementById:()=>screen},parent,URL,
  addEventListener:(name,callback)=>handlers[name]=callback
 });
 const send=(type,extra={})=>handlers.message({source:parent,origin:'https://messenger.local',data:{type,nonce:'frame-nonce',...extra}});
 send('terminal:init');return {instances,sent,send};
}
test('deferred output and terminal query replies cannot cross SSH connections',async()=>{
 const f=fixture();try{
  f.send('terminal:session',{sessionId:'old'});const previous=f.instances.at(-1);
  f.send('terminal:output',{sessionId:'old',sequence:1,data:'OLD SESSION SECRET\r\n\x1b[6n'});
  f.send('terminal:ended');f.send('terminal:session',{sessionId:'new'});const current=f.instances.at(-1);
  f.send('terminal:output',{sessionId:'new',sequence:1,data:'NEW SESSION\r\n'});
  await new Promise(resolve=>setTimeout(resolve,40));
  assert.notEqual(previous,current,'each SSH connection needs a fresh renderer');
  const text=Array.from({length:current.buffer.active.length},(_,i)=>current.buffer.active.getLine(i).translateToString()).join('\n');
  assert.ok(text.includes('NEW SESSION'));assert.ok(!text.includes('OLD SESSION SECRET'));
  assert.equal(f.sent.filter(e=>e.type==='terminal:input'&&e.sessionId==='new').length,0,'old cursor queries must not send input to the new host');
  assert.ok(!f.sent.some(e=>e.type==='terminal:rendered'&&e.sessionId==='old'),'disposed renderer callbacks must be ignored');
 }finally{for(const instance of f.instances)instance.dispose();}
});
