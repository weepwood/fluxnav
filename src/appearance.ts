export type HomeAppearance={homeLayout:'list'|'tiles';homeBackground:'plain'|'paper'|'dots'|'wash';homeDensity:'comfortable'|'compact';homeWidth:'standard'|'wide';homeTitle:string;homeSubtitle:string;homeShowSubtitle:boolean;homeShowDomains:boolean;homeShowPinned:boolean;homeAccent:'theme'|'sage'|'blue'|'violet'|'amber'};
export type Appearance=HomeAppearance&{siteIcons:boolean;density:'comfortable'|'compact';sidebarWidth:number;detailWidth:number;pageSize:40|80|120};
export const defaultHomeAppearance:HomeAppearance={homeLayout:'list',homeBackground:'plain',homeDensity:'comfortable',homeWidth:'standard',homeTitle:'FluxNav',homeSubtitle:'收藏灵感，整理资源，快速抵达。',homeShowSubtitle:true,homeShowDomains:true,homeShowPinned:true,homeAccent:'theme'};
export const defaultAppearance:Appearance={...defaultHomeAppearance,siteIcons:false,density:'comfortable',sidebarWidth:208,detailWidth:290,pageSize:80};
const width=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback;
const choose=<T extends string>(value:unknown,options:readonly T[],fallback:T):T=>typeof value==='string'&&options.includes(value as T)?value as T:fallback;
const clean=(value:unknown,max:number,fallback:string)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max)||fallback:fallback;
export function normalizeAppearance(raw:unknown):Appearance{
 const p=(raw&&typeof raw==='object'?raw:{}) as Partial<Appearance>;
 return {siteIcons:p.siteIcons===true,homeLayout:choose(p.homeLayout,['list','tiles'],'list'),density:choose(p.density,['comfortable','compact'],'comfortable'),sidebarWidth:width(p.sidebarWidth,160,320,208),detailWidth:width(p.detailWidth,240,400,290),pageSize:p.pageSize===40||p.pageSize===120?p.pageSize:80,
 homeBackground:choose(p.homeBackground,['plain','paper','dots','wash'],'plain'),homeDensity:choose(p.homeDensity,['comfortable','compact'],'comfortable'),homeWidth:choose(p.homeWidth,['standard','wide'],'standard'),homeTitle:clean(p.homeTitle,40,defaultHomeAppearance.homeTitle),homeSubtitle:clean(p.homeSubtitle,100,defaultHomeAppearance.homeSubtitle),homeShowSubtitle:p.homeShowSubtitle!==false,homeShowDomains:p.homeShowDomains!==false,homeShowPinned:p.homeShowPinned!==false,homeAccent:choose(p.homeAccent,['theme','sage','blue','violet','amber'],'theme')};
}
export function resetHomeAppearance(value:Appearance):Appearance{return {...value,...defaultHomeAppearance};}
