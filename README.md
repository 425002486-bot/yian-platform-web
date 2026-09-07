# 翼安智链 · 管理前端

**无人机资产与维修运维管理平台**

Vue 3 · TypeScript · Vite 5 · Element Plus · Pinia

[后端仓库](https://github.com/425002486-bot/yian-platform-server) ·
[前端仓库](https://github.com/425002486-bot/yian-platform-web) ·
[部署说明](docs/GETTING_STARTED.md) · [第三方声明](THIRD_PARTY_NOTICES.md)

## 项目介绍


翼安智链面向无人机维修与运维团队，将设备档案、电池信息、维修工单、备件流转和操作留痕集中管理，
并提供资料解析、飞行日志解析及诊断草稿生成等 AI 辅助能力。

项目采用前后端分离架构，目前以无人机运维业务的 MVP 实现为主。AI 输出用于辅助人工判断，
不同能力的可用性取决于模型、OCR 服务及环境配置；模拟结果、真实模型结果与回退结果会区分标识。


## 业务能力


| 业务领域 | 当前代码包含的能力 |
| --- | --- |
| 资产档案 | 无人机台账、设备详情、电池档案及资料附件 |
| 维修工单 | 工单管理、维修处理、领料与退料记录 |
| 备件库存 | 物料、库存、出入库及工单关联的备件流转 |
| 规则与站点 | 站点管理、业务规则配置及电池规则评估 |
| 运维视图 | 业务工作台、统计看板及审计相关页面 |
| AI 辅助 | 资产资料解析、飞行日志解析、诊断草稿生成与结果查询 |
| 平台基础 | 用户、角色、菜单权限、多租户、文件管理和日志 |


## 业务流程

```mermaid
flowchart LR
  A[设备与电池建档] --> B[建立维修工单]
  B --> C[资料与飞行日志解析]
  C --> D[人工确认诊断与维修方案]
  D --> E[领料、维修与退料]
  E --> F[工单记录与运维追溯]
```

## 仓库职责

本仓库提供运维人员使用的管理界面，通过后端 API 读写业务数据。

```text
src/views/yian/       资产、工单、库存、规则、审计和看板页面
src/api/yian/         翼安业务 API 与 AI 接口
src/views/mes/        设备、物料、库存等业务基础页面
src/components/      可复用界面组件
src/layout/          管理后台布局
src/router/          路由配置
src/store/           用户、权限等状态管理
docs/                启动与迁移说明
```

## 快速开始

使用 Node.js 20 和 pnpm 9，并先启动后端服务。

```bash
git clone https://github.com/425002486-bot/yian-platform-web.git
cd yian-platform-web
pnpm install --frozen-lockfile
cp .env.local.example .env.local
pnpm dev
```

Windows PowerShell 使用 `Copy-Item .env.local.example .env.local`。
在 `.env.local` 中设置 API 地址，登录账号由自己的后端环境提供。
详细配置见[部署说明](docs/GETTING_STARTED.md)。

```bash
pnpm build:prod
```

将生成的静态资源部署到 Web 服务器，并为前端路由配置回退到 `index.html`。

## 开发与贡献

提交问题时请说明页面或接口、复现步骤、期望结果和实际结果，并删除日志中的凭据与业务数据。
欢迎通过 Issue 讨论问题和改进建议，通过 Pull Request 提交变更。

## 许可证

本仓库沿用 [MIT License](LICENSE)。第三方代码及其衍生修改保留原有版权与许可声明，
详见 [Third-party notices](THIRD_PARTY_NOTICES.md)。
