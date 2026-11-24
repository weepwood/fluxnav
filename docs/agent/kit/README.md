# Agent Project Memory Kit

可复制到其他仓库的轻量初始化器。仅依赖 Node.js 18+，不联网、不安装依赖、不修改 Git、不覆盖已存在文件。

## 使用

将本目录的 init.mjs 复制或下载到本地，运行：

```bash
node /path/to/init.mjs /path/to/your-repo
```

目标必须已存在且为目录。默认创建根 AGENTS.md 与 docs/agent 下七份项目记忆、sessions/ 初始说明。项目名称从目标目录名获取；模板含待核实字段，请先填写真实技术栈、当前状态和验证命令，再提交。

如确实需要额外工具入口，可增加参数：

```bash
node /path/to/init.mjs /path/to/your-repo --adapters
```

额外创建 CLAUDE.md（@AGENTS.md）、GEMINI.md 和 .github/copilot-instructions.md（指引阅读 AGENTS.md）。不同工具的自动加载方式因版本和模式而异；必要时显式要求读取入口。Cursor 可使用 AGENTS.md 或按其版本设置规则。

已存在文件一律跳过，包括既有 AGENTS.md 或适配入口；出现符号链接路径时拒绝写入，防止意外写到其他位置。初始化不声称完成任何开发、测试或发布。脚本无后台行为。

## 使用约定

每轮开始查 Git 状态并读 STATE/HANDOFF，每轮结束同步更新。重大决策记录 DECISIONS，重要会话摘要归档 sessions。公共工程规范只维护在 AGENTS.md；其他工具入口不得复制形成第二套相互冲突规则。

本模板用于公开/私有工程文档，均不要记录密码、Token、原始私人聊天及真实个人数据。不要复制 FluxNav 的项目专属技术栈、发布记录或自动合并授权到其他项目。

## 只读检查

复制 check.mjs 后运行 `node /path/to/check.mjs /path/to/your-repo`。检查 8 个必需文件、普通 Markdown 相对链接、空文件、越界及符号链接；STATE/HANDOFF 缺少有效日期、未来日期或超过 30 天只警告。外链、复杂 Markdown 语法、事实真伪、GitHub 状态不自动验证；必须由接手 Agent 核实。不写入文件，不联网。FluxNav 使用 `npm run check:memory` 同时运行检查与临时目录回归测试。
