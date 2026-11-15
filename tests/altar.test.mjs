import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync(new URL('../src/features/altar/catalog.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {ALTAR_ITEMS,ALTAR_SHELVES,getItemProgress}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const item=id=>ALTAR_ITEMS.find(i=>i.id===id);
const snapshot=(metrics={},achievements=[])=>({metrics,achievements});
test('all sixteen items have unique identifiers and occupy a shelf once',()=>{
  assert.equal(ALTAR_ITEMS.length,16);
  assert.equal(new Set(ALTAR_SHELVES.flat().map(i=>i.id)).size,16);
});
test('a new account has no unlocked collectibles even if a display metric reaches a threshold',()=>{
  for (const i of ALTAR_ITEMS) assert.equal(getItemProgress(i,snapshot({[i.metric]:999})).level,0);
});
test('persisted awards survive a lower current metric and choose the correct next material',()=>{
  const p=getItemProgress(item('candle'),snapshot({login:42},[{itemId:'candle',level:1,unlockedAt:'2026-11-08T00:00:00Z'}]));
  assert.equal(p.level,1);assert.equal(p.next.target,60);assert.equal(p.percent,70);assert.equal(p.art,6);
});
test('fraternity gold requires both number of requests and feedback ratio',()=>{
  const awards=[{itemId:'fraternity',level:2}];
  assert.equal(getItemProgress(item('fraternity'),snapshot({request:90,feedback_percent:50},awards)).percent,50/75*100);
  assert.equal(getItemProgress(item('fraternity'),snapshot({request:45,feedback_percent:100},awards)).percent,50);
});
test('maximum level keeps the gold asset and never selects an out-of-bounds tier',()=>{
  const p=getItemProgress(item('candle'),snapshot({login:200},[{itemId:'candle',level:3}]));
  assert.equal(p.max,true);assert.equal(p.percent,100);assert.equal(p.art,8);
});
test('novena, rosary and friendship thresholds match the approved specification',()=>{
  assert.deepEqual(item('shield').levels.map(l=>l.target),[5,10,15]);
  assert.deepEqual(item('gospel').levels.map(l=>l.target),[15,30,45]);
  assert.deepEqual(item('cross').levels.map(l=>l.target),[30,60,120]);
  for(const i of ALTAR_ITEMS.slice(0,6)) assert.equal(i.levels[0].target,9);
  for(const id of ['rosary-wood','rosary-pearl','rosary-gold']) assert.equal(item(id).levels[0].target,10);
});
