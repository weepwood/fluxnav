import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current; if(d&&!d.open)d.showModal(); return()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={ref} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-inner"><header className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="关闭" onClick={onClose}>×</button></header>{children}</div></dialog>;
}
