import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUrl,parseBookmark,parseLibrary,mergeLibraries,addUnique,emptyLibrary,searchBookmarks,exportHtml,patchBookmarks,appendTags,sameLibrary,duplicateGroups,mergeDuplicates,renameCollection,collectionTree,inCollection,renameCollectionTree,reorderBookmark,faviconUrl} from '../src/domain.ts';
const make = (id:string,url='https://example.com',extra={}) => parseBookmark({id,url,title:id,addedAt:1,updatedAt:1,...extra});
test('reject dangerous URL protocols and credentials',()=>{for(const u of ['javascript:alert(1)','data:text/html,x','https://user:pass@example.com','file:///tmp/a','   ']) assert.throws(()=>normalizeUrl(u)); assert.equal(normalizeUrl('example.com'),'https://example.com/');});
test('legacy import, invalid schema and ID validation',()=>{assert.equal(parseLibrary([make('a')]).schemaVersion,1);assert.throws(()=>parseLibrary({schemaVersion:2,bookmarks:[]}));assert.throws(()=>parseLibrary([make('a'),make('a')]));assert.throws(()=>parseLibrary([{url:'https://a.com',title:'a',tags:'bad'}]));});
test('merge preserves independent additions and tombstones',()=>{const a=parseLibrary([make('a'),make('b','https://b.com')]);const b=parseLibrary([make('a','https://example.com',{updatedAt:2,deleted:true}),make('c','https://c.com')]);const merged=mergeLibraries(a,b);assert.equal(merged.bookmarks.length,3);assert.equal(merged.bookmarks[0].deleted,true);assert.deepEqual(merged,mergeLibraries(b,a));});
test('import deduplicates canonical URLs and search handles multiple terms',()=>{const v=addUnique(emptyLibrary(),[make('a'),make('b','https://example.com/#a'),make('React','https://react.dev',{tags:['开发']})]);assert.equal(v.added,2);assert.equal(searchBookmarks(v.library.bookmarks,'react 开发','title').length,1);});
test('HTML export escapes markup and excludes deleted records',()=>{const a=make('a','https://a.com',{title:'<script>&"'});const b=make('b','https://b.com',{deleted:true});const html=exportHtml([a,b]);assert.ok(html.includes('&lt;script&gt;&amp;&quot;'));assert.ok(!html.includes('https://b.com'));});

test('relevance, typo tolerance and Unicode normalization',()=>{
 const list=[make('notes','https://a.com',{title:'Notes',notes:'React documentation'}),make('react','https://react.dev',{title:'React'}),make('cafe','https://cafe.test',{title:'Café ＵＩ'})];
 assert.equal(searchBookmarks(list,'react','relevance')[0].id,'react');
 assert.equal(searchBookmarks(list,'recat','relevance').length,0);
 assert.equal(searchBookmarks(list,'reac','relevance')[0].id,'react');
 assert.equal(searchBookmarks(list,'reat','relevance')[0].id,'react');
 assert.equal(searchBookmarks(list,'cafe ui','relevance')[0].id,'cafe');
});
test('batch updates preserve unselected record identity and unique tags',()=>{
 const lib=parseLibrary([make('a'),make('b','https://b.com')]);const updated=patchBookmarks(lib,['a'],{collection:'设计'},20);
 assert.equal(updated.bookmarks[0].collection,'设计');assert.equal(updated.bookmarks[0].updatedAt,20);assert.equal(updated.bookmarks[1],lib.bookmarks[1]);
 assert.deepEqual(appendTags(['a'],[' a ','b','']),['a','b']);assert.ok(sameLibrary(lib,parseLibrary(lib)));assert.ok(!sameLibrary(lib,updated));
});


test('duplicate merge keeps selected record, metadata and recoverable tombstones',()=>{
 const a=make('a','https://a.com/#intro',{title:'Keep',tags:['one'],visitCount:2,collection:'A'});
 const b=make('b','https://a.com/#guide',{title:'Other',tags:['two'],visitCount:3,notes:'note',collection:'B',favorite:true,archived:true});
 const c=make('c','https://c.com');
 const lib=parseLibrary([a,b,c]);assert.equal(duplicateGroups(lib.bookmarks).length,1);
 const result=mergeDuplicates(lib,'a',['b'],20);
 assert.equal(result.bookmarks[0].title,'Keep');assert.equal(result.bookmarks[0].url,a.url);assert.deepEqual(result.bookmarks[0].tags,['one','two']);assert.equal(result.bookmarks[0].visitCount,5);assert.equal(result.bookmarks[0].favorite,true);assert.ok(result.bookmarks[0].notes.includes('B'));assert.equal(result.bookmarks[1].deleted,true);assert.equal(result.bookmarks[2],lib.bookmarks[2]);
 assert.throws(()=>mergeDuplicates(lib,'a',['c'],20));assert.equal(duplicateGroups(result.bookmarks).length,0);
});
test('collection rename includes archived but preserves deleted records',()=>{
 const lib=parseLibrary([make('a','https://a.com',{collection:'Old'}),make('b','https://b.com',{collection:'Old',archived:true}),make('c','https://c.com',{collection:'Old',deleted:true})]);
 const next=renameCollection(lib,'Old','New',20);assert.deepEqual(next.bookmarks.map(x=>x.collection),['New','New','Old']);assert.throws(()=>renameCollection(lib,'Old','Old'));
});

test('nested collection paths, counts, subtree rename and HTML hierarchy',()=>{
 const lib=parseLibrary([make('a','https://a.com',{collection:'Design / Icons'}),make('b','https://b.com',{collection:'Design / Type'}),make('c','https://c.com',{collection:'Design / Icons',deleted:true}),make('d','https://d.com',{collection:'Design / Icons',archived:true})]);
 const tree=collectionTree(lib.bookmarks);assert.equal(tree[0].name,'Design');assert.equal(tree[0].count,3);assert.equal(tree[0].children[0].count,2);assert.ok(inCollection('Design / Icons','Design'));assert.ok(!inCollection('Designer','Design'));
 const next=renameCollectionTree(lib,'Design','Resources',10);assert.deepEqual(next.bookmarks.map(b=>b.collection),['Resources / Icons','Resources / Type','Design / Icons','Resources / Icons']);assert.throws(()=>renameCollectionTree(lib,'Design','Design / Child'));
 const html=exportHtml(lib.bookmarks);assert.ok(html.includes('<H3>Design</H3>'));assert.ok(html.includes('<H3>Icons</H3>'));assert.ok(!html.includes('<H3>Design / Icons</H3>'));
});
test('manual ordering persists through parsing and protects pinned groups',()=>{
 const lib=parseLibrary([make('a','https://a.com',{order:1024}),make('b','https://b.com',{order:2048}),make('c','https://c.com',{pinned:true}),make('d','https://d.com',{deleted:true})]);
 const next=reorderBookmark(lib,'b','a','before',20);assert.deepEqual(searchBookmarks(next.bookmarks.filter(b=>!b.deleted),'','manual').map(b=>b.id),['c','b','a']);assert.deepEqual(parseLibrary(next),next);assert.equal(next.bookmarks[3],lib.bookmarks[3]);assert.throws(()=>reorderBookmark(lib,'c','a','after'));assert.equal(reorderBookmark(lib,'a','b','before'),lib);
});

test('favicon URL exposes only HTTPS origin, never query or credentials',()=>{assert.equal(faviconUrl('https://example.com/private?q=secret#x'),'https://example.com/favicon.ico');assert.equal(faviconUrl('http://example.com'),null);assert.equal(faviconUrl('https://user:pass@example.com'),null);});
