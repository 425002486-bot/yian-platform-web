import dayjs from 'dayjs'
import { useCache } from '@/hooks/web/useCache'
import {
  MesAutoCodeRuleCode,
  MesDvMachineryStatusEnum
} from '@/views/mes/utils/constants'

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
    name: 'UAV Maintenance Workshop',
    area: 640,
    chargeUserId: 9003,
    chargeUserName: '芊道源码',
    status: 1,
    remark: '维修与建档站点'
  }
]

const seededMachineryTypes: LocalDemoMachineryTypeVO[] = [
  {
    id: 401,
    parentId: 0,
    code: 'UAV',
    name: '无人机',
    sort: 1,
    status: 1,
    remark: '资产中心主分类'
  },
  {
    id: 402,
    parentId: 401,
    code: 'UAV-MULTI',
    name: 'Multirotor UAV 多旋翼无人机',
    sort: 10,
    status: 1,
    remark: '主流巡检机型'
  },
  {
    id: 403,
    parentId: 401,
    code: 'UAV-INSPECT',
    name: 'Inspection UAV 检测无人机',
    sort: 20,
    status: 1,
    remark: '轻量化检测机型'
  }
]

const seededMachineries: LocalDemoMachineryVO[] = [
  {
    id: 1201,
    code: 'UAV-MVP-001',
    name: 'Inspection UAV 01',
    brand: 'DJI',
    specification: 'Matrice 350 RTK',
    machineryTypeId: 402,
    machineryTypeName: 'Multirotor UAV 多旋翼无人机',
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
    machineryTypeId: 403,
    machineryTypeName: 'Inspection UAV 检测无人机',
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
    machineryTypeId: 402,
    machineryTypeName: 'Multirotor UAV 多旋翼无人机',
    workshopId: 203,
    workshopName: 'UAV Maintenance Workshop',
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
    machinery: 3,
    workshop: 3,
    machineryType: 3
  }
}

const getStore = (): LocalDemoStore => {
  const cached = wsCache.get(STORAGE_KEY) as LocalDemoStore | undefined
  if (!cached) {
    wsCache.set(STORAGE_KEY, clone(seededStore))
    return clone(seededStore)
  }
  return clone(cached)
}

const setStore = (value: LocalDemoStore) => {
  wsCache.set(STORAGE_KEY, clone(value))
}

const nextCounter = (store: LocalDemoStore, key: keyof LocalDemoStore['counters']) => {
  const next = (store.counters[key] || 0) + 1
  store.counters[key] = next
  return next
}

const matchesKeyword = (value: string | undefined, keyword?: string) => {
  if (!keyword) return true
  return String(value || '')
    .toLowerCase()
    .includes(keyword.toLowerCase())
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
    const list = getStore().machineryTypes.filter(
      (item) => matchesKeyword(item.name, keyword) || matchesKeyword(item.code, keyword)
    )
    return list
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
    const count = nextCounter(store, 'machinery')
    const workshop =
      store.workshops.find((item) => item.id === payload.workshopId) || store.workshops[0]
    const type =
      store.machineryTypes.find((item) => item.id === payload.machineryTypeId) ||
      store.machineryTypes[1]
    const machinery: LocalDemoMachineryVO = {
      id: payload.id || 1200 + count,
      code:
        payload.code ||
        `UAV-${dayjs().format('YYYYMMDD')}${String(count).padStart(3, '0')}`,
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
