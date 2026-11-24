// Canonical workspace thresholds. CSS mirrors these values in styles/responsive.css.
export const BREAKPOINTS={phone:650,overlay:1000,resizable:1200,wide:1600} as const;
export const media={phone:'(max-width: 650px)',overlay:'(max-width: 1000px)',resizable:'(min-width: 1200px)',wide:'(min-width: 1600px)'} as const;
export type WorkspaceMode='phone'|'tablet'|'desktop'|'wide';
export function workspaceMode(width:number):WorkspaceMode{return width<=BREAKPOINTS.phone?'phone':width<=BREAKPOINTS.overlay?'tablet':width<BREAKPOINTS.wide?'desktop':'wide';}
