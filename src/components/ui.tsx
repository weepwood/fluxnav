import {useRef,type ComponentPropsWithRef,type ReactNode} from 'react';
import {Icon} from './Icon';
const cx=(...values:(string|undefined|false)[])=>values.filter(Boolean).join(' ');
export type ButtonProps=ComponentPropsWithRef<'button'>&{variant?:'default'|'primary'|'quiet'|'danger';size?:'sm'|'md'|'lg';loading?:boolean;icon?:string};
export function Button({variant='default',size='md',loading=false,icon,className,disabled,type='button',children,...props}:ButtonProps){
 return <button {...props} type={type} className={cx('ui-button',variant!=='default'&&variant,className)} data-size={size} disabled={disabled||loading} aria-busy={loading||undefined}>{loading?<span className="ui-spinner" aria-hidden="true"/>:icon?<Icon name={icon}/>:null}{children}</button>;
}
export function IconButton({icon,label,className,...props}:Omit<ButtonProps,'icon'|'children'>&{icon:string;label:string}){
 return <Button {...props} icon={icon} aria-label={label} title={props.title??label} className={cx('icon-button',className)} data-icon-only="true"/>;
}
export function Input({className,...props}:ComponentPropsWithRef<'input'>){return <input {...props} className={cx('ui-input',className)}/>;}
export function Select({className,...props}:ComponentPropsWithRef<'select'>){return <select {...props} className={cx('ui-select',className)}/>;}
export function Textarea({className,...props}:ComponentPropsWithRef<'textarea'>){return <textarea {...props} className={cx('ui-textarea',className)}/>;}
export function Checkbox({className,...props}:Omit<ComponentPropsWithRef<'input'>,'type'>){return <input {...props} type="checkbox" className={cx('ui-checkbox',className)}/>;}
export function SearchField({className,value,onValueChange,onClear,clearLabel='清除搜索',shortcut,iconSize=16,inputProps}:{className?:string;value:string;onValueChange:(value:string)=>void;onClear?:()=>void;clearLabel?:string;shortcut?:ReactNode;iconSize?:number;inputProps:Omit<ComponentPropsWithRef<'input'>,'value'|'onChange'|'ref'>}){
 const ref=useRef<HTMLInputElement>(null);
 return <div className={cx('ui-search',className)}><Icon name="search" size={iconSize}/><Input {...inputProps} ref={ref} value={value} onChange={e=>onValueChange(e.target.value)}/>{value&&onClear&&<IconButton size="sm" icon="close" label={clearLabel} onClick={()=>{onClear();ref.current?.focus({preventScroll:true});}}/>}{shortcut&&<kbd>{shortcut}</kbd>}</div>;
}
export type SegmentOption<T extends string>={value:T;label:string;icon?:string;text?:string};
export function Segmented<T extends string>({label,value,options,onChange,className}:{label:string;value:T;options:readonly SegmentOption<T>[];onChange:(value:T)=>void;className?:string}){
 return <div className={cx('ui-segmented',className)} role="group" aria-label={label}>{options.map(o=><button key={o.value} type="button" aria-label={o.label} title={o.label} aria-pressed={value===o.value} onClick={()=>onChange(o.value)}>{o.icon&&<Icon name={o.icon}/>} {o.text}</button>)}</div>;
}
export function Tag({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'selected'|'danger'}){return <span className="ui-tag" data-tone={tone}>{children}</span>;}
