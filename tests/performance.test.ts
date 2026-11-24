import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBookmark,searchBookmarks,patchBookmarks} from '../src/domain.ts';
const make=(id:string,url:string,extra={})=>parseBookmark({id,url,title:id,addedAt:1,updatedAt:1,...extra});
test('search and batch updates on 10000 records',()=>{
 const list=Array.from({length:10000},(_,i)=>make('b'+i,'https://site'+i+'.example.com',{title:'Project '+i,tags:[i%2?'Design':'Code']}));
 const lib={schemaVersion:1 as const,bookmarks:list};const start=performance.now();
 assert.equal(searchBookmarks(list,'project code','relevance').length,5000);
 assert.equal(searchBookmarks(list,'site9999','relevance')[0].id,'b9999');
 const updated=patchBookmarks(lib,list.slice(0,5000).map(b=>b.id),{favorite:true});
 assert.equal(updated.bookmarks.filter(b=>b.favorite).length,5000);
 console.log('10000-record search and batch checks: '+Math.round(performance.now()-start)+' ms (runner-specific)');
});
