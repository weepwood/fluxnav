import {useSyncExternalStore} from 'react';
import {media,workspaceMode} from './responsive';
const subscribe=(notify:()=>void)=>{const queries=[media.phone,media.overlay,media.wide].map(q=>matchMedia(q));for(const q of queries)q.addEventListener('change',notify);return()=>{for(const q of queries)q.removeEventListener('change',notify);};};
export function useWorkspaceMode(){return useSyncExternalStore(subscribe,()=>workspaceMode(window.innerWidth),()=> 'desktop' as const);}
