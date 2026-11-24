# 项目定位

- 仓库：[weepwood/fluxnav](https://github.com/weepwood/fluxnav)
- 在线：[GitHub Pages](https://weepwood.github.io/fluxnav/)；README 另列 Netlify 地址，未在本轮独立核实。
- FluxNav 是 Local-first AI Bookmark Workspace，面向个人收藏、资源整理、检索和快速访问。
- React 19.2.6、TypeScript 5.9.3、Vite 7.3.2、Tailwind CSS 4.1.17，Node 22；无必需后端。
- 正式分发包括 Web/PWA、单文件 Portable HTML、Chrome/Edge MV3 捕获扩展。

## 功能范围

起始页支持列表/磁贴、置顶分组、标签、收藏筛选、标题与背景等个性化；工作台支持三栏、收藏集树、标签、收藏、置顶、归档、回收站、批量操作、手动排序、重复合并与撤销。全局命令搜索支持 Ctrl/Cmd+K；新增支持 Ctrl/Cmd+N。

导入浏览器 HTML 与 JSON，预览、容错、排除条目与安全合并；导出完整 JSON 或浏览器 HTML。本地快照与可选 Gist/自定义 JSON 服务同步、AES-GCM 加密。AI 仅生成建议，必须用户确认，不执行真实网页抓取。四套主题及独立组件规范页 #/design。

## 明确边界

不需要实时协同、服务器账号体系、全文倒排/向量索引、网页抓取、自动链接失效检测或扩展商店上架；这些不是已承诺开发任务。稳定维护阶段以用户报告和证据驱动。不同站点、文件路径、浏览器配置的存储隔离。
