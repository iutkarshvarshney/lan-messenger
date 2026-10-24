const test=require('node:test');
const assert=require('node:assert/strict');
process.env.DB_PATH=':memory:';
const db=require('../database');
db.initDatabase();
const a=db.createUser('inboxa','Alice','local-test-password','','a');
const b=db.createUser('inboxb','Bob','local-test-password','','b');
const outsider=db.createUser('inboxc','Carol','local-test-password','','c');
test('deleting from one inbox preserves membership, history and the other inbox',()=>{
 const id=db.getOrCreatePrivateConversation(a.id,b.id);
 db.addMessage(id,a.id,'private history');
 db.hideConversation(id,a.id);
 assert.equal(db.getConversationsForUser(a.id).some(c=>c.id===id),false);
 assert.equal(db.getConversationsForUser(b.id).some(c=>c.id===id),true);
 assert.equal(db.getConversationsForUser(a.id,true).some(c=>c.id===id),true);
 assert.equal(db.isUserInConversation(a.id,id),true);
 assert.equal(db.getMessages(id).length,1);
});
test('new messages restore hidden conversations',()=>{
 const id=db.getOrCreatePrivateConversation(a.id,b.id);
 db.hideConversation(id,a.id);
 db.addMessage(id,b.id,'new incoming');
 assert.equal(db.getConversationsForUser(a.id).some(c=>c.id===id),true);
});
test('opening an existing private conversation explicitly restores the inbox entry',()=>{
 const id=db.getOrCreatePrivateConversation(a.id,b.id);db.hideConversation(id,a.id);
 assert.equal(db.getOrCreatePrivateConversation(a.id,b.id),id);
 assert.equal(db.getConversationsForUser(a.id).some(c=>c.id===id),true);
});
test('a non-member cannot hide another conversation',()=>{
 const id=db.getOrCreatePrivateConversation(a.id,b.id);
 assert.throws(()=>db.hideConversation(id,outsider.id),/Access denied/);
});
test('inbox previews persist after reload and never present ciphertext as readable text',()=>{
 const id=db.getOrCreatePrivateConversation(a.id,b.id);
 db.addMessage(id,b.id,'last readable message');
 let conv=db.getConversationsForUser(a.id).find(c=>c.id===id);
 assert.equal(conv.last_message,'last readable message');
 db.addMessage(id,b.id,'secret-ciphertext','text',{}, {iv:'encrypted-iv',dhPub:'public-key'});
 conv=db.getConversationsForUser(a.id).find(c=>c.id===id);
 assert.equal(conv.last_message_encrypted,true);
 assert.equal(conv.last_message,'');
});
