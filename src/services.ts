import { parseLibrary, parseBookmark, type Library } from './domain';
export type AIProfile = {name: string; baseUrl: string; model: string};
export const defaultAI: AIProfile = {name:'OpenAI',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini'};
function endpoint(raw: string) {
  const u = new URL(raw);
  if ((u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) || u.username || u.password || u.search || u.hash) throw Error('API 地址须为 HTTPS 或本机 HTTP，且不包含凭据、查询参数或片段');
  return u.href.replace(/\/$/,'');
}
export async function request(url: string, init: RequestInit = {}, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(30000);
  const response = await fetch(url,{...init,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:signal ? AbortSignal.any([signal,timeout]) : timeout});
  if (!response.ok) throw Error('请求失败 HTTP '+response.status);
  return response;
}
export async function askAI(profile: AIProfile, key: string, system: string, prompt: string, signal?: AbortSignal) {
  if (!key.trim() || !profile.model.trim()) throw Error('请填写本次会话的 API Key 和模型');
  const response = await request(endpoint(profile.baseUrl)+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key.trim()},body:JSON.stringify({model:profile.model,messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.2})},signal);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw Error('AI 返回空内容');
  return content.trim();
}
export function parseAIItems(content: string) {
  const clean = content.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const raw = JSON.parse(clean);
  if (!Array.isArray(raw) || raw.length > 100) throw Error('AI 必须返回不超过 100 项的 JSON 数组');
  return raw.map(parseBookmark);
}
export type SyncConfig = {provider:'gist'|'webdav'; gistId:string; url:string};
export const defaultSync: SyncConfig = {provider:'gist',gistId:'',url:''};
const gistFile = 'fluxnav-bookmarks.json';
export async function pullRemote(config: SyncConfig, token: string) {
  if (!token.trim()) throw Error('请输入本次会话的同步凭据');
  const headers = {Authorization:'Bearer '+token.trim()};
  if (config.provider === 'webdav') {
    const response = await request(endpoint(config.url),{headers});
    return {library:parseLibrary(await response.json()),revision:response.headers.get('ETag') || ''};
  }
  if (!/^[a-f\d]+$/i.test(config.gistId)) throw Error('请输入有效的 Gist ID');
  const response = await request('https://api.github.com/gists/'+config.gistId,{headers});
  const data = await response.json();
  const file = data.files?.[gistFile];
  if (!file || file.truncated || typeof file.content !== 'string') throw Error('远端文件不存在或过大，请手动导出恢复');
  return {library:parseLibrary(JSON.parse(file.content)),revision:String(data.history?.[0]?.version || '')};
}
export async function pushRemote(config: SyncConfig, token: string, library: Library, revision: string) {
  if (!token.trim()) throw Error('请输入本次会话的同步凭据');
  const headers = {Authorization:'Bearer '+token.trim(),'Content-Type':'application/json'};
  if (config.provider === 'webdav') {
    if (!revision) throw Error('服务端必须提供 ETag，避免无条件覆盖；请先读取远端');
    await request(endpoint(config.url),{method:'PUT',headers:{...headers,'If-Match':revision},body:JSON.stringify(library)});
    return config.gistId;
  }
  if (config.gistId) {
    const current = await pullRemote(config,token);
    if (!revision || current.revision !== revision) throw Error('远端已发生变化，请重新拉取合并');
  }
  const response = await request('https://api.github.com/gists'+(config.gistId?'/'+config.gistId:''),{method:config.gistId?'PATCH':'POST',headers,body:JSON.stringify({...(config.gistId?{}:{public:false,description:'FluxNav library'}),files:{[gistFile]:{content:JSON.stringify(library)}}})});
  const data = await response.json();
  return String(data.id);
}
