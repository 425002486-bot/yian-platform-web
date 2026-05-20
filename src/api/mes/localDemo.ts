import dayjs from 'dayjs'
import { useCache } from '@/hooks/web/useCache'
import { MesAutoCodeRuleCode, MesDvMachineryStatusEnum } from '@/views/mes/utils/constants'

export interface LocalDemoWorkshopVO {
  id: number
  code: string
  name: string
  area: number
  chargeUserId: number
  chargeUserName: string
  status: number
  remark: string
}

export interface LocalDemoMachineryTypeVO {
  id: number
  parentId: number
  code: string
  name: string
  sort: number
  status: number
  remark: string
}

export interface LocalDemoMachineryVO {
  id: number
  code: string
  name: string
  brand: string
  specification: string
  machineryTypeId: number
  machineryTypeName: string
  workshopId: number
  workshopName: string
  status: number
  lastMaintenTime?: string
  lastCheckTime?: string
  createTime?: string
  remark: string
}

interface LocalDemoStore {
  workshops: LocalDemoWorkshopVO[]
  machineryTypes: LocalDemoMachineryTypeVO[]
  machineries: LocalDemoMachineryVO[]
  counters: Record<string, number>
}

const STORAGE_KEY = 'yian_mes_local_demo_v1'
const { wsCache } = useCache()

