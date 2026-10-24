const test=require('node:test'),assert=require('node:assert/strict'),Database=require('better-sqlite3');
for(const moduleName of ['table-service','scene-service','duel-service'])test(moduleName+' rejects malformed IDs before SQLite binding',()=>{
 const database=new Database(':memory:');const query=database.prepare('SELECT 1 AS found WHERE ? IS NOT NULL AND ? IS NOT NULL');const errors=[];
 const socket={user:{id:'player-a',username:'Player'},on(){},emit(name,data){errors.push({name,data});},to(){return{emit(){}};}};
 const io={to(){return{emit(){}};}};
 const db={isUserInConversation(userId,conversationId){return Boolean(query.get(userId,conversationId));}};
 const service=require('../'+moduleName).install(io,socket,db);
 for(const value of [{},[],5,true,null,'','a'.repeat(200)]){
  const previous=errors.length;
  assert.doesNotThrow(()=>service.invite({gameType:moduleName==='table-service'?'memorymatch':'wizardchess',conversationId:value}));
  assert.ok(errors.length>previous);
 }
 assert.doesNotThrow(()=>service.invite({gameType:'memorymatch',conversationId:'room',targetUserId:{}}));
 database.close();
});
