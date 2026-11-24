# 架构与实现地图

以源码为准；本文是定位入口，不复制全部 API。

| 区域 | 入口与职责 |
|---|---|
| 应用 | src/App.tsx：hash 路由、库状态、持久化、操作撤销、弹窗、设置与凭据 |
| 领域 | src/domain.ts：Bookmark/Library、URL 规范化、搜索、合并、收藏集树、排序、导出 |
| 存储 | src/storage.ts：IndexedDB v2、迁移、按记录写入、revision、快照与降级 |
| 导入 | src/imports.ts、src/import.worker.ts、src/components/ImportDialog.tsx：编码、预览、修复、选择性导入 |
| 搜索 | src/useSearch.ts、src/search.worker.ts、domain.ts：延迟/后台搜索、排名、回退 |
| AI 与同步 | src/services.ts、src/aiSuggestions.ts、src/crypto.ts、AIWorkbench.tsx、Settings.tsx |
| 操作 | src/operations.ts：最近一次可撤销资源修改及版本保护 |
| UI | src/components/Home.tsx、Workspace.tsx、ResourceDetails.tsx、CollectionTree.tsx、Command.tsx、BookmarkEditor.tsx |
| 组件 | src/components/ui.tsx、Dialog.tsx、ResourceMenu.tsx、ResizeHandle.tsx、DesignLab.tsx |
| 布局 | src/appearance.ts、src/responsive.ts、src/useWorkspaceMode.ts，src/styles/* |
| 分发 | vite.config.ts、scripts/build-pwa.mjs、public/、extension/ |

## 数据与安全不变量

JSON schemaVersion 1；Bookmark 以 ID 为身份，包含 URL、标题、标签、收藏集、访问和修改时间、收藏/置顶/归档/删除状态及可选顺序。同步按记录的 updatedAt 合并，删除标记参与冲突处理；不是字段级 CRDT。URL 仅 HTTP(S)，拒绝含凭据的 URL；规范化去重忽略片段。禁止随意更改 ID、删除标记或版本规则。

IndexedDB 数据库 fluxnav-v1，版本 2；独立 bookmarks store 与 data store 的 revision、snapshot 等。迁移保留旧 data/library；旧 LocalStorage 数据也保留用于导出。降级可能用 LocalStorage/内存并警告；不要覆盖损坏备份。跨标签页有 revision 缓存失效，不是实时推送。旧客户端可能不能打开升级数据库。

导入：30 MB、100,000 条上限；逐条校验、重复和修复报告。完整无异常 JSON 才可选择按版本恢复（含删除），必须确认。HTML 惰性解析，不访问书签站点；大 JSON 优先 worker。默认添加新网址，勿把外部输入当可信数据。

搜索：候选 >=2,000 且 Worker 可用时用内联 worker，失败回退主线程；输入防抖、过期请求保护。工作台每页 40/80/120（默认 80），首页初始 48，收藏集初始最多 160 节点、逐批展开；不是完全 DOM 虚拟化。避免在高频拖拽或每帧渲染中反复全库扫描。

同步与 AI：会话内存凭据；HTTPS 或本机 HTTP、禁止重定向。Gist 推送前检查 revision 但非原子写入；自定义 JSON 服务必须 ETag/If-Match。可选 PBKDF2-SHA256 600,000 次 + AES-256-GCM；口令不持久化。AI 每批至多 50 条，发送前同意，分类/检索仅最小字段（ID、标题、网站来源、标签、收藏集）；仍可能含敏感标题，勿宣称完全匿名。建议需预览确认，过期版本跳过。

## 路由与部署

#/（首页）、#/manage（工作台）、#/design（真实组件演示）、#/capture?url=…&title=…（扩展捕获确认）。GitHub Pages base 为 /fluxnav/；其他环境根路径。Portable HTML 不依赖外置 manifest/icon，不注册 SW；PWA 缓存应用壳，不缓存 API。

## 验证入口

npm run check:quick、npm run check、npm run build、npm run build:portable。tests/storage.integration.mjs 需要 fake-indexeddb；浏览器测试需要 Playwright Chromium，具体安装命令以 release.yml 为准。tests/services.test.ts 模拟网络，不接真实账号。
