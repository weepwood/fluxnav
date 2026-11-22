import { useState, useEffect, useMemo, useRef } from 'react';

// --- Types ---
type Bookmark = {
  id: string;
  url: string;
  title: string;
  domain: string;
  description: string;
  notes: string;
  tags: string[];
  favicon: string;
  color: string;
  addedAt: number;
  lastVisited?: number;
  visitCount: number;
};

type AIConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type GithubConfig = {
  token: string;
  gistId: string;
  lastSync?: number;
};

type SortBy = 'recent' | 'added' | 'mostVisited' | 'alpha';
type ViewMode = 'grid' | 'list';

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2, 9);
const getDomain = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};
const getFavicon = (url: string) => {
  const d = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
};
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
const relTime = (ts?: number) => {
  if (!ts) return '从未访问';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return fmtDate(ts);
};

const COLORS = [
  { bg: 'bg-[#FFDDE1]', dot: 'bg-[#FF6B7A]' },
  { bg: 'bg-[#DDF5FF]', dot: 'bg-[#3FA9FF]' },
  { bg: 'bg-[#E2FFCC]', dot: 'bg-[#6BCF2F]' },
  { bg: 'bg-[#FFF2C2]', dot: 'bg-[#FFB400]' },
  { bg: 'bg-[#E8DDFF]', dot: 'bg-[#8B5CF6]' },
  { bg: 'bg-[#FFE7CC]', dot: 'bg-[#FF8C42]' },
];

// Sandboxed embeds have an opaque origin and cannot access localStorage.
// Keep the app usable for the lifetime of the page with an in-memory fallback,
// while preserving localStorage persistence when opened as a normal site.
const embedStorage = new Map<string, string>();
const readStoredValue = (key: string) => {
  try { return window.localStorage.getItem(key) ?? embedStorage.get(key) ?? null; }
  catch { return embedStorage.get(key) ?? null; }
};
const writeStoredValue = (key: string, value: string) => {
  embedStorage.set(key, value);
  try { window.localStorage.setItem(key, value); } catch {}
};

const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: '1', url: 'https://github.com', title: 'GitHub', domain: 'github.com',
    description: '全球最大的代码托管与开源协作平台', notes: '日常看源码和提 PR 的主阵地，记得开 Copilot',
    tags: ['开发', '工具'], favicon: getFavicon('https://github.com'),
    color: COLORS[1].bg, addedAt: Date.now() - 86400000 * 3, lastVisited: Date.now() - 3600000 * 2, visitCount: 42
  },
  {
    id: '2', url: 'https://linear.app', title: 'Linear', domain: 'linear.app',
    description: '极简、高效的项目与任务管理工具', notes: '团队迭代必用，界面比 Jira 优雅 10 倍',
    tags: ['产品', '工具'], favicon: getFavicon('https://linear.app'),
    color: COLORS[0].bg, addedAt: Date.now() - 86400000 * 7, lastVisited: Date.now() - 86400000, visitCount: 18
  },
  {
    id: '3', url: 'https://readwise.io', title: 'Readwise', domain: 'readwise.io',
    description: '高亮与知识复利工具，聚合所有读书笔记', notes: '配合 Obsidian 使用，每天回顾 5 条',
    tags: ['阅读', '知识管理'], favicon: getFavicon('https://readwise.io'),
    color: COLORS[2].bg, addedAt: Date.now() - 86400000 * 12, lastVisited: Date.now() - 86400000 * 2, visitCount: 31
  },
  {
    id: '4', url: 'https://www.figma.com', title: 'Figma', domain: 'figma.com',
    description: '协同式界面设计与原型工具', notes: '设计系统在 Team Library / Dasar 2024',
    tags: ['设计', '工具'], favicon: getFavicon('https://figma.com'),
    color: COLORS[4].bg, addedAt: Date.now() - 86400000 * 1, lastVisited: Date.now() - 1800000, visitCount: 56
  },
];

