# FluxNav · 个人资源工作台

Local-first AI Bookmark Workspace。保留编辑式起始页，提供三栏资源管理、收藏集、标签、收藏、置顶、归档、回收站、批量操作、全局命令面板、四种主题、JSON/浏览器 HTML 导入导出。

- [GitHub Pages](https://weepwood.github.io/fluxnav/)
- [Netlify](https://fluxnav.netlify.app)

## 开发

Node.js 22；运行 npm ci、npm run dev。npm run check 执行 TypeScript 和领域逻辑测试。npm run build 生成支持离线的 Web 站点，npm run build:portable 生成单文件 HTML（离线分发仍依赖浏览器存储能力）。GitHub Actions 在 PR 上执行检查，main 构建成功后部署并发布版本。

## 数据与迁移

自动迁移旧 LocalStorage 书签到 IndexedDB；原始书签保留供导出，凭据不再持久化。若 IndexedDB 不可用，降级到 LocalStorage 或内存并提示。导入前预览，按规范化 URL 去重；JSON 导出包含回收站。默认不请求第三方图标或字体。不同域名、浏览器配置文件及沙箱的存储相互独立。

## AI

设置兼容 OpenAI Chat Completions 的服务地址、模型和本次会话 API Key。服务须允许浏览器 CORS。可保存多个非敏感服务配置。AI 推断标题与网址、批量添加、分类及检索仅生成建议，须确认才写入。分类和检索最多发送 200 条书签的部分字段；不读取真实网页内容、不保证 URL 正确。

## 同步

GitHub Secret Gist 或自定义 JSON 服务。Gist 不是严格私密存储，可设置独立口令，通过 PBKDF2-SHA256（600,000 次）派生 AES-256-GCM 密钥，在浏览器内加密后再同步。口令不持久化，丢失不可恢复；使用过明文同步的旧 Gist 历史版本可能仍包含原始数据。同步前快照和合并预览，按 ID、修改时间和删除标记确定版本。Gist 推送前检查远端版本，但非原子条件更新，极端并发仍有竞态。自定义服务须支持 Bearer GET/PUT、CORS、ETag/If-Match，且预先创建合法 JSON 资源。Token/API Key 只在当前页面内存中。不要输入权限过大的 Token。

## 扩展与离线

extension/ 为 Chrome/Edge MV3 捕获扩展，加载解压目录即可使用；点击图标后在 FluxNav 确认保存。PWA 缓存应用壳，不缓存 API 请求；需要首次联网加载。独立 HTML 不注册 Service Worker。

## 限制

不提供任意网页内容抓取、自动失效链接检查、实时多设备同步或商店上架。浏览器跨域限制下，相关能力需要独立服务。同步采用整条记录版本合并而非字段级 CRDT。
