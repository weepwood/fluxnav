import {mkdir,writeFile,lstat} from 'node:fs/promises';
import {resolve,dirname,basename,relative,sep} from 'node:path';

const args=process.argv.slice(2);
if(!args[0]||args[0].startsWith('-')||args.slice(1).some(a=>a!=='--adapters')){
 console.error('Usage: node init.mjs <existing-project-directory> [--adapters]');process.exitCode=1;
}else{
 const root=resolve(args[0]);
 const stat=await lstat(root);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Target must be an existing non-symlink directory');
 const name=basename(root).replace(/[\r\n]/g,' ');
 const files={
 'AGENTS.md':`# ${name} · Agent 开发指南\n\n开始工作前阅读 [STATE](docs/agent/STATE.md) 和 [HANDOFF](docs/agent/HANDOFF.md)，核实 Git、PR、CI；按需阅读其他项目文档。代码、真实检查结果与用户最新要求优先。\n\n- 优先小范围、兼容现有数据的改动，按项目实际规范开发。\n- 日常迭代快速检查，高风险改动专项验证，正式发布完整验收。\n- 合并、发布、外部写入需按本项目用户授权执行；不绕过失败检查。\n- 每轮结束更新 STATE 与 HANDOFF，必要时更新路线、架构、设计和决策；重要会话存入 sessions。\n- 不写入秘密、私人原始聊天或真实个人数据；不伪造测试或进度。\n\n文档：[PROJECT](docs/agent/PROJECT.md) · [ARCHITECTURE](docs/agent/ARCHITECTURE.md) · [DESIGN](docs/agent/DESIGN.md) · [DECISIONS](docs/agent/DECISIONS.md) · [ROADMAP](docs/agent/ROADMAP.md)\n`,
 'docs/agent/PROJECT.md':`# 项目定位\n\n项目：${name}\n\n待核实：目标、技术栈、仓库/部署地址、主要功能、非目标、用户明确约束。\n`,
 'docs/agent/ARCHITECTURE.md':'# 架构\n\n待核实：入口、模块、数据流、持久化、安全边界、构建和验证命令。\n',
 'docs/agent/STATE.md':'# 当前状态\n\n最后核实日期：待填。\n\n版本 / main / 开放 PR / CI / 部署：待核实。\n\n已验证、未验证、已知问题和证据链接：待填。\n',
 'docs/agent/ROADMAP.md':'# 路线图\n\n已完成：待核实。\n\n进行中：待核实。\n\n待办与优先级：待用户确认，不把建议写成承诺。\n',
 'docs/agent/DESIGN.md':'# 设计规范\n\n待核实：设计语言、主题/令牌、共享组件、响应式、动效、可访问性和真实截图验收。\n',
 'docs/agent/DECISIONS.md':'# 决策记录\n\n每项记录日期、背景、选择、原因、取舍、验证和替代关系。\n',
 'docs/agent/HANDOFF.md':'# 最新交接\n\n日期 / 用户目标 / 已实施 / 真实验收 / 阻塞 / 下一步：待核实。\n\n接手前重新检查 Git 与 CI；无证据时不标记完成。\n',
 'docs/agent/sessions/README.md':'# 会话摘要\n\n重要里程碑按 YYYY-MM-DD-topic.md 命名。记录用户目标、实施、测试、链接、未解决事项；不保存原始聊天或凭据。\n'
 };
 if(args.includes('--adapters'))Object.assign(files,{'CLAUDE.md':'@AGENTS.md\n','GEMINI.md':'请阅读仓库根目录 AGENTS.md，遵循公共项目规范。\n','.github/copilot-instructions.md':'请阅读仓库根目录 AGENTS.md，遵循公共项目规范。\n'});
 // Refuse symlink ancestors under the chosen root, including existing files.
 for(const [rel,content] of Object.entries(files)){
  const target=resolve(root,rel);const parts=relative(root,target).split(sep);let dir=root;
  for(const part of parts.slice(0,-1)){
   dir=resolve(dir,part);
   try{await mkdir(dir);}catch(e){if(e.code!=='EEXIST')throw e;}
   const s=await lstat(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Unsafe directory: '+dir);
  }
  try{await writeFile(target,content,{flag:'wx'});console.log('CREATED '+rel);}
  catch(e){if(e.code!=='EEXIST')throw e;const s=await lstat(target);if(!s.isFile()||s.isSymbolicLink())throw Error('Unsafe existing path: '+target);console.log('SKIPPED '+rel);}
 }
 console.log('Fill all placeholders from verified project facts before committing.');
}
