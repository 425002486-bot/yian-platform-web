import type { RouteLocationNormalized, Router, RouteRecordNormalized } from 'vue-router'
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { isUrl } from '@/utils/is'
import { cloneDeep, omit } from 'lodash-es'
import qs from 'qs'

const modules = import.meta.glob('../views/**/*.{vue,tsx}')

const normalizeRoutePath = (route: AppCustomRouteRecordRaw) => {
  if (isUrl(route.path)) return route.path
  const path = route.path.indexOf('?') > -1 ? route.path.split('?')[0] : route.path
  if (route.parentId === 0 && path && !path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

const resolveRouteComponent = (componentPath: string | null | undefined, routePath: string) => {
  const modulesRoutesKeys = Object.keys(modules)
  const needle = componentPath && componentPath.length > 0 ? componentPath : routePath
  const index = modulesRoutesKeys.findIndex((item) => item.includes(needle))
  return index >= 0 ? modules[modulesRoutesKeys[index]] : undefined
}

/**
 * Register an async component from the generated view module map.
 */
export const registerComponent = (componentPath: string) => {
  for (const item in modules) {
    if (item.includes(componentPath)) {
      // @ts-ignore
      return defineAsyncComponent(modules[item])
    }
  }
}

/* Layout */
export const Layout = () => import('@/layout/Layout.vue')

export const getParentLayout = () => {
  return () =>
    new Promise((resolve) => {
      resolve({
        name: 'ParentLayout'
      })
    })
}

export const ascending = (arr: any[]) => {
  arr.forEach((v) => {
    if (v?.meta?.rank === null) v.meta.rank = undefined
    if (v?.meta?.rank === 0) {
      if (v.name !== 'home' && v.path !== '/') {
        console.warn('rank only the home page can be 0')
      }
    }
  })
  return arr.sort((a: { meta: { rank: number } }, b: { meta: { rank: number } }) => {
    return a?.meta?.rank - b?.meta?.rank
  })
}

export const getRawRoute = (route: RouteLocationNormalized): RouteLocationNormalized => {
  if (!route) return route
  const { matched, ...opt } = route
  return {
    ...opt,
    matched: (matched
      ? matched.map((item) => ({
          meta: item.meta,
          name: item.name,
          path: item.path
        }))
      : undefined) as RouteRecordNormalized[]
  }
}

// Generate frontend routes from backend menu records.
export const generateRoute = (routes: AppCustomRouteRecordRaw[]): AppRouteRecordRaw[] => {
  const res: AppRouteRecordRaw[] = []
  for (const route of routes) {
    const meta = {
      title: route.name,
      icon: route.icon,
      hidden: !route.visible,
      noCache: !route.keepAlive,
      alwaysShow:
        route.children &&
        route.children.length > 0 &&
        (route.alwaysShow !== undefined ? route.alwaysShow : true)
    } as any

    if (route.component && route.component.indexOf('?') > -1) {
      const query = route.component.split('?')[1]
      route.component = route.component.split('?')[0]
      meta.query = qs.parse(query)
    }

    let data: AppRouteRecordRaw = {
      path: normalizeRoutePath(route),
      name:
        route.componentName && route.componentName.length > 0
          ? route.componentName
          : toCamelCase(route.path, true),
      redirect: route.redirect,
      meta
    }

    // Top-level single-page menu: wrap it in Layout so it still behaves like a menu page.
    if (!route.children && route.parentId == 0 && route.component) {
      data.component = Layout
      data.meta = {
        hidden: meta.hidden
      }
      data.name = toCamelCase(route.path, true) + 'Parent'
      data.redirect = ''
      meta.alwaysShow = true
      const childrenData: AppRouteRecordRaw = {
        path: '',
        name:
          route.componentName && route.componentName.length > 0
            ? route.componentName
            : toCamelCase(route.path, true),
        redirect: route.redirect,
        meta
      }
      const component = resolveRouteComponent(route.component, data.path)
      if (!component) {
        console.warn('[router] skip top-level menu without a matching component:', route.path)
        continue
      }
      childrenData.component = component
      data.children = [childrenData]
    } else {
      if (route.children?.length) {
        data.component = Layout
        data.redirect = getRedirect(data.path, route.children)
      } else if (isUrl(route.path)) {
        data = {
          path: '/external-link',
          component: Layout,
          meta: {
            name: route.name
          },
          children: [data]
        } as AppRouteRecordRaw
      } else {
        const component = resolveRouteComponent(route.component, data.path)
        if (!component) {
          console.warn('[router] skip leaf menu without a matching component:', route.path)
          continue
        }
        data.component = component
      }

      if (route.children) {
        data.children = generateRoute(route.children)
      }
    }

    res.push(data as AppRouteRecordRaw)
  }
  return res
}

export const getRedirect = (parentPath: string, children: AppCustomRouteRecordRaw[]) => {
  if (!children || children.length == 0) {
    return parentPath
  }
  const path = generateRoutePath(parentPath, children[0].path)
  if (children[0].children) return getRedirect(path, children[0].children)
  return path
}

const generateRoutePath = (parentPath: string, path: string) => {
  if (parentPath.endsWith('/')) {
    parentPath = parentPath.slice(0, -1)
  }
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  return parentPath + path
}

export const pathResolve = (parentPath: string, path: string) => {
  if (isUrl(path)) return path
  if (!path) return parentPath
  const childPath = path.startsWith('/') ? path : `/${path}`
  return `${parentPath}${childPath}`.replace(/\/+/g, '/')
}

export const flatMultiLevelRoutes = (routes: AppRouteRecordRaw[]) => {
  const modules: AppRouteRecordRaw[] = cloneDeep(routes)
  for (let index = 0; index < modules.length; index++) {
    const route = modules[index]
    if (!isMultipleRoute(route)) {
      continue
    }
    promoteRouteLevel(route)
  }
  return modules
}

const isMultipleRoute = (route: AppRouteRecordRaw) => {
  if (!route || !Reflect.has(route, 'children') || !route.children?.length) {
    return false
  }

  const children = route.children
  let flag = false
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (child.children?.length) {
      flag = true
      break
    }
  }
  return flag
}

const promoteRouteLevel = (route: AppRouteRecordRaw) => {
  let router: Router | null = createRouter({
    routes: [route as RouteRecordRaw],
    history: createWebHashHistory()
  })

  const routes = router.getRoutes()
  addToChildren(routes, route.children || [], route)
  router = null

  route.children = route.children?.map((item) => omit(item, 'children'))
}

const addToChildren = (
  routes: RouteRecordNormalized[],
  children: AppRouteRecordRaw[],
  routeModule: AppRouteRecordRaw
) => {
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    const route = routes.find((item) => item.name === child.name)
    if (!route) {
      continue
    }
    routeModule.children = routeModule.children || []
    if (!routeModule.children.find((item) => item.name === route.name)) {
      routeModule.children?.push(route as unknown as AppRouteRecordRaw)
    }
    if (child.children?.length) {
      addToChildren(routes, child.children, routeModule)
    }
  }
}

const toCamelCase = (str: string, upperCaseFirst: boolean) => {
  str = (str || '')
    .replace(/-(.)/g, function (group1: string) {
      return group1.toUpperCase()
    })
    .replaceAll('-', '')

  if (upperCaseFirst && str) {
    str = str.charAt(0).toUpperCase() + str.slice(1)
  }

  return str
}
