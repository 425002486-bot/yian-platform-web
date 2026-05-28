import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  getCurrentAccess,
  type YianCurrentAccessVO,
  type YianPermissionLevel
} from '@/api/yian/config/personnel'

const { wsCache } = useCache()

export type YianPermissionKey =
  | 'asset'
  | 'intake'
  | 'repair'
  | 'parts'
  | 'inspect'
  | 'release'
  | 'audit'
  | 'config'

const ACCESS_CACHE_KEY = 'yian_current_access_v1'
const LEVEL_WEIGHT: Record<YianPermissionLevel, number> = {
  none: 0,
  view: 1,
  exec: 2
}

const DEFAULT_ACCESS: YianCurrentAccessVO = {
  userId: null,
  userName: null,
  bizRole: null,
  bizRoleLabel: null,
  stationId: null,
  stationName: null,
  permissions: {
    asset: 'none',
    intake: 'none',
    repair: 'none',
    parts: 'none',
    inspect: 'none',
    release: 'none',
    audit: 'none',
    config: 'none'
  }
}

let currentAccessPromise: Promise<YianCurrentAccessVO> | null = null

const isEmptyPermissionMap = (permissions?: Record<string, YianPermissionLevel>) =>
  !permissions || Object.values(permissions).every((level) => level === 'none')

const normalizeAccess = (payload?: Partial<YianCurrentAccessVO> | null): YianCurrentAccessVO => ({
  ...DEFAULT_ACCESS,
  ...payload,
  permissions: {
    ...DEFAULT_ACCESS.permissions,
    ...(payload?.permissions || {})
  }
})

export const getCachedYianAccess = () => {
  const cached = wsCache.get(ACCESS_CACHE_KEY) as YianCurrentAccessVO | undefined
  return cached ? normalizeAccess(cached) : normalizeAccess()
}

export const clearYianAccessCache = () => {
  wsCache.delete(ACCESS_CACHE_KEY)
  currentAccessPromise = null
}

export const getCurrentYianAccess = async (force = false) => {
  if (!force) {
    const cached = wsCache.get(ACCESS_CACHE_KEY) as YianCurrentAccessVO | undefined
    if (cached) {
      const normalized = normalizeAccess(cached)
      if (!isEmptyPermissionMap(normalized.permissions)) {
        return normalized
      }
    }
  }

  if (!currentAccessPromise || force) {
    currentAccessPromise = getCurrentAccess()
      .then((data) => {
        const normalized = normalizeAccess(data)
        wsCache.set(ACCESS_CACHE_KEY, normalized)
        return normalized
      })
      .catch(() => normalizeAccess())
      .finally(() => {
        currentAccessPromise = null
      })
  }

  return currentAccessPromise
}

export const hasYianPermission = (
  access: YianCurrentAccessVO | null | undefined,
  permission: YianPermissionKey,
  level: YianPermissionLevel = 'view'
) => {
  const currentLevel = (access?.permissions?.[permission] || 'none') as YianPermissionLevel
  return LEVEL_WEIGHT[currentLevel] >= LEVEL_WEIGHT[level]
}

const matchesAnyPermission = (
  access: YianCurrentAccessVO | null | undefined,
  permissions: Array<{ key: YianPermissionKey; level?: YianPermissionLevel }>
) => permissions.some((item) => hasYianPermission(access, item.key, item.level || 'view'))

export const canAccessYianRoute = (
  path: string,
  access: YianCurrentAccessVO | null | undefined = getCachedYianAccess()
) => {
  if (!path.startsWith('/')) {
    return true
  }
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return true
  }
  if (path === '/asset') {
    return matchesAnyPermission(access, [
      { key: 'asset', level: 'view' },
      { key: 'inspect', level: 'view' }
    ])
  }
  if (path.startsWith('/asset/device') || path.startsWith('/asset/battery')) {
    return matchesAnyPermission(access, [{ key: 'asset', level: 'view' }])
  }
  if (path.startsWith('/asset/inspection')) {
    return matchesAnyPermission(access, [{ key: 'inspect', level: 'view' }])
  }
  if (path.startsWith('/asset/import')) {
    return matchesAnyPermission(access, [{ key: 'asset', level: 'exec' }])
  }
  if (path === '/workorder' || path.startsWith('/workorder/board') || path.startsWith('/workorder/list')) {
    return matchesAnyPermission(access, [
      { key: 'intake', level: 'view' },
      { key: 'repair', level: 'view' },
      { key: 'parts', level: 'view' },
      { key: 'inspect', level: 'view' },
      { key: 'release', level: 'view' }
    ])
  }
  if (path.startsWith('/workorder/create')) {
    return matchesAnyPermission(access, [{ key: 'intake', level: 'exec' }])
  }
  if (path.startsWith('/workorder/detail')) {
    return matchesAnyPermission(access, [
      { key: 'intake', level: 'view' },
      { key: 'repair', level: 'view' },
      { key: 'parts', level: 'view' },
      { key: 'inspect', level: 'view' },
      { key: 'release', level: 'view' }
    ])
  }
  if (path === '/inventory' || path.startsWith('/inventory/')) {
    return matchesAnyPermission(access, [{ key: 'parts', level: 'view' }])
  }
  if (path === '/audit' || path.startsWith('/audit/')) {
    return matchesAnyPermission(access, [{ key: 'audit', level: 'view' }])
  }
  if (path === '/config' || path.startsWith('/config/')) {
    return matchesAnyPermission(access, [{ key: 'config', level: 'exec' }])
  }
  return true
}

const filterMenusRecursively = (menus: AppCustomRouteRecordRaw[], access: YianCurrentAccessVO) =>
  menus
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenusRecursively(menu.children as AppCustomRouteRecordRaw[], access) : []
    }))
    .filter((menu) => {
      if (!canAccessYianRoute(menu.path, access)) {
        return false
      }
      if (!menu.children?.length) {
        return true
      }
      return menu.alwaysShow || menu.children.length > 0
    })

export const filterYianMenusByAccess = async (menus: AppCustomRouteRecordRaw[]) => {
  const access = await getCurrentYianAccess()
  return filterMenusRecursively(menus, access)
}

export const getCurrentUserBizRole = async () => {
  const userStore = useUserStoreWithOut()
  if (!userStore.getIsSetUser && !wsCache.get(CACHE_KEY.USER)) {
    return normalizeAccess()
  }
  return getCurrentYianAccess()
}
