import router from './router'
import type { RouteRecordRaw } from 'vue-router'
import { isRelogin } from '@/config/axios/service'
import { getAccessToken } from '@/utils/auth'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { useDictStoreWithOut } from '@/store/modules/dict'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { canAccessYianRoute, getCurrentYianAccess } from '@/utils/yian/access'

const { start, done } = useNProgress()
const { loadStart, loadDone } = usePageLoading()

const parseURL = (
  url: string | null | undefined
): { basePath: string; paramsObject: { [key: string]: string } } => {
  if (url == null) {
    return { basePath: '', paramsObject: {} }
  }

  const questionMarkIndex = url.indexOf('?')
  let basePath = url
  const paramsObject: { [key: string]: string } = {}

  if (questionMarkIndex !== -1) {
    basePath = url.substring(0, questionMarkIndex)
    const queryString = url.substring(questionMarkIndex + 1)
    const searchParams = new URLSearchParams(queryString)
    searchParams.forEach((value, key) => {
      paramsObject[key] = value
    })
  }

  return { basePath, paramsObject }
}

const whiteList = [
  '/login',
  '/social-login',
  '/auth-redirect',
  '/bind',
  '/register',
  '/oauthLogin/gitee'
]

router.beforeEach(async (to, from, next) => {
  start()
  loadStart()

  if (!getAccessToken()) {
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`)
    }
    return
  }

  if (to.path === '/login') {
    next({ path: '/' })
    return
  }

  const dictStore = useDictStoreWithOut()
  const userStore = useUserStoreWithOut()
  const permissionStore = usePermissionStoreWithOut()

  if (!dictStore.getIsSetDict) {
    dictStore.setDictMap().then()
  }

  if (!userStore.getIsSetUser) {
    isRelogin.show = true
    await userStore.setUserInfoAction()
    isRelogin.show = false

    await permissionStore.generateRoutes()
    permissionStore.getAddRouters.forEach((route) => {
      router.addRoute(route as unknown as RouteRecordRaw)
    })

    const access = await getCurrentYianAccess()
    if (!canAccessYianRoute(to.path, access)) {
      next('/index')
      return
    }

    const redirectPath = (from.query.redirect as string) || to.path
    const redirect = decodeURIComponent(redirectPath)
    const { paramsObject: query } = parseURL(redirect)
    const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect, query }
    next(nextData)
    return
  }

  const access = await getCurrentYianAccess()
  if (!canAccessYianRoute(to.path, access)) {
    next('/index')
    return
  }

  next()
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done()
  loadDone()
})
