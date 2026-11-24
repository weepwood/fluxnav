# 当前项目状态

最后核实：2026-11-24。以下是最后已验证的产品发布基线，不是对仓库未来状态的保证。每轮开始重新查询 main、PR、CI、Release。

## 已发布基线

| 事项 | 状态与证据 |
|---|---|
| 正式版本 | [v2.0.0](https://github.com/weepwood/fluxnav/releases/tag/v2.0.0)，非预发布 |
| 发布提交 | [0e7ae5c3dd41db6b7bb6a70a9c5f48ff1dc949bf](https://github.com/weepwood/fluxnav/commit/0e7ae5c3dd41db6b7bb6a70a9c5f48ff1dc949bf) |
| 发布 PR | [#16](https://github.com/weepwood/fluxnav/pull/16)，已合并 |
| 完整发布 | [45385428602](https://github.com/weepwood/fluxnav/actions/runs/45385428602)，成功 |
| Pages 部署 | [45385428539](https://github.com/weepwood/fluxnav/actions/runs/45385428539)，成功 |
| 分发文件 | fluxnav-portable.html、fluxnav-extension.zip、SHA256SUMS.txt；历史发布时已下载并校验 |
| 当前阶段 | 稳定维护；v1.6–v2.0 既定视觉路线完成 |
| 本轮变更 | 建立项目记忆文档与通用初始化模板；不改变应用版本、数据或发布资产 |

## 发布基线实测（不是本轮文档 CI）

33/33 单元测试，生产依赖审计报告 0 个漏洞（当次数据库结果）；IndexedDB 迁移、完整业务 E2E、生产 PWA 离线、Portable file:// 离线、扩展捕获模拟、全部六项浏览器专项通过。主分支发布环境 10,000 条演示书签：首次加载 1699 ms、搜索 214 ms；不是跨设备性能承诺。14 组视口、四套主题、48 组语义颜色组合；非完整无障碍认证。

## 待验证 / 已知限制

- Pages 部署成功，但未独立访问线上页面核实实际渲染；不要据此承诺线上一定可用。
- Chromium 测试和触控模拟通过；Safari/Firefox、真实手机以及实际安装的浏览器扩展尚未完整验收。
- AI/Gist/自定义 JSON 使用模拟请求验证，真实个人账号、CORS、网络条件需在获得许可后验证。
- Gist 非原子写入、整条记录合并、跨标签页非实时；这些是架构边界，不是已修复缺陷。
- CSS 仍有历史兼容规则，实际使用发现冲突再有针对性清理。
- 发布工作流中 v2.0.0 文档路径的专用自动触发仍存在。不要修改 docs/releases/v2.0.0.md 来重新发布旧版本；后续发布需独立规划。

## 开放 PR

建立记忆前查询：无开放 PR。本轮文档 PR 与后续合并/部署请以 GitHub 实际状态为准；不预填未产生的 SHA 或成功结果。