export default function App() {
  const [route, setRoute] = useState<'display' | 'manage'>(() => window.location.hash === '#/manage' ? 'manage' : 'display');
  // Data state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = readStoredValue('fluxnav-bookmarks');
    if (saved) try { return JSON.parse(saved); } catch {}
    return DEFAULT_BOOKMARKS;
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const s = readStoredValue('fluxnav-ai');
    return s ? JSON.parse(s) : { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' };
  });
  const [githubConfig, setGithubConfig] = useState<GithubConfig>(() => {
    const s = readStoredValue('fluxnav-gh');
    return s ? JSON.parse(s) : { token: '', gistId: '' };
  });

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showGH, setShowGH] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [ghStatus, setGhStatus] = useState<string>('');
  const [form, setForm] = useState<Partial<Bookmark>>({ title: '', url: '', description: '', notes: '', tags: [], color: COLORS[0].bg });
  const [isAiFilling, setIsAiFilling] = useState(false);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Persist
  useEffect(() => { writeStoredValue('fluxnav-bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { writeStoredValue('fluxnav-ai', JSON.stringify(aiConfig)); }, [aiConfig]);
  useEffect(() => { writeStoredValue('fluxnav-gh', JSON.stringify(githubConfig)); }, [githubConfig]);

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash === '#/manage' ? 'manage' : 'display');
    window.addEventListener('hashchange', syncRoute);
    document.title = route === 'manage' ? '管理书签 · FluxNav' : 'FluxNav · 智能起始页';
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [route]);

  // Keyboard /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (route === 'manage' && e.key === 'n' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowAddModal(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [route]);

  // Derived
  const allTags = useMemo(() => {
    const map = new Map<string, { count: number, desc?: string }>();
    bookmarks.forEach(b => b.tags.forEach(t => map.set(t, { count: (map.get(t)?.count || 0) + 1 })));
    return Array.from(map.entries()).map(([name, { count }]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  const filtered = useMemo(() => {
    let list = bookmarks.filter(b => {
      const matchSearch = !search || [b.title, b.domain, b.description, b.notes, ...b.tags].join(' ').toLowerCase().includes(search.toLowerCase());
      const matchTag = selectedTags.length === 0 || selectedTags.every(t => b.tags.includes(t));
      return matchSearch && matchTag;
    });
    switch (sortBy) {
      case 'recent': list = list.sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0)); break;
      case 'added': list = list.sort((a, b) => b.addedAt - a.addedAt); break;
      case 'mostVisited': list = list.sort((a, b) => b.visitCount - a.visitCount); break;
      case 'alpha': list = list.sort((a, b) => a.title.localeCompare(b.title)); break;
    }
    return list;
  }, [bookmarks, search, selectedTags, sortBy]);

  // Actions
  const handleOpen = (b: Bookmark) => {
    const updated = bookmarks.map(x => x.id === b.id ? { ...x, lastVisited: Date.now(), visitCount: x.visitCount + 1 } : x);
    setBookmarks(updated);
    window.open(b.url, '_blank');
  };

  const handleSave = () => {
    if (!form.url || !form.title) return alert('链接和标题必填');
    let url = form.url!.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    if (editing) {
      setBookmarks(prev => prev.map(p => p.id === editing.id ? {
        ...p, ...form, url, domain: getDomain(url), favicon: getFavicon(url), tags: form.tags || []
      } as Bookmark : p));
    } else {
      const newBm: Bookmark = {
        id: uid(),
        url,
        title: form.title!.trim(),
        domain: getDomain(url),
        description: (form.description || '').trim(),
        notes: (form.notes || '').trim(),
        tags: (form.tags as string[]) || [],
        favicon: getFavicon(url),
        color: form.color || COLORS[Math.floor(Math.random() * COLORS.length)].bg,
        addedAt: Date.now(),
        visitCount: 0,
      };
      setBookmarks(prev => [newBm, ...prev]);
    }
    setShowAddModal(false);
    setEditing(null);
    setForm({ title: '', url: '', description: '', notes: '', tags: [], color: COLORS[0].bg });
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这个书签？')) return;
    setBookmarks(p => p.filter(b => b.id !== id));
  };

  const callLLM = async (userPrompt: string, systemPrompt: string) => {
    if (!aiConfig.apiKey) throw new Error('请先在设置中配置 AI API Key');
    const res = await fetch(`${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`AI 调用失败: ${res.status} ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  const handleAiFill = async () => {
    if (!form.url) return alert('请先输入网址');
    setIsAiFilling(true);
    try {
      const sys = `你是一个书签助手。用户给你一个网址，你要返回JSON，包含：title(网页标题，中文推断), description(20-40字中文描述), tags(最多3个标签，中文), notes(一句备注建议)。必须只返回JSON对象，不要解释。示例：{"title":"xxx","description":"...","tags":["开发","工具"],"notes":"..."}`;
      const txt = await callLLM(form.url, sys);
      const jsonStr = txt.match(/\{[\s\S]*\}/)?.[0] || txt;
      const parsed = JSON.parse(jsonStr);
      setForm(f => ({ ...f, title: f.title || parsed.title, description: parsed.description, notes: parsed.notes, tags: parsed.tags }));
    } catch (e: any) { alert(e.message); }
    setIsAiFilling(false);
  };

  const handleAiOrganize = async () => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const sys = `你是专业的书签整理师。分析用户的书签列表，给出标签分组优化建议和每个分组的一句话说明。返回JSON格式：{"groups":[{"tag":"标签名","description":"分组说明","count":数量}], "suggestions":"总体优化建议"}`;
      const user = `书签列表：\n${bookmarks.map(b => `- ${b.title} (${b.domain}) 标签: ${b.tags.join(',')} 描述: ${b.description}`).join('\n')}\n请分析并分组。`;
      const resp = await callLLM(user, sys);
      setAiResponse(resp);
    } catch (e: any) { setAiResponse('错误: ' + e.message); }
    setAiLoading(false);
  };

  const handleAiBatchAdd = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const sys = `你是一个书签添加助手。用户用自然语言描述想添加的网址，你要尽可能识别出网址或推断官方网址，并返回JSON数组，每个元素包含：url, title, description, tags(数组), notes。所有内容用中文。如果无法推断准确URL，给出最可能的官网。只返回JSON数组。`;
      const txt = await callLLM(aiPrompt, sys);
      const arrMatch = txt.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error('AI返回格式错误');
      const arr = JSON.parse(arrMatch[0]);
      const newBms: Bookmark[] = arr.map((item: any) => ({
        id: uid(),
        url: item.url.startsWith('http') ? item.url : 'https://' + item.url,
        title: item.title,
        domain: getDomain(item.url),
        description: item.description || '',
        notes: item.notes || '',
        tags: item.tags || [],
        favicon: getFavicon(item.url),
        color: COLORS[Math.floor(Math.random() * COLORS.length)].bg,
        addedAt: Date.now(),
        visitCount: 0,
      }));
      setBookmarks(p => [...newBms, ...p]);
      setAiPrompt('');
      setAiResponse(`✅ 已添加 ${newBms.length} 个书签：${newBms.map(b => b.title).join('、')}`);
    } catch (e: any) { setAiResponse('添加失败: ' + e.message); }
    setAiLoading(false);
  };

  // GitHub Gist sync
  const handleGistPush = async () => {
    if (!githubConfig.token) return setGhStatus('请先填写 GitHub Token');
    setGhStatus('正在同步到 Gist...');
    try {
      const content = JSON.stringify({ bookmarks, exportedAt: Date.now() }, null, 2);
      let gistId = githubConfig.gistId;
      if (!gistId) {
        const res = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: { Authorization: `Bearer ${githubConfig.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public: false,
            description: 'FluxNav bookmarks sync',
            files: { 'fluxnav-bookmarks.json': { content } }
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        gistId = data.id;
        setGithubConfig(c => ({ ...c, gistId, lastSync: Date.now() }));
        setGhStatus(`✅ 已创建新 Gist: ${gistId}`);
      } else {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${githubConfig.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: { 'fluxnav-bookmarks.json': { content } } })
        });
        if (!res.ok) throw new Error(await res.text());
        setGithubConfig(c => ({ ...c, lastSync: Date.now() }));
        setGhStatus('✅ 推送成功');
      }
    } catch (e: any) { setGhStatus('❌ 推送失败: ' + e.message.slice(0, 200)); }
  };

  const handleGistPull = async () => {
    if (!githubConfig.token || !githubConfig.gistId) return setGhStatus('请填写 Token 和 Gist ID');
    setGhStatus('正在拉取...');
    try {
      const res = await fetch(`https://api.github.com/gists/${githubConfig.gistId}`, {
        headers: { Authorization: `Bearer ${githubConfig.token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const file = data.files['fluxnav-bookmarks.json'];
      if (!file) throw new Error('Gist 中未找到 fluxnav-bookmarks.json');
      const parsed = JSON.parse(file.content);
      if (parsed.bookmarks) {
        setBookmarks(parsed.bookmarks);
        setGithubConfig(c => ({ ...c, lastSync: Date.now() }));
        setGhStatus(`✅ 已拉取 ${parsed.bookmarks.length} 条书签`);
      } else throw new Error('格式错误');
    } catch (e: any) { setGhStatus('❌ 拉取失败: ' + e.message.slice(0, 200)); }
  };

  const navigate = (next: 'display' | 'manage') => {
    setShowAI(false);
    setShowGH(false);
    setShowAiConfig(false);
    window.location.hash = next === 'manage' ? '/manage' : '/';
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route === 'display') {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#F6F5F1] text-zinc-950 selection:bg-zinc-950 selection:text-white">
        <style>{`
          *{font-family:"Geist",system-ui,-apple-system,sans-serif}
          .serif{font-family:"Instrument Serif",serif}
          @keyframes homeEnter{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
          @keyframes linkEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes drift{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-28px,20px,0)}}
          .home-enter{animation:homeEnter .65s cubic-bezier(.2,.8,.2,1) both}
          .link-enter{animation:linkEnter .45s cubic-bezier(.2,.8,.2,1) both}
        `}</style>

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -right-36 -top-48 h-[560px] w-[560px] rounded-full bg-[#FFE0E4] opacity-70 blur-[120px] motion-safe:animate-[drift_12s_ease-in-out_infinite]" />
          <div className="absolute -bottom-48 -left-40 h-[520px] w-[520px] rounded-full bg-[#DFD5FF] opacity-55 blur-[130px] motion-safe:animate-[drift_15s_ease-in-out_infinite_reverse]" />
        </div>

        <header className="relative z-10 mx-auto flex h-20 max-w-[1180px] items-center justify-between px-6 md:px-10">
          <button onClick={() => { setSearch(''); setSelectedTags([]); }} className="flex items-center gap-3" aria-label="返回全部书签">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-zinc-950 text-[13px] font-semibold text-white">F</span>
            <span className="serif text-[22px] tracking-tight">FluxNav</span>
          </button>
          <button onClick={() => navigate('manage')} className="group flex h-9 items-center gap-2 border-b border-zinc-400 text-[13px] font-medium transition hover:border-zinc-950" aria-label="进入书签管理页">
            管理书签
            <svg className="transition-transform group-hover:translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </header>

        <main className="relative z-10 mx-auto max-w-[1180px] px-6 pb-16 pt-[8vh] md:px-10 md:pt-[12vh]">
          <section className="home-enter max-w-[820px]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Personal start page</p>
            <h1 className="serif text-[clamp(56px,9vw,108px)] leading-[0.88] tracking-[-0.045em]">FluxNav</h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-zinc-600">搜索，然后出发。你的常用网站都在这里。</p>

            <label className="mt-9 flex max-w-[720px] items-center gap-3 border-b border-zinc-950 pb-3" aria-label="搜索书签">
              <svg className="shrink-0 text-zinc-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>
              <input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                placeholder="搜索网站或标签"
                className="h-10 min-w-0 flex-1 bg-transparent text-[18px] outline-none placeholder:text-zinc-400"
              />
              {search && <button onClick={() => setSearch('')} className="text-[12px] text-zinc-500 hover:text-zinc-950">清除</button>}
              <kbd className="hidden text-[10px] tracking-wider text-zinc-400 sm:block">CTRL K</kbd>
            </label>
          </section>

          {allTags.length > 0 && (
            <nav className="home-enter mt-8 flex max-w-[900px] gap-x-6 gap-y-2 overflow-x-auto border-b border-zinc-200 pb-3 [animation-delay:100ms]" aria-label="书签标签">
              <button onClick={() => setSelectedTags([])} className={`shrink-0 text-[12px] transition ${selectedTags.length === 0 ? 'font-semibold text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}>全部</button>
              {allTags.map(tag => {
                const active = selectedTags.includes(tag.name);
                return <button key={tag.name} onClick={() => setSelectedTags(active ? [] : [tag.name])} className={`shrink-0 text-[12px] transition ${active ? 'font-semibold text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}>{tag.name}</button>;
              })}
            </nav>
          )}

          <section className="mt-10" aria-label="快速访问">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((bookmark, index) => (
                  <button
                    key={bookmark.id}
                    onClick={() => handleOpen(bookmark)}
                    className="link-enter group flex min-w-0 items-center gap-4 border-b border-zinc-200 py-5 text-left transition-colors hover:border-zinc-950"
                    style={{ animationDelay: `${Math.min(index, 12) * 35 + 150}ms` }}
                    aria-label={`打开 ${bookmark.title}`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-zinc-200 transition-transform duration-300 group-hover:-translate-y-0.5">
                      <img src={bookmark.favicon} alt="" className="h-5 w-5 object-contain" onError={e => (e.currentTarget.style.opacity = '0')} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{bookmark.title}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">{bookmark.domain}</span>
                    </span>
                    <svg className="shrink-0 text-zinc-400 transition-all group-hover:translate-x-1 group-hover:text-zinc-950" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                ))}
              </div>
            ) : (
              <div className="max-w-[720px] border-b border-zinc-300 py-10">
                <p className="serif text-[28px]">没有找到相关网站</p>
                <button onClick={() => { setSearch(''); setSelectedTags([]); }} className="mt-3 text-[12px] font-medium underline underline-offset-4">清除筛选</button>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-zinc-900 selection:bg-zinc-900 selection:text-white antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
        *{font-family: "Geist", system-ui, -apple-system, sans-serif}
        .serif{font-family:"Instrument Serif", serif}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#e4e4e7;border-radius:999px}
      `}</style>

      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_90%)]" />
        <div className="absolute -top-40 -right-40 w-[680px] h-[680px] bg-[#FFDDE1] rounded-full blur-[120px] opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-[#E8DDFF] rounded-full blur-[120px] opacity-50" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#FCFBF8]/80 border-b border-zinc-200/60">
        <div className="max-w-[1680px] mx-auto px-6 md:px-10 h-[64px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-zinc-900 text-white grid place-items-center font-bold text-[13px]">F</div>
              <span className="serif text-[22px] tracking-tight">FluxNav</span>
              <span className="hidden md:inline text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 text-white font-medium tracking-wide">MANAGE</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[12px] text-zinc-500">
              <span className="w-px h-4 bg-zinc-300 mx-2" />
              <span>{bookmarks.length} 个书签</span>
              <span>·</span>
              <span>{allTags.length} 个分组</span>
            </div>
          </div>

          <div className="flex-1 max-w-[520px] hidden md:flex items-center gap-3">
            <div className="flex-1 group relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索书签、标签、备注…  (⌘K)"
                className="w-full h-9 pl-9 pr-4 rounded-full bg-white border border-zinc-200 text-[13.5px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('display')} className="flex h-9 px-2 sm:px-3.5 items-center gap-1.5 border-b border-zinc-300 text-[13px] font-medium hover:border-zinc-900 transition" aria-label="返回展示页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5m6 6-6-6 6-6" /></svg>
              <span className="hidden sm:inline">展示页</span>
            </button>
            <button onClick={() => setShowAiConfig(v => !v)} className={`h-9 px-3.5 rounded-full border text-[13px] font-medium flex items-center gap-1.5 transition ${aiConfig.apiKey ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:border-zinc-900'}`}>
              <span>✦</span> AI
              <span className={`w-1.5 h-1.5 rounded-full ${aiConfig.apiKey ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
            </button>
            <button onClick={() => setShowGH(v => !v)} className="h-9 px-3.5 rounded-full bg-white border border-zinc-200 text-[13px] font-medium hover:border-zinc-900 transition flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.419-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.29c0 .319.192.694.801.576A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
              同步
            </button>
            <button onClick={() => { setEditing(null); setForm({ title: '', url: '', description: '', notes: '', tags: [], color: COLORS[0].bg }); setShowAddModal(true); }} className="h-9 px-4 rounded-full bg-zinc-900 text-white text-[13px] font-medium hover:bg-black transition flex items-center gap-1.5">
              <span className="text-[16px] leading-none">+</span> 添加
            </button>
          </div>
        </div>
      </header>

      {/* AI Config popover */}
      {showAiConfig && (
        <div className="max-w-[1680px] mx-auto px-6 md:px-10 pt-4 relative z-20">
          <div className="ml-auto max-w-[420px] rounded-[20px] bg-white border border-zinc-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-5 animate-[fadeIn_0.2s_ease]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-[14px]">AI 配置 · 智能助手</h3>
                <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">兼容 OpenAI 格式，支持 OpenAI / DeepSeek / 通义千问等。用于智能填充、分组说明与批量添加。</p>
              </div>
              <button onClick={() => setShowAiConfig(false)} className="w-6 h-6 grid place-items-center rounded-full bg-zinc-100">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-500 tracking-wide uppercase">API Base URL</label>
                <input value={aiConfig.baseUrl} onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })} className="mt-1 w-full h-9 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:border-zinc-900" placeholder="https://api.openai.com/v1" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 tracking-wide uppercase">API Key</label>
                <input value={aiConfig.apiKey} onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })} type="password" className="mt-1 w-full h-9 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:border-zinc-900" placeholder="sk-..." />
              </div>
              <div>
                <label className="text-[11px] font-medium text-zinc-500 tracking-wide uppercase">Model</label>
                <input value={aiConfig.model} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })} className="mt-1 w-full h-9 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:border-zinc-900" placeholder="gpt-4o-mini" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAI(true)} className="flex-1 h-9 rounded-full bg-zinc-900 text-white text-[13px] font-medium">打开 AI 工作台</button>
              <button onClick={() => setShowAiConfig(false)} className="h-9 px-4 rounded-full bg-zinc-100 text-[13px]">完成</button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Sync popover */}
      {showGH && (
        <div className="max-w-[1680px] mx-auto px-6 md:px-10 pt-4 relative z-20">
          <div className="ml-auto max-w-[460px] rounded-[20px] bg-white border border-zinc-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-[14px]">Gist 同步 · 云端备份</h3>
                <p className="text-[11.5px] text-zinc-500 mt-1 leading-relaxed">Token 需勾选 gist 权限。数据将保存为私有 Gist，支持多设备同步。</p>
              </div>
              <button onClick={() => setShowGH(false)} className="w-6 h-6 grid place-items-center rounded-full bg-zinc-100">✕</button>
            </div>
            <div className="space-y-3">
              <input value={githubConfig.token} onChange={e => setGithubConfig({ ...githubConfig, token: e.target.value })} type="password" placeholder="GitHub Personal Access Token (ghp_...)" className="w-full h-9 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:border-zinc-900" />
              <input value={githubConfig.gistId} onChange={e => setGithubConfig({ ...githubConfig, gistId: e.target.value })} placeholder="Gist ID (留空则新建) · 例如: a1b2c3d4e5" className="w-full h-9 px-3 rounded-full bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:border-zinc-900" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleGistPush} className="flex-1 h-9 rounded-full bg-zinc-900 text-white text-[13px] font-medium">↑ 推送到 Gist</button>
              <button onClick={handleGistPull} className="flex-1 h-9 rounded-full bg-white border border-zinc-200 text-[13px] font-medium">↓ 从 Gist 拉取</button>
            </div>
            {ghStatus && <div className="mt-3 text-[12px] p-3 rounded-xl bg-zinc-50 border border-zinc-200 break-all">{ghStatus}</div>}
            {githubConfig.lastSync && <div className="mt-2 text-[11px] text-zinc-500">上次同步: {new Date(githubConfig.lastSync).toLocaleString()}</div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { const blob = new Blob([JSON.stringify({ bookmarks }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fluxnav-bookmarks.json'; a.click(); }} className="text-[11px] text-zinc-500 underline">导出 JSON</button>
              <label className="text-[11px] text-zinc-500 underline cursor-pointer">导入 JSON<input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const j = JSON.parse(ev.target?.result as string); if (j.bookmarks) setBookmarks(j.bookmarks); else if (Array.isArray(j)) setBookmarks(j); } catch {} }; r.readAsText(f); }} /></label>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1680px] mx-auto px-6 md:px-10 py-8 flex gap-8 relative">
        {/* Sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-[88px] space-y-6">
            {/* mobile search */}
            <div className="lg:hidden relative">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索…" className="w-full h-10 pl-9 pr-3 rounded-full bg-white border border-zinc-200 text-[13px]" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] tracking-widest font-semibold text-zinc-400 uppercase">视图 & 排序</h4>
                <div className="flex gap-1 p-1 rounded-full bg-zinc-100">
                  <button onClick={() => setViewMode('grid')} className={`w-6 h-6 rounded-full grid place-items-center text-[12px] ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}>◫</button>
                  <button onClick={() => setViewMode('list')} className={`w-6 h-6 rounded-full grid place-items-center text-[12px] ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-zinc-500'}`}>☰</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'recent', label: '最近访问' },
                  { id: 'added', label: '最新添加' },
                  { id: 'mostVisited', label: '最常访问' },
                  { id: 'alpha', label: '字母顺序' },
                ].map(o => (
                  <button key={o.id} onClick={() => setSortBy(o.id as SortBy)} className={`h-8 rounded-full text-[12.5px] font-medium border transition ${sortBy === o.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-600'}`}>{o.label}</button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] tracking-widest font-semibold text-zinc-400 uppercase mb-3">标签分组 · {allTags.length}</h4>
              <div className="space-y-1.5">
                <button onClick={() => setSelectedTags([])} className={`w-full text-left h-9 px-3.5 rounded-full text-[13px] flex items-center justify-between border transition ${selectedTags.length === 0 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
                  <span>全部书签</span><span className="text-[11px] opacity-70">{bookmarks.length}</span>
                </button>
                {allTags.map(t => {
                  const active = selectedTags.includes(t.name);
                  return (
                    <button key={t.name} onClick={() => setSelectedTags(prev => active ? prev.filter(x => x !== t.name) : [...prev, t.name])} className={`w-full text-left h-9 px-3.5 rounded-full text-[13px] flex items-center justify-between border transition ${active ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
                      <span className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-zinc-900'}`} />{t.name}</span><span className="text-[11px] opacity-70">{t.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] bg-[#111] text-white p-[18px] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <div className="text-[11px] tracking-widest opacity-60 uppercase mb-2">AI · 智能整理</div>
              <h5 className="serif text-[18px] leading-tight">让 AI 帮你规划<br />知识版图</h5>
              <p className="text-[12px] leading-relaxed opacity-70 mt-2">一键分析现有标签，给出分组说明与优化建议，或自然语言批量添加。</p>
              <button onClick={() => setShowAI(true)} className="mt-4 h-9 w-full rounded-full bg-white text-zinc-900 text-[13px] font-medium">打开 AI 工作台 ✦</button>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-200 pt-4">
              <div className="font-medium text-zinc-600 mb-1">使用技巧</div>
              ⌘K 搜索 · ⌘N 添加 · 点击卡片打开并记录访问次数 · 本地存储自动保存
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 min-w-0">
          {/* Mobile tags + search */}
          <div className="lg:hidden mb-6 space-y-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索书签、标签…" className="w-full h-10 px-4 rounded-full bg-white border border-zinc-200 text-[13px]" />
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button onClick={() => setSelectedTags([])} className={`shrink-0 h-8 px-4 rounded-full text-[13px] border ${selectedTags.length === 0 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>全部</button>
              {allTags.map(t => <button key={t.name} onClick={() => setSelectedTags(prev => prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name])} className={`shrink-0 h-8 px-4 rounded-full text-[13px] border ${selectedTags.includes(t.name) ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200'}`}>{t.name}·{t.count}</button>)}
            </div>
          </div>

          {/* Stats bar */}
          {selectedTags.length > 0 && (
            <div className="mb-6 flex items-center gap-2">
              <div className="text-[13px] text-zinc-600">已筛选 {filtered.length} 个，标签:</div>
              {selectedTags.map(tag => <span key={tag} className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-zinc-900 text-white text-[12px]">{tag}<button onClick={() => setSelectedTags(p => p.filter(x => x !== tag))}>✕</button></span>)}
              <button onClick={() => setSelectedTags([])} className="text-[12px] text-zinc-500 underline ml-2">清除</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-[28px] bg-white border border-dashed border-zinc-300 p-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-50 grid place-items-center text-[28px] mb-4">◍</div>
              <h3 className="serif text-[24px]">没有找到匹配的书签</h3>
              <p className="text-[13px] text-zinc-500 mt-2">试试更换关键词或标签，或添加一个新的链接</p>
              <button onClick={() => { setSearch(''); setSelectedTags([]); }} className="mt-6 h-9 px-5 rounded-full bg-zinc-900 text-white text-[13px]">清空筛选</button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {filtered.map(b => (
                <article key={b.id} className="group relative rounded-[24px] bg-white border border-zinc-200/80 hover:border-zinc-900 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] transition-all duration-300 p-5 flex flex-col">
                  <div className={`absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition ${b.color} mix-blend-multiply pointer-events-none`} />
                  <div className="relative z-10 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img src={b.favicon} alt="" className="w-9 h-9 rounded-[12px] bg-zinc-50 border border-zinc-100 object-contain p-1.5" onError={e => (e.currentTarget.style.display='none')} />
                        <div>
                          <h3 className="font-semibold text-[14.5px] leading-tight line-clamp-1">{b.title}</h3>
                          <div className="text-[11.5px] text-zinc-500 mt-0.5">{b.domain}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(b); setForm({ ...b, tags: [...b.tags] }); setShowAddModal(true); }} className="w-7 h-7 rounded-full bg-zinc-50 hover:bg-zinc-900 hover:text-white grid place-items-center text-[12px] transition">✎</button>
                        <button onClick={() => handleDelete(b.id)} className="w-7 h-7 rounded-full bg-zinc-50 hover:bg-red-500 hover:text-white grid place-items-center text-[12px] transition">✕</button>
                      </div>
                    </div>
                    <p className="text-[12.5px] leading-[1.6] text-zinc-600 mt-4 line-clamp-2 min-h-[40px]">{b.description || '暂无描述'}</p>
                    {b.notes && (
                      <div className="mt-3 text-[11.5px] leading-relaxed p-2.5 rounded-xl bg-[#FCFBF8] border border-zinc-100 text-zinc-600">
                        <span className="font-medium text-zinc-900">备注：</span>{b.notes}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {b.tags.map(tag => (
                        <span key={tag} className="text-[10.5px] tracking-wide px-2.5 py-1 rounded-full bg-zinc-900 text-white">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10 mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-zinc-100 grid place-items-center">◷</span>添加 {fmtDate(b.addedAt)}</span>
                      <span>· 访 {b.visitCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden md:inline">{relTime(b.lastVisited)}</span>
                      <button onClick={() => handleOpen(b)} className="h-7 px-3.5 rounded-full bg-zinc-900 text-white text-[12px] font-medium hover:bg-black transition">打开 ↗</button>
                    </div>
                  </div>
                </article>
              ))}
              {/* Add card */}
              <button onClick={() => { setEditing(null); setForm({ title: '', url: '', description: '', notes: '', tags: [], color: COLORS[0].bg }); setShowAddModal(true); }} className="rounded-[24px] border border-dashed border-zinc-300 bg-white/60 hover:bg-white hover:border-zinc-900 p-5 min-h-[212px] flex flex-col items-center justify-center gap-3 group transition">
                <div className="w-12 h-12 rounded-full bg-zinc-900 text-white grid place-items-center text-[20px] group-hover:scale-110 transition">+</div>
                <div className="text-center">
                  <div className="font-medium text-[14px]">添加新书签</div>
                  <div className="text-[12px] text-zinc-500 mt-1">输入网址，AI 自动填充</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="rounded-[20px] bg-white border border-zinc-200 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] tracking-widest text-zinc-400 uppercase border-b"> <div className="col-span-5">标题</div><div className="col-span-3">标签 / 备注</div><div className="col-span-2">统计</div><div className="col-span-2 text-right">操作</div></div>
              {filtered.map(b => (
                <div key={b.id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-zinc-50 border-b last:border-0 border-zinc-100 transition">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <img src={b.favicon} className="w-8 h-8 rounded-full bg-zinc-100 p-1" alt="" />
                    <div className="min-w-0">
                      <div className="font-medium text-[13.5px] truncate">{b.title}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{b.domain} · {b.description?.slice(0, 40)}</div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex gap-1 flex-wrap">{b.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-white">{t}</span>)}</div>
                    {b.notes && <div className="text-[11px] text-zinc-500 mt-1 truncate">{b.notes}</div>}
                  </div>
                  <div className="col-span-2 text-[11px] text-zinc-500"><div>{relTime(b.lastVisited)}</div><div>访问 {b.visitCount} · 添加 {fmtDate(b.addedAt)}</div></div>
                  <div className="col-span-2 flex justify-end gap-1.5">
                    <button onClick={() => handleOpen(b)} className="h-7 px-3 rounded-full bg-zinc-900 text-white text-[11px]">打开</button>
                    <button onClick={() => { setEditing(b); setForm({ ...b, tags: [...b.tags] }); setShowAddModal(true); }} className="h-7 w-7 rounded-full bg-zinc-100 grid place-items-center">✎</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer mini */}
          <div className="mt-10 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-200 pt-6">
            <div>FluxNav · 本地优先 · 你的起始页，归你所有。 共 {bookmarks.length} 书签，平均每书签被打开 {bookmarks.length ? Math.round(bookmarks.reduce((a,b)=>a+b.visitCount,0)/bookmarks.length) : 0} 次</div>
            <div className="hidden md:flex gap-3"><span>⌘K 搜索</span><span>⌘N 添加</span></div>
          </div>
        </section>

        {/* Right AI Panel (desktop slide) */}
        {showAI && (
          <div className="fixed inset-0 z-50 md:z-20 md:absolute md:inset-auto md:top-[-32px] md:right-0 md:bottom-0 md:w-[400px] md:h-[calc(100vh-64px)] md:sticky">
            <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm md:hidden" onClick={() => setShowAI(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[min(96vw,420px)] bg-white md:bg-[#FFFEFB] border-l border-zinc-200 shadow-2xl md:shadow-none flex flex-col rounded-l-[28px] md:rounded-[24px] overflow-hidden">
              <div className="h-[64px] px-6 flex items-center justify-between border-b border-zinc-200 bg-white shrink-0">
                <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center">✦</span><div><div className="font-semibold text-[13.5px]">AI 工作台</div><div className="text-[11px] text-zinc-500 -mt-0.5">{aiConfig.model} · 智能整理与批量添加</div></div></div>
                <button onClick={() => setShowAI(false)} className="w-8 h-8 rounded-full bg-zinc-100 grid place-items-center">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Batch add */}
                <div>
                  <h4 className="text-[12px] font-semibold tracking-wide uppercase text-zinc-500 mb-2">自然语言批量添加</h4>
                  <div className="rounded-[16px] border border-zinc-200 bg-white p-3">
                    <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="比如：帮我添加 Next.js 官网、Tailwind CSS 文档和 Vercel，都放到前端框架分组，并写一句备注…" className="w-full min-h-[96px] resize-none outline-none text-[13px] leading-relaxed placeholder:text-zinc-400" />
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[11px] text-zinc-400">AI 将自动推断官网并生成标签</span>
                      <button disabled={aiLoading} onClick={handleAiBatchAdd} className="h-8 px-4 rounded-full bg-zinc-900 text-white text-[12.5px] disabled:opacity-50">{aiLoading ? '生成中...' : 'AI 生成并添加 ✦'}</button>
                    </div>
                  </div>
                </div>

                {/* Organize */}
                <div>
                  <h4 className="text-[12px] font-semibold tracking-wide uppercase text-zinc-500 mb-2">智能分组说明</h4>
                  <div className="rounded-[16px] border border-zinc-200 bg-white p-4">
                    <p className="text-[12.5px] leading-relaxed text-zinc-600">让 AI 分析现有 {bookmarks.length} 个书签，自动梳理标签体系，给每个分组写一句话定位。</p>
                    <button disabled={aiLoading} onClick={handleAiOrganize} className="mt-3 w-full h-9 rounded-full border border-zinc-900 text-[13px] font-medium hover:bg-zinc-900 hover:text-white transition disabled:opacity-50">{aiLoading ? '分析中…' : '一键分析分组'}</button>
                    {aiResponse && (
                      <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-[12px] leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto">{aiResponse}</div>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-[16px] bg-[#111] text-white p-4">
                  <div className="text-[11px] uppercase tracking-widest opacity-60 mb-1">Prompt 技巧</div>
                  <ul className="text-[12px] leading-relaxed space-y-1.5 opacity-80 list-disc pl-4">
                    <li>“添加 React、Vue、Svelte 官网，标签前端框架”</li>
                    <li>“把设计相关的归到 Design System”</li>
                    <li>“为每个书签补充一句使用场景备注”</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[8px]" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-[560px] rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-[scaleIn_0.25s_ease]">
            <div className="px-7 h-[64px] flex items-center justify-between border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white grid place-items-center">✎</div>
                <div><div className="font-semibold text-[15px]">{editing ? '编辑书签' : '添加新书签'}</div><div className="text-[11px] text-zinc-500 -mt-0.5">支持备注、标签与访问统计</div></div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 grid place-items-center">✕</button>
            </div>

            <div className="p-7 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">链接 URL *</label>
                    <input value={form.url || ''} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://example.com 或 example.com" className="mt-1 w-full h-11 px-4 rounded-full border border-zinc-200 bg-zinc-50 focus:outline-none focus:border-zinc-900 text-[14px]" />
                  </div>
                  <button onClick={handleAiFill} disabled={isAiFilling} className="self-end h-11 px-4 rounded-full bg-zinc-900 text-white text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-60">
                    {isAiFilling ? '填充中…' : '✦ AI 填充'}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">标题 *</label>
                  <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：Figma" className="mt-1 w-full h-11 px-4 rounded-full border border-zinc-200 focus:outline-none focus:border-zinc-900 text-[14px]" />
                </div>

                <div>
                  <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">描述</label>
                  <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="一句话说明这个网站是做什么的…" className="mt-1 w-full min-h-[64px] p-3.5 rounded-[16px] border border-zinc-200 focus:outline-none focus:border-zinc-900 text-[13px] resize-none" />
                </div>

                <div>
                  <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">备注 / 使用场景</label>
                  <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="例如：团队设计系统地址，记得开插件…" className="mt-1 w-full min-h-[56px] p-3.5 rounded-[16px] border border-zinc-200 bg-[#FCFBF8] focus:outline-none focus:border-zinc-900 text-[13px] resize-none" />
                </div>

                <div>
                  <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">标签 · 用逗号或回车分隔</label>
                  <div className="mt-1 flex flex-wrap gap-2 p-2 rounded-[16px] border border-zinc-200 min-h-[46px] focus-within:border-zinc-900 bg-white">
                    {(form.tags as string[] || []).map((tag: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-zinc-900 text-white text-[12px]">
                        {tag}<button onClick={() => setForm({ ...form, tags: (form.tags as string[]).filter((_, idx) => idx !== i) })} className="opacity-70 hover:opacity-100">✕</button>
                      </span>
                    ))}
                    <input
                      placeholder={((form.tags as string[])||[]).length ? '' : '输入标签后回车…'}
                      className="flex-1 min-w-[120px] outline-none text-[13px] bg-transparent"
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = (e.currentTarget as HTMLInputElement).value.trim().replace(/，/g, '').replace(/,/g, '');
                          if (val && !((form.tags as string[])||[]).includes(val)) {
                            setForm({ ...form, tags: [...((form.tags as string[])||[]), val] });
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                        if (e.key === 'Backspace' && !(e.currentTarget as HTMLInputElement).value) {
                          setForm({ ...form, tags: (form.tags as string[]).slice(0, -1) });
                        }
                      }}
                    />
                  </div>
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {allTags.slice(0, 6).map(t => (
                      <button key={t.name} onClick={() => {
                        if (!((form.tags as string[])||[]).includes(t.name)) setForm({ ...form, tags: [...((form.tags as string[])||[]), t.name] });
                      }} className="h-6 px-2.5 rounded-full bg-zinc-100 text-[11px] hover:bg-zinc-200">{t.name}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium tracking-wide uppercase text-zinc-500">卡片颜色</label>
                  <div className="mt-2 flex gap-2">
                    {COLORS.map((c, i) => (
                      <button key={i} onClick={() => setForm({ ...form, color: c.bg })} className={`w-8 h-8 rounded-full border-2 ${c.bg} ${form.color === c.bg ? 'border-zinc-900 scale-110' : 'border-white'} transition`} />
                    ))}
                  </div>
                </div>

                {editing && (
                  <div className="rounded-[14px] bg-zinc-50 border border-zinc-100 p-3 text-[11px] text-zinc-500 leading-relaxed">
                    添加于 {new Date(editing.addedAt).toLocaleString()} · 最后访问 {editing.lastVisited ? new Date(editing.lastVisited).toLocaleString() : '从未'} · 已打开 {editing.visitCount} 次
                  </div>
                )}
              </div>
            </div>

            <div className="px-7 h-[72px] border-t border-zinc-100 bg-[#FCFBF8] flex items-center justify-between">
              <button onClick={() => setShowAddModal(false)} className="h-10 px-5 rounded-full bg-white border border-zinc-200 text-[13px]">取消</button>
              <button onClick={handleSave} className="h-10 px-6 rounded-full bg-zinc-900 text-white text-[13px] font-medium hover:bg-black">{editing ? '保存修改' : '添加书签'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .scrollbar-none::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}
