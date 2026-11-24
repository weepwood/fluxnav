import {useRef} from 'react';
export function ResizeHandle({label,value,min,max,onChange,reverse=false}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void;reverse?:boolean}){
 const drag=useRef<{x:number;width:number;next:number;root:HTMLElement|null}|null>(null);
 const clamp=(n:number)=>Math.min(max,Math.max(min,Math.round(n)));
 const property=reverse?'--detail-width':'--sidebar-width';
 const finish=(commit:boolean)=>{const current=drag.current;if(!current)return;drag.current=null;current.root?.style.setProperty(property,(commit?current.next:current.width)+'px');current.root?.removeAttribute('data-resizing');if(commit&&current.next!==current.width)onChange(current.next);};
 return <div className="resize-handle" role="separator" tabIndex={0} aria-label={label} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const root=e.currentTarget.closest<HTMLElement>('.workspace');drag.current={x:e.clientX,width:value,next:value,root};root?.setAttribute('data-resizing','true');}}
 onPointerMove={e=>{const current=drag.current;if(current){current.next=clamp(current.width+(e.clientX-current.x)*(reverse?-1:1));current.root?.style.setProperty(property,current.next+'px');}}}
 onPointerUp={()=>finish(true)} onPointerCancel={()=>finish(false)} onLostPointerCapture={()=>finish(false)}
 onKeyDown={e=>{const delta=e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0;if(delta){e.preventDefault();onChange(clamp(value+delta*(reverse?-1:1)));}else if(e.key==='Home'||e.key==='End'){e.preventDefault();onChange(e.key==='Home'?min:max);}}}/>;
}
