import {type Bookmark,type Library} from './domain.ts';
export type UndoRecord={before:Bookmark[];after:Map<string,number>};
/** New items are undone via tombstones, not physical deletion, preserving sync semantics. */
export function buildUndo(before:Library,after:Library):UndoRecord{
 const previous=new Map(before.bookmarks.map(b=>[b.id,b])),undo:UndoRecord={before:[],after:new Map()};
 for(const b of after.bookmarks){const old=previous.get(b.id);if(old===b||(!old&&b.deleted))continue;undo.before.push(old??{...b,deleted:true});undo.after.set(b.id,b.updatedAt);}
 return undo;
}
export function revertOperation(library:Library,undo:UndoRecord,now=Date.now()){
 const before=new Map(undo.before.map(b=>[b.id,b]));let restored=0;
 const bookmarks=library.bookmarks.map(b=>{const old=before.get(b.id);if(!old||undo.after.get(b.id)!==b.updatedAt)return b;restored++;return {...old,updatedAt:Math.max(now,b.updatedAt+1)};});
 return {library:restored?{...library,bookmarks}:library,restored,skipped:undo.before.length-restored};
}
