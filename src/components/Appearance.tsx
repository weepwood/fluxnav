export type Appearance={homeLayout:'list'|'tiles';density:'comfortable'|'compact';sidebarWidth:number;detailWidth:number;pageSize:40|80|120};
export const defaultAppearance:Appearance={homeLayout:'list',density:'comfortable',sidebarWidth:208,detailWidth:290,pageSize:80};
const width=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback;
export function normalizeAppearance(raw:unknown):Appearance{
 const p=(raw&&typeof raw==='object'?raw:{}) as Partial<Appearance>;
 return {homeLayout:p.homeLayout==='tiles'?'tiles':'list',density:p.density==='compact'?'compact':'comfortable',sidebarWidth:width(p.sidebarWidth,160,320,208),detailWidth:width(p.detailWidth,240,400,290),pageSize:p.pageSize===40||p.pageSize===120?p.pageSize:80};
}
export function AppearanceSettings({value,onChange}:{value:Appearance;onChange:(v:Appearance)=>void}){
 return <div className="appearance-options"><label>首页布局<select value={value.homeLayout} onChange={e=>onChange({...value,homeLayout:e.target.value as Appearance['homeLayout']})}><option value="list">编辑式列表</option><option value="tiles">磁贴网格</option></select></label><label>资源列表密度<select value={value.density} onChange={e=>onChange({...value,density:e.target.value as Appearance['density']})}><option value="comfortable">舒适</option><option value="compact">紧凑</option></select></label><label>每页资源数量<select value={value.pageSize} onChange={e=>onChange({...value,pageSize:Number(e.target.value) as Appearance['pageSize']})}>{[40,80,120].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button onClick={()=>onChange({...value,sidebarWidth:208,detailWidth:290})}>恢复默认栏宽</button></div>;
}
