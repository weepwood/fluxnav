import {Icon} from './Icon';
import {useEffect,useRef,useState,type ReactNode} from 'react';
export function Dialog({title,onClose,children,variant='default',canClose=true,animateClose=true}:{title:string;onClose:()=>void;children:ReactNode;variant?:'default'|'settings'|'command';canClose?:boolean;animateClose?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose),allowed=useRef(canClose),timer=useRef<ReturnType<typeof setTimeout>|null>(null),closingRef=useRef(false),backdropDown=useRef(false);
 const [closing,setClosing]=useState(false);closeRef.current=onClose;allowed.current=canClose;
 useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();return()=>{if(timer.current!==null)clearTimeout(timer.current);closingRef.current=false;if(d?.open)d.close();};},[]);
 const finish=()=>{if(!closingRef.current)return;closingRef.current=false;if(timer.current!==null)clearTimeout(timer.current);timer.current=null;if(allowed.current)closeRef.current();else setClosing(false);};
 const requestClose=()=>{if(!canClose||closingRef.current)return;if(!animateClose||matchMedia('(prefers-reduced-motion: reduce)').matches){onClose();return;}closingRef.current=true;setClosing(true);timer.current=setTimeout(finish,160);};
 return <dialog ref={ref} data-variant={variant} data-closing={closing} aria-label={title} onCancel={e=>{e.preventDefault();requestClose();}} onPointerDown={e=>{backdropDown.current=e.target===ref.current;}} onClick={e=>{if(backdropDown.current&&e.target===ref.current)requestClose();backdropDown.current=false;}} onAnimationEnd={e=>{if(e.target===ref.current&&e.animationName==='flux-dialog-out')finish();}}>
 <div className="dialog-inner" inert={closing}><header className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="关闭" disabled={!canClose||closing} onClick={requestClose}><Icon name="close"/></button></header>{children}</div></dialog>;
}
