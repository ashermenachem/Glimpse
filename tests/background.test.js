import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const script=await readFile(new URL('../extension/background.js',import.meta.url),'utf8');
function setup(){
 let listener,store={};
 const chrome={runtime:{id:'test',onMessage:{addListener(fn){listener=fn;}}},storage:{session:{async set(v){Object.assign(store,v);},async get(k){return {[k]:store[k]};},async remove(k){delete store[k];}}}};
 runInNewContext(script,{chrome,URL,Date,Number,String,Array});
 const sender={id:'test',tab:{id:1},url:'https://milkenschool.myschoolapp.com/app/student'};
 function send(message,from=sender){return new Promise(resolve=>{const ret=listener(message,from,resolve);if(ret!==true)resolve(undefined);});}
 return {send,store};
}
test('session cache survives navigation, isolates accounts and clears',async()=>{
 const {send}=setup();
 const courses=[{id:'123',name:'Biology',raw:'95%',term:'1st Semester'}];
 assert.equal((await send({type:'glimpse:save',owner:'A',courses})).ok,true);
 assert.equal((await send({type:'glimpse:load',owner:'A'})).courses[0].raw,'95%');
 assert.equal(await send({type:'glimpse:load',owner:'B'}),null);
 assert.equal(await send({type:'glimpse:load',owner:'A'},{id:'test',tab:{id:2},url:'https://example.com/'}),undefined);
 await send({type:'glimpse:clear'});assert.equal(await send({type:'glimpse:load',owner:'A'}),null);
});
test('expired and malformed cache data cannot be used',async()=>{
 const {send,store}=setup();
 assert.equal(await send({type:'glimpse:save',owner:'A',courses:[{id:'invalid',name:'Biology'}]}),undefined);
 store.glimpseLatestCourses={owner:'A',courses:[],savedAt:Date.now()-25*60*60*1000};
 assert.equal(await send({type:'glimpse:load',owner:'A'}),null);
});
