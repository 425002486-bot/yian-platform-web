# 前端启动说明

## 本地开发

1. 安装 Node.js 20、pnpm 9，执行 `pnpm install --frozen-lockfile`。
2. 将 `.env.local.example` 复制为 `.env.local`，设置 `VITE_BASE_URL` 为自己的后端地址。
3. 确保后端已初始化翼安业务菜单、租户及账号。
4. 执行 `pnpm dev`，使用终端显示的地址打开页面。

`VITE_API_URL` 默认 `/admin-api`。跨域、反向代理和 API 地址需与实际部署保持一致。
账号和密码在登录页手动填写；不要将实际登录凭据提交到 Git。

## API 加密配置

`VITE_APP_API_ENCRYPT_ENABLE`、算法、请求密钥和响应密钥必须与后端配置一致。
如后端启用加密，请在本地或构建环境注入对应变量；具体名称见 `.env.local.example`。
所有 `VITE_` 变量都可能被打包到浏览器，不得放入服务端私钥或第三方 API 密钥。

## 生产构建

使用 `.env.prod` 和部署环境变量配置生产 API 地址，执行 `pnpm build:prod`。
静态资源目录由 `VITE_OUT_DIR` 指定；反向代理需允许前端路由回退到 `index.html`。
请使用 HTTPS 并避免将管理 API 暴露给不需要访问的对象。

## AI 页面

资料解析、飞行日志解析和诊断草稿由后端接口提供。
模拟、真实模型及回退模式在界面中分别展示；未配置模型时不能将模拟结果视为真实识别结果。

## 版本说明

仓库保留可选平台模块，翼安业务主要位于 `src/views/yian` 和 `src/api/yian`。
本次验证结果见 [VALIDATION.md](VALIDATION.md)。
