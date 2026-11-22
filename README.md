# FluxNav · 智能起始页

AI-Powered Link Dashboard — 一个智能浏览器起始页，聚合常用链接、AI 搜索等功能。

## 在线预览

- GitHub Pages：https://weepwood.github.io/fluxnav/
- Netlify：https://fluxnav.netlify.app

## 技术栈

- React 19
- TypeScript
- Tailwind CSS 4
- Vite

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages 自动部署

已提供 `.github/workflows/deploy-pages.yml`，推送到 `main` 分支或在 Actions 中手动触发时，将通过 Node.js 22 执行 `npm ci`、`npm run build`，再把 `dist/` 发布到 GitHub Pages。

**首次使用**：在 GitHub 仓库的 **Settings → Pages → Build and deployment** 中，将 **Source** 设为 **GitHub Actions**。随后前往 **Actions → 部署 GitHub Pages** 查看运行结果。

GitHub Pages 构建时会设置 `GITHUB_PAGES=true`，Vite 的 `base` 自动设为 `/fluxnav/`；本地和 Netlify 构建仍使用 `/`，互不影响。
