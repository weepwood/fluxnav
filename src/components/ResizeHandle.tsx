import {useRef} from 'react';
export function ResizeHandle({label,value,min,max,onChange,reverse=false}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void;reverse?:boolean}){
 const drag=useRef<{x:number;width:number}|null>(null);
 const clamp=(n:number)=>Math.min(max,Math.max(min,Math.round(n)));
 return <div className="resize-handle" role="separator" tabIndex={0} aria-label={label} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
 onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,width:value};}}
 onPointerMove={e=>{if(drag.current)onChange(clamp(drag.current.width+(e.clientX-drag.current.x)*(reverse?-1:1)));}}
 onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
 onKeyDown={e=>{const delta=e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0;if(delta){e.preventDefault();onChange(clamp(value+delta*(reverse?-1:1)));}else if(e.key==='Home'||e.key==='End'){e.preventDefault();onChange(e.key==='Home'?min:max);}}}/>;
}
