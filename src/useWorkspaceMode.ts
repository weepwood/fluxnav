import {useSyncExternalStore} from 'react';
import {media} from './responsive';
const subscribe=(notify:()=>void)=>{const queries=[media.phone,media.overlay,media.wide].map(q=>matchMedia(q));for(const q of queries)q.addEventListener('change',notify);return()=>{for(const q of queries)q.removeEventListener('change',notify);};};
export function useWorkspaceMode(){return useSyncExternalStore(subscribe,()=>matchMedia(media.phone).matches?'phone':matchMedia(media.overlay).matches?'tablet':matchMedia(media.wide).matches?'wide':'desktop',()=> 'desktop' as const);}
