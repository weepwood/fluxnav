import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeJson,previewImport,decodeImport,decodeAndAnalyze} from '../src/imports.ts';
import {parseBookmark,parseLibrary} from '../src/domain.ts';
const existing=parseLibrary([parseBookmark({id:'old',url:'https://old.example',title:'Old',addedAt:1,updatedAt:1})]);
test('mixed untrusted import isolates invalid rows, repairs title and tags, reports duplicates',()=>{
 const result=analyzeJson([{url:'https://good.example',tags:'a,b'},null,{url:'javascript:alert(1)',title:'bad'},{url:'https://user:pass@bad.example'},{url:'relative/path'},{url:'https://good.example/#x',title:'duplicate'},{url:'https://old.example',title:'old'},{url:'https://other.example',title:'Other',updatedAt:1e30}]);
 assert.equal(result.invalid,4);assert.equal(result.repaired,2);assert.equal(result.duplicateUrls,1);assert.equal(result.records[0].title,'good.example');assert.deepEqual(result.records[0].tags,['a','b']);assert.equal(result.restoreAllowed,false);
 const preview=previewImport(result,existing,'merge');assert.equal(preview.added,2);assert.equal(preview.skipped,2);
 assert.throws(()=>previewImport(result,existing,'restore'));
});
test('strict backup restore preserves tombstones but rejects malformed metadata and duplicate IDs',()=>{
 const backup=parseLibrary([{id:'old',url:'https://old.example',title:'Old',addedAt:1,updatedAt:2,deleted:true}]);
 const valid=analyzeJson(backup);assert.equal(valid.restoreAllowed,true);const plan=previewImport(valid,existing,'restore');assert.equal(plan.updated,1);assert.equal(plan.deletions,1);
 const dup=analyzeJson({schemaVersion:1,bookmarks:[...backup.bookmarks,...backup.bookmarks]});assert.equal(dup.duplicateIds,1);assert.equal(dup.restoreAllowed,false);
 assert.equal(analyzeJson({schemaVersion:1,bookmarks:[{...backup.bookmarks[0],updatedAt:1e30}]}).restoreAllowed,false);
 assert.throws(()=>analyzeJson({schemaVersion:99,bookmarks:[]}));
});
test('encoding detection and invalid byte rejection',()=>{const data=new Uint8Array([0xff,0xfe,0x5b,0,0x5d,0]);assert.equal(decodeImport(data.buffer),'[]');assert.throws(()=>decodeImport(new Uint8Array([0xff]).buffer));});

test('file detection, invalid schema and imported ID collision',()=>{const bytes=new TextEncoder().encode('[{"id":"old","url":"https://new.example","title":"New"}]');const payload=decodeAndAnalyze(bytes.buffer,'auto','export.html');assert.ok('report' in payload);if('report' in payload){const plan=previewImport(payload.report,existing,'merge');assert.equal(plan.idCollisions,1);assert.equal(plan.added,1);}});
