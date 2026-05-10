# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Yudao Admin (芋道管理系统)** — a Vue 3 enterprise admin platform built on [vue-element-plus-admin](https://gitee.com/kailong110120130/vue-element-plus-admin). It serves as the frontend for a Java backend (Spring Boot / Spring Cloud) covering modules like System, BPM, CRM, ERP, Mall, AI, IoT, MES, and more.

Tech stack: Vue 3.5 + TypeScript + Vite 5 + Element Plus 2.11 + Pinia + UnoCSS + vue-i18n

## Commands

```bash
pnpm install          # Install dependencies (pnpm is required, >=8.6.0)
pnpm dev              # Dev server using .env.local (port from VITE_PORT, default 80)
pnpm dev-server       # Dev server using .env.dev (remote backend)
pnpm build:local      # Build with .env.local
pnpm build:prod       # Production build
pnpm lint:eslint      # ESLint fix
pnpm lint:format      # Prettier format
pnpm lint:style       # Stylelint fix
pnpm ts:check         # TypeScript type checking (vue-tsc --noEmit)
```

No test framework is configured in this project.

## Architecture

### Path Alias
`@/` maps to `src/`. Configured in both `tsconfig.json` and `vite.config.ts`.

### Auto-imports (no manual import needed)
Configured via `unplugin-auto-import` in `build/vite/index.ts`:
- Vue APIs: `ref`, `reactive`, `computed`, `watch`, `onMounted`, etc.
- `vue-router`: `useRouter`, `useRoute`
- `useI18n` from vue-i18n
- Project utilities: `useMessage`, `useTable`, `useCrudSchemas`, `required`, `DICT_TYPE`

Components in `src/components/` are auto-registered via `unplugin-vue-components`.

### Router & Permissions
- **Static routes** are in `src/router/modules/remaining.ts` (login, error pages, detail sub-pages)
- **Dynamic routes** are generated from backend menu data. After login, `src/permission.ts` calls `permissionStore.generateRoutes()` which uses `import.meta.glob('../views/**/*.{vue,tsx}')` to resolve components
- Permission check: `v-hasPermi="['system:user:create']"` directive or `checkPermi()` function
- User permissions stored as `Set<string>` in `useUserStore`; `*:*:*` = super admin

### API Layer
- Axios config: `src/config/axios/service.ts` — base URL = `VITE_BASE_URL + VITE_API_URL`
- Request wrapper: `src/config/axios/index.ts` — exposes `request.get/post/put/delete/download/upload`
- API files: `src/api/<module>/<submodule>/index.ts` — each exports typed async functions
- Auth: Bearer token auto-injected; transparent token refresh on 401
- Multi-tenancy: `tenant-id` header injected when `VITE_APP_TENANT_ENABLE=true`

### State Management (Pinia)
Key stores in `src/store/modules/`:
| Store | Purpose |
|-------|---------|
| `app` | Layout type, theme, dark mode, sidebar state |
| `user` | Auth info, permissions Set, roles |
| `permission` | Dynamic route generation from backend menus |
| `tagsView` | Browser-tab tags, keep-alive cache |
| `dict` | Dictionary data (cached 60s in sessionStorage) |
| `locale` | i18n locale (`zh-CN` / `en`) |

Each store exports `useXxxStoreWithOut()` for use outside Vue setup context (e.g., in router guards).

### Layout System
`src/layout/` renders via TSX (`useRenderLayout.tsx`). Four layout modes controlled by `appStore.layout`:
- `classic` — sidebar + content (default)
- `topLeft` — top header + left menu
- `top` — full-width top navigation
- `cutMenu` — two-column sidebar (tab menu + sub-menu)

### View Page Patterns
Standard CRUD pages follow this structure:
```
src/views/<module>/<feature>/
  index.vue          # List page with search form + table + action buttons
  <Feature>Form.vue  # Create/edit dialog form
```

Common patterns in views:
- `ContentWrap` component wraps page sections
- `DICT_TYPE` enum + `getIntDictOptions()`/`getDictOptions()` for dictionary selects
- `v-hasPermi` for permission-gated buttons
- `useMessage()` for `ElMessage`/`ElMessageBox` notifications

### CRUD Schema System
`useCrudSchemas` hook (`src/hooks/web/useCrudSchemas.ts`) defines a single `CrudSchema[]` that generates schemas for search form, table columns, create/edit form, and detail descriptions simultaneously. Key fields:
- `isSearch`/`isTable`/`isForm`/`isDetail` — toggle visibility per context
- `dictType` — auto-renders `DictTag` in table and dict select in form
- `search`/`table`/`form`/`detail` — per-context overrides

### i18n
- Locale files: `src/locales/zh-CN.ts`, `src/locales/en.ts`
- `useI18n` is auto-imported; use `t('key')` in templates
- Element Plus locale synced via `useLocaleStore`

### Styles
- Global SCSS variables: `src/styles/variables.scss` (auto-injected in all SCSS via vite config)
- UnoCSS for atomic utility classes (e.g., `class="!w-240px"`, `class="mb-10px"`)

### Environment Variables
Key variables in `.env*` files:
- `VITE_BASE_URL` — backend server URL
- `VITE_API_URL` — API prefix (default `/admin-api`)
- `VITE_APP_TENANT_ENABLE` — multi-tenancy toggle
- `VITE_APP_CAPTCHA_ENABLE` — login captcha toggle
- `VITE_APP_API_ENCRYPT_ENABLE` — API request/response encryption

### Build Configuration
- Vite plugins in `build/vite/index.ts`
- Dependency pre-bundling list in `build/vite/optimize.ts`
- Manual chunks: `echarts`, `form-create`, `form-designer` (split for code splitting)
- Build uses Terser; production drops console/debugger

### Key Directories
- `src/components/` — reusable components (Dialog, Table, Form, Editor, DictTag, UploadFile, Icon, etc.)
- `src/hooks/` — composables (`useTable`, `useCrudSchemas`, `useMessage`, etc.)
- `src/utils/` — utilities (auth, download, dict, tree, routerHelper, etc.)
- `src/plugins/` — plugin registrations (Element Plus, form-create, echarts, svg-icons)
- `src/directives/` — custom directives (`v-hasPermi`)
