# 验证记录

执行日期：2026-09-07。

- Node.js 22.17.0，使用本机已安装的项目依赖执行 Vite 生产构建，结果通过，输出 `dist-prod/`。
- 原始 MIT 许可证保持不变。
- 项目首页、登录页项目入口、用户文档入口和 npm 包元数据已改为翼安智链。
- 原框架产品截图和页面推广条已移除。

本地构建命令：

```bash
node --max-old-space-size=8192 node_modules/vite/bin/vite.js build --mode prod
```

本机 pnpm 11 对现有依赖目录触发了重新安装检查，因此采用上面的等价 Vite 命令验证，
没有重新安装或清空原项目的依赖目录。新环境使用 pnpm 9 安装锁文件，再运行 `pnpm build:prod`。

构建出现 Vite CJS API 和 Browserslist 数据过期提示，不影响本次构建结果。
本次未连接后端执行浏览器端到端测试，未运行全量 TypeScript 类型检查或部署到线上。
