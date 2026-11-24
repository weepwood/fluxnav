# FluxNav · 个人资源工作台

Local-first AI Bookmark Workspace。保留编辑式起始页，提供三栏资源管理、收藏集、标签、收藏、置顶、归档、回收站、批量操作、全局命令面板、四种主题、JSON/浏览器 HTML 导入导出。

- [GitHub Pages](https://weepwood.github.io/fluxnav/)
- [Netlify](https://fluxnav.netlify.app)

## 开发

Node.js 22；运行 npm ci、npm run dev。npm run check 执行 TypeScript 和领域逻辑测试。npm run build 生成支持离线的 Web 站点，npm run build:portable 生成单文件 HTML（离线分发仍依赖浏览器存储能力）。GitHub Actions 的日常 PR 和 main 仅执行快速检查及 Web 构建，main 成功后自动部署 GitHub Pages；不自动创建 Release。正式版本由独立的手动工作流验证和发布。

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

## 1.1 体验改进

支持相关度排序、标题英文单字符拼写容错、首页收藏筛选和分批展示。管理页面支持批量移动收藏集、追加标签、撤销上一次资源更新、复制网址、双击打开和本地保存状态。导入 JSON 可选择仅添加新网址或按 ID 与版本合并完整备份（包括删除记录）；后者可能更新已有记录。浏览器 HTML 导出保留收藏集名称。

性能策略：按不可变书签缓存搜索投影、延迟搜索更新、限制每次渲染条目数、减少无变化写入。IndexedDB 仍采用整体数据记录存储，尚未实现逐条持久化和全文倒排索引。

## 1.2 工作台细化

在设置中可调整首页布局、列表密度和每页数量；宽屏桌面支持鼠标或键盘调整分栏。收藏集重命名会更新未删除记录（包括归档），重复资源可逐组确认合并：保留指定记录的标题及网址，汇总标签、备注、描述、访问统计，其余记录移入回收站。规范化网址忽略 URL 片段，合并前请核对页面章节。长文本与标签仍受字段长度限制。配置仅保存在当前浏览器。

## CI/CD 与正式发布

日常迭代：PR 运行 `npm run check:quick`（类型检查、核心单元测试）以及 Web 构建；合并 main 后自动部署 Pages。跳过 E2E、压力测试、安全审计、便携版与扩展打包，不因版本号变化自动发布 Release。

正式版本节点：在 main 上准备好版本号（package.json、package-lock.json、extension/manifest.json）与 CHANGELOG.md，然后打开 Actions → 正式版本完整验证与发布 → Run workflow。默认仅完整验证并生成分发产物；勾选 publish 后，全部测试通过才创建对应提交的 Git tag 与 GitHub Release。既有版本或标签不会被覆盖。也可使用 `gh workflow run release.yml --ref main -f publish=true`。正式发布工作流不重复部署 Pages。

本地命令：`npm run check:quick` 用于日常检查；`npm run check` 包含完整单元测试和压力测试；浏览器 E2E 单独运行。正式发布工作流可以随时手动用于专项验证，不必等到新版本。

## 1.3 开发里程碑

收藏集通过 ` / ` 表示层级，如 `设计 / 图标`，父级显示全部子级书签，重命名会更新整棵子树。HTML 导出保留实际嵌套目录。管理页选择手动排序后，可在同一置顶分组内通过拖动手柄或快捷菜单调整顺序；也可直接拖动书签到收藏集。右键或更多按钮打开快捷操作菜单。排序保存在书签记录中并参与 JSON 备份及同步；旧版数据无需迁移。日常开发版本只部署 Pages，不自动创建 Release。