export const isLocalMesDemoEnabled = () => {
  const baseUrl = String(import.meta.env.VITE_BASE_URL || '')
  return import.meta.env.DEV && baseUrl.includes('localhost:48080')
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const AIRCRAFT_MACHINERY_TYPE_ID = 401
const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'
const LEGACY_AIRCRAFT_TYPE_IDS = new Set([402, 403])
const LEGACY_AIRCRAFT_NAME_HINTS = ['无人机', 'UAV', 'Multirotor', 'Inspection']

const defaultMachineryTypes: LocalDemoMachineryTypeVO[] = [
  {
    id: 401,
    parentId: 0,
    code: 'AIRCRAFT',
    name: '无人机整机',
    sort: 10,
    status: 1,
    remark: '无人机主机设备'
  },
  {
    id: 402,
    parentId: 0,
    code: 'REMOTE_CONTROLLER',
    name: '遥控器',
    sort: 20,
    status: 1,
    remark: '飞手操控终端'
  },
  {
    id: 403,
    parentId: 0,
    code: 'GIMBAL_PAYLOAD',
    name: '云台载荷',
    sort: 30,
    status: 1,
    remark: '相机、喊话器、探照灯等载荷'
  },
  {
    id: 404,
    parentId: 0,
    code: 'RTK_DEVICE',
    name: 'RTK设备',
    sort: 40,
    status: 1,
    remark: '定位与差分相关设备'
  },
  {
    id: 405,
    parentId: 0,
    code: 'CHARGING_DEVICE',
    name: '充电设备',
    sort: 50,
    status: 1,
    remark: '电池或整机充电配套设备'
  },
  {
    id: 406,
    parentId: 0,
    code: 'HANGAR_DOCK',
    name: '机库/机场柜',
    sort: 60,
    status: 1,
    remark: '机库、机场柜等停放保障设备'
  },
  {
    id: 407,
    parentId: 0,
    code: 'GROUND_STATION',
    name: '地面站终端',
    sort: 70,
    status: 1,
    remark: '地面站、图传与调度终端'
  }
]

const defaultMachineryTypeIdSet = new Set(defaultMachineryTypes.map((item) => item.id))

const seededWorkshops: LocalDemoWorkshopVO[] = [
  {
    id: 201,
    code: 'SITE-HZ-YH',
    name: '杭州余杭站',
    area: 1200,
    chargeUserId: 9001,
    chargeUserName: '周启明',
    status: 1,
    remark: '华东运行中心'
  },
  {
    id: 202,
    code: 'SITE-SZ-GY',
    name: '苏州工业园站',
    area: 980,
    chargeUserId: 9002,
    chargeUserName: '罗家诚',
    status: 1,
    remark: '园区巡检站点'
  },
  {
    id: 203,
    code: 'SITE-HZ-MAINT',
    name: '无人机维修中心',
    area: 640,
    chargeUserId: 9003,
    chargeUserName: '芊道源码',
    status: 1,
    remark: '维修与建档站点'
  }
]

const seededMachineryTypes: LocalDemoMachineryTypeVO[] = defaultMachineryTypes

const seededMachineries: LocalDemoMachineryVO[] = [
  {
    id: 1201,
    code: 'UAV-MVP-001',
    name: 'Inspection UAV 01',
    brand: 'DJI',
    specification: 'Matrice 350 RTK',
    machineryTypeId: AIRCRAFT_MACHINERY_TYPE_ID,
    machineryTypeName: AIRCRAFT_MACHINERY_TYPE_NAME,
    workshopId: 201,
    workshopName: '杭州余杭站',
    status: MesDvMachineryStatusEnum.MAINTENANCE,
    lastMaintenTime: '2026-05-08 16:30',
    lastCheckTime: '2026-05-10 09:10',
    createTime: '2025-11-30 10:18',
    remark: '当前存在待放行节点'
  },
  {
    id: 1202,
    code: 'UAV-MVP-002',
    name: 'Inspection UAV 02',
    brand: 'Autel',
    specification: 'EVO Max 4T',
    machineryTypeId: AIRCRAFT_MACHINERY_TYPE_ID,
    machineryTypeName: AIRCRAFT_MACHINERY_TYPE_NAME,
    workshopId: 202,
    workshopName: '苏州工业园站',
    status: MesDvMachineryStatusEnum.PRODUCING,
    lastMaintenTime: '2026-04-06 14:00',
    lastCheckTime: '2026-05-09 17:20',
    createTime: '2026-04-01 16:40',
    remark: '命中电池寿命预警'
  },
  {
    id: 1203,
    code: 'UAV-IMPORT-101',
    name: 'E2E Host 101',
    brand: 'DJI',
    specification: 'M350 RTK',
    machineryTypeId: AIRCRAFT_MACHINERY_TYPE_ID,
    machineryTypeName: AIRCRAFT_MACHINERY_TYPE_NAME,
    workshopId: 203,
    workshopName: '无人机维修中心',
    status: MesDvMachineryStatusEnum.STOP,
    lastMaintenTime: '2026-05-12 18:22',
    lastCheckTime: '',
    createTime: '2026-05-14 08:25',
    remark: '待补录建档资料'
  }
]

const seededStore: LocalDemoStore = {
  workshops: seededWorkshops,
  machineryTypes: seededMachineryTypes,
  machineries: seededMachineries,
  counters: {
    machinery: seededMachineries.length,
    workshop: seededWorkshops.length,
    machineryType: defaultMachineryTypes.length
  }
}

const matchesKeyword = (value: string | undefined, keyword?: string) => {
  if (!keyword) return true
  return String(value || '')
    .toLowerCase()
    .includes(keyword.toLowerCase())
}

const isLegacyAircraftTypeName = (value?: string) =>
  LEGACY_AIRCRAFT_NAME_HINTS.some((hint) => String(value || '').includes(hint))

const normalizeMachineryTypes = (types: LocalDemoMachineryTypeVO[]) => {
  const customTypes = types.filter((item) => !defaultMachineryTypeIdSet.has(item.id))
  return [...defaultMachineryTypes.map((item) => ({ ...item })), ...customTypes]
}

const normalizeMachineryRecord = (
  machinery: LocalDemoMachineryVO,
  machineryTypes: LocalDemoMachineryTypeVO[]
): LocalDemoMachineryVO => {
  const next = { ...machinery }
  const matchedType = machineryTypes.find((item) => item.id === next.machineryTypeId)

  if (
    LEGACY_AIRCRAFT_TYPE_IDS.has(next.machineryTypeId) &&
    next.machineryTypeName !== matchedType?.name &&
    isLegacyAircraftTypeName(next.machineryTypeName)
  ) {
    next.machineryTypeId = AIRCRAFT_MACHINERY_TYPE_ID
    next.machineryTypeName = AIRCRAFT_MACHINERY_TYPE_NAME
    return next
  }

  if (!matchedType && isLegacyAircraftTypeName(next.machineryTypeName)) {
    next.machineryTypeId = AIRCRAFT_MACHINERY_TYPE_ID
    next.machineryTypeName = AIRCRAFT_MACHINERY_TYPE_NAME
    return next
  }

  if (matchedType) {
    next.machineryTypeName = matchedType.name
  }

  return next
}

const ensureStoreDefaults = (store: LocalDemoStore): LocalDemoStore => {
  const nextStore = clone(store)
  nextStore.machineryTypes = normalizeMachineryTypes(nextStore.machineryTypes)
  nextStore.machineries = nextStore.machineries.map((item) =>
    normalizeMachineryRecord(item, nextStore.machineryTypes)
  )
  nextStore.counters = {
    machinery: Math.max(nextStore.counters.machinery || 0, nextStore.machineries.length),
    workshop: Math.max(nextStore.counters.workshop || 0, nextStore.workshops.length),
    machineryType: Math.max(
      nextStore.counters.machineryType || 0,
      nextStore.machineryTypes.length
    )
  }
  return nextStore
}

const setStore = (value: LocalDemoStore) => {
  wsCache.set(STORAGE_KEY, clone(value))
}

const getStore = (): LocalDemoStore => {
  const cached = wsCache.get(STORAGE_KEY) as LocalDemoStore | undefined
  const normalizedStore = ensureStoreDefaults(cached || seededStore)
  setStore(normalizedStore)
  return clone(normalizedStore)
}

const nextCounter = (store: LocalDemoStore, key: keyof LocalDemoStore['counters']) => {
  const next = (store.counters[key] || 0) + 1
  store.counters[key] = next
  return next
}

const normalizeIdentityValue = (value?: string) => String(value || '').trim().toUpperCase()

const ensureMachineryCodeUnique = (
  store: LocalDemoStore,
  payload: Partial<LocalDemoMachineryVO>
) => {
  const nextCode = normalizeIdentityValue(payload.code)
  if (!nextCode) return
  const duplicated = store.machineries.find(
    (item) => item.id !== payload.id && normalizeIdentityValue(item.code) === nextCode
  )
  if (duplicated) {
    throw new Error(`设备编号重复：${payload.code}`)
  }
}

export const LocalDemoMesApi = {
  listWorkshops: () => getStore().workshops,

  getWorkshopPage: (params: Record<string, any> = {}) => {
    const keyword = String(params.name || params.code || '').trim()
    const list = getStore().workshops.filter(
      (item) => matchesKeyword(item.name, keyword) || matchesKeyword(item.code, keyword)
    )
    return {
      list,
      total: list.length
    }
  },

  getWorkshop: (id: number) => getStore().workshops.find((item) => item.id === id) || null,

  createWorkshop: (payload: Partial<LocalDemoWorkshopVO>) => {
    const store = getStore()
    const count = nextCounter(store, 'workshop')
    const workshop: LocalDemoWorkshopVO = {
      id: payload.id || 300 + count,
      code: payload.code || `SITE-${dayjs().format('YYYYMMDD')}-${String(count).padStart(3, '0')}`,
      name: payload.name || `站点-${count}`,
      area: payload.area || 0,
      chargeUserId: payload.chargeUserId || 0,
      chargeUserName: payload.chargeUserName || '',
      status: payload.status ?? 1,
      remark: payload.remark || ''
    }
    store.workshops.unshift(workshop)
    setStore(store)
    return workshop.id
  },

  updateWorkshop: (payload: Partial<LocalDemoWorkshopVO>) => {
    const store = getStore()
    const index = store.workshops.findIndex((item) => item.id === payload.id)
    if (index < 0) return false
    store.workshops[index] = {
      ...store.workshops[index],
      ...payload
    } as LocalDemoWorkshopVO
    store.machineries = store.machineries.map((item) =>
      item.workshopId === payload.id
        ? {
            ...item,
            workshopName: payload.name || item.workshopName
          }
        : item
    )
    setStore(store)
    return true
  },

  deleteWorkshop: (id: number) => {
    const store = getStore()
    store.workshops = store.workshops.filter((item) => item.id !== id)
    setStore(store)
    return true
  },

  listMachineryTypes: () => getStore().machineryTypes,

  getMachineryTypeList: (params: Record<string, any> = {}) => {
    const keyword = String(params.name || params.code || '').trim()
    return getStore().machineryTypes.filter(
      (item) => matchesKeyword(item.name, keyword) || matchesKeyword(item.code, keyword)
    )
  },

  getMachineryType: (id: number) =>
    getStore().machineryTypes.find((item) => item.id === id) || null,

  createMachineryType: (payload: Partial<LocalDemoMachineryTypeVO>) => {
    const store = getStore()
    const count = nextCounter(store, 'machineryType')
    const type: LocalDemoMachineryTypeVO = {
      id: payload.id || 500 + count,
      parentId: payload.parentId ?? 0,
      code:
        payload.code || `TYPE-${dayjs().format('YYYYMMDD')}-${String(count).padStart(3, '0')}`,
      name: payload.name || `设备类型-${count}`,
      sort: payload.sort ?? count,
      status: payload.status ?? 1,
      remark: payload.remark || ''
    }
    store.machineryTypes.push(type)
    setStore(store)
    return type.id
  },

  updateMachineryType: (payload: Partial<LocalDemoMachineryTypeVO>) => {
    const store = getStore()
    const index = store.machineryTypes.findIndex((item) => item.id === payload.id)
    if (index < 0) return false
    store.machineryTypes[index] = {
      ...store.machineryTypes[index],
      ...payload
    } as LocalDemoMachineryTypeVO
    store.machineries = store.machineries.map((item) =>
      item.machineryTypeId === payload.id
        ? {
            ...item,
            machineryTypeName: payload.name || item.machineryTypeName
          }
        : item
    )
    setStore(store)
    return true
  },

  deleteMachineryType: (id: number) => {
    const store = getStore()
    store.machineryTypes = store.machineryTypes.filter((item) => item.id !== id)
    setStore(store)
    return true
  },

  getMachineryPage: (params: Record<string, any> = {}) => {
    const pageNo = Number(params.pageNo || 1)
    const pageSize = Number(params.pageSize || 10)
    const code = String(params.code || '').trim()
    const name = String(params.name || '').trim()
    const workshopId = params.workshopId ? Number(params.workshopId) : undefined
    const status = params.status ? Number(params.status) : undefined
    const all = getStore().machineries.filter((item) => {
      if (!matchesKeyword(item.code, code)) return false
      if (!matchesKeyword(item.name, name)) return false
      if (workshopId && item.workshopId !== workshopId) return false
      if (status && item.status !== status) return false
      return true
    })
    const start = Math.max((pageNo - 1) * pageSize, 0)
    return {
      list: all.slice(start, start + pageSize),
      total: all.length
    }
  },

  getMachinery: (id: number) => getStore().machineries.find((item) => item.id === id) || null,

  createMachinery: (payload: Partial<LocalDemoMachineryVO>) => {
    const store = getStore()
    ensureMachineryCodeUnique(store, payload)
    const count = nextCounter(store, 'machinery')
    const workshop =
      store.workshops.find((item) => item.id === payload.workshopId) || store.workshops[0]
    const type =
      store.machineryTypes.find((item) => item.id === payload.machineryTypeId) ||
      store.machineryTypes[0]
    const machinery: LocalDemoMachineryVO = {
      id: payload.id || 1200 + count,
      code: payload.code || `UAV-${dayjs().format('YYYYMMDD')}${String(count).padStart(3, '0')}`,
      name: payload.name || `Inspection UAV ${count}`,
      brand: payload.brand || '',
      specification: payload.specification || '',
      machineryTypeId: type?.id || 0,
      machineryTypeName: payload.machineryTypeName || type?.name || '',
      workshopId: workshop?.id || 0,
      workshopName: payload.workshopName || workshop?.name || '',
      status: payload.status ?? MesDvMachineryStatusEnum.PRODUCING,
      lastMaintenTime: payload.lastMaintenTime || '',
      lastCheckTime: payload.lastCheckTime || '',
      createTime: payload.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: payload.remark || ''
    }
    store.machineries.unshift(machinery)
    setStore(store)
    return machinery.id
  },

  updateMachinery: (payload: Partial<LocalDemoMachineryVO>) => {
    const store = getStore()
    ensureMachineryCodeUnique(store, payload)
    const index = store.machineries.findIndex((item) => item.id === payload.id)
    if (index < 0) return false
    const workshop = payload.workshopId
      ? store.workshops.find((item) => item.id === payload.workshopId)
      : undefined
    const type = payload.machineryTypeId
      ? store.machineryTypes.find((item) => item.id === payload.machineryTypeId)
      : undefined
    store.machineries[index] = {
      ...store.machineries[index],
      ...payload,
      workshopName: payload.workshopName || workshop?.name || store.machineries[index].workshopName,
      machineryTypeName:
        payload.machineryTypeName || type?.name || store.machineries[index].machineryTypeName
    } as LocalDemoMachineryVO
    setStore(store)
    return true
  },

  deleteMachinery: (id: number) => {
    const store = getStore()
    store.machineries = store.machineries.filter((item) => item.id !== id)
    setStore(store)
    return true
  },

  generateAutoCode: (ruleCode: string, inputChar?: string) => {
    const store = getStore()
    if (ruleCode === MesAutoCodeRuleCode.DV_MACHINERY_CODE) {
      const count = nextCounter(store, 'machinery')
      setStore(store)
      return `UAV-${dayjs().format('YYYYMMDD')}${String(count).padStart(3, '0')}`
    }
    if (ruleCode === MesAutoCodeRuleCode.MD_WORKSHOP_CODE) {
      const count = nextCounter(store, 'workshop')
      setStore(store)
      return `SITE-${dayjs().format('YYYYMMDD')}-${String(count).padStart(3, '0')}`
    }
    if (ruleCode === MesAutoCodeRuleCode.DV_MACHINERY_TYPE_CODE) {
      const count = nextCounter(store, 'machineryType')
      setStore(store)
      return `TYPE-${dayjs().format('YYYYMMDD')}-${String(count).padStart(3, '0')}`
    }
    return `${inputChar || ruleCode.slice(0, 6)}-${dayjs().format('YYYYMMDDHHmmss')}`
  }
}
