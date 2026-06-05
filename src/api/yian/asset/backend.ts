import request from '@/config/axios'
import { listAssetBattery } from '@/api/yian/asset'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'
import { evaluateBatteryRule, syncRuleRuntimeConfig } from '@/api/yian/config/rule'
import { useCache } from '@/hooks/web/useCache'

export interface AssetBatteryVO {
  id: number
  createTime?: string
  batteryCode: string
  serialNumber: string
  model: string
  workshopId: number
  workshopName: string
  linkedDeviceId?: number
  linkedDeviceCode?: string
  linkedDeviceName?: string
  soh: number
  cycleCount: number
  lastCheckTime?: string
  lastCheckAt?: string
  checkSource: string
  healthStatus: 'normal' | 'warning' | 'danger'
  healthLabel: string
  sourceEvidence: string
  recommendation: string
  remark?: string
}

export interface AssetBatterySaveReqVO {
  id?: number
  batteryCode: string
  serialNumber: string
  model: string
  workshopId: number
  linkedDeviceId?: number
  soh?: number
  cycleCount?: number
  lastCheckTime?: string
  checkSource?: string
  healthStatus?: 'normal' | 'warning' | 'danger'
  sourceEvidence?: string
  recommendation?: string
  remark?: string
}

export interface AssetImportRespVO {
  machineryCreateCodes: string[]
  machineryUpdateCodes: string[]
  batteryCreateCodes: string[]
  batteryUpdateCodes: string[]
  failureCodes: Record<string, string>
}

const BATTERY_ARCHIVE_STORAGE_KEY = 'yian_asset_battery_archive_v1'
const { wsCache } = useCache()

const normalizeBatteryCode = (value?: string) => String(value || '').trim().toUpperCase()

const cloneBatteryRecord = (item: AssetBatteryVO): AssetBatteryVO => ({ ...item })

const resolveBatteryUpdateTime = (item?: Partial<AssetBatteryVO>) =>
  new Date(item?.lastCheckAt || item?.lastCheckTime || item?.createTime || 0).getTime()

const mergeBatteryRecordPreferRemote = (
  remote: AssetBatteryVO,
  local?: AssetBatteryVO
): AssetBatteryVO => {
  if (!local) {
    return cloneBatteryRecord(remote)
  }
  const preferLocalHealth = resolveBatteryUpdateTime(local) > resolveBatteryUpdateTime(remote)
  return {
    ...local,
    ...remote,
    createTime: remote.createTime || local.createTime,
    workshopName: remote.workshopName || local.workshopName,
    linkedDeviceId: remote.linkedDeviceId ?? local.linkedDeviceId,
    linkedDeviceCode: remote.linkedDeviceCode || local.linkedDeviceCode,
    linkedDeviceName: remote.linkedDeviceName || local.linkedDeviceName,
    soh: preferLocalHealth ? local.soh : remote.soh,
    cycleCount: preferLocalHealth ? local.cycleCount : remote.cycleCount,
    lastCheckTime: preferLocalHealth ? local.lastCheckTime || remote.lastCheckTime : remote.lastCheckTime,
    lastCheckAt: preferLocalHealth ? local.lastCheckAt || remote.lastCheckAt : remote.lastCheckAt,
    checkSource: preferLocalHealth ? local.checkSource || remote.checkSource : remote.checkSource,
    healthStatus: preferLocalHealth ? local.healthStatus || remote.healthStatus : remote.healthStatus || local.healthStatus,
    healthLabel: preferLocalHealth ? local.healthLabel || remote.healthLabel : remote.healthLabel || local.healthLabel,
    sourceEvidence: preferLocalHealth
      ? local.sourceEvidence || remote.sourceEvidence
      : remote.sourceEvidence || local.sourceEvidence,
    recommendation: preferLocalHealth
      ? local.recommendation || remote.recommendation
      : remote.recommendation || local.recommendation,
    remark: remote.remark || local.remark
  }
}

const projectBatteryRule = (
  payload: Pick<AssetBatteryVO, 'soh' | 'lastCheckAt' | 'lastCheckTime' | 'checkSource' | 'recommendation'>
) =>
  evaluateBatteryRule({
    soh: payload.soh,
    lastCheckAt: payload.lastCheckAt || payload.lastCheckTime,
    checkSource: payload.checkSource,
    recommendation: payload.recommendation
  })

const buildHealthLabel = (healthStatus?: AssetBatteryVO['healthStatus']) => {
  if (healthStatus === 'danger') return '禁止放行'
  if (healthStatus === 'warning') return '寿命预警'
  return '状态正常'
}

const getBatteryArchiveStore = (): AssetBatteryVO[] =>
  ((wsCache.get(BATTERY_ARCHIVE_STORAGE_KEY) as AssetBatteryVO[] | undefined) || []).map(
    cloneBatteryRecord
  )

const setBatteryArchiveStore = (value: AssetBatteryVO[]) => {
  wsCache.set(
    BATTERY_ARCHIVE_STORAGE_KEY,
    value.map((item) => cloneBatteryRecord(item))
  )
}

const mergeRemoteBatteryArchive = (list: AssetBatteryVO[], retainArchiveOnly = false) => {
  const mergedMap = new Map<string, AssetBatteryVO>()
  if (retainArchiveOnly) {
    getBatteryArchiveStore().forEach((item) => {
      mergedMap.set(normalizeBatteryCode(item.batteryCode), cloneBatteryRecord(item))
    })
  }
  list.forEach((item) => {
    const code = normalizeBatteryCode(item.batteryCode)
    mergedMap.set(code, mergeBatteryRecordPreferRemote(item, mergedMap.get(code)))
  })
  const nextStore = Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = new Date(a.createTime || a.lastCheckAt || a.lastCheckTime || 0).getTime()
    const timeB = new Date(b.createTime || b.lastCheckAt || b.lastCheckTime || 0).getTime()
    return timeB - timeA
  })
  setBatteryArchiveStore(nextStore)
}

const buildSeedBatteryList = (): AssetBatteryVO[] => {
  const workshops = LocalDemoMesApi.listWorkshops()
  return listAssetBattery().map((item, index) => {
    const matchedWorkshop = workshops.find((workshop) => workshop.name === item.siteName) || workshops[0]
    return {
      id: index + 1,
      createTime: item.lastCheckAt,
      batteryCode: item.batteryCode,
      serialNumber: item.serialNumber,
      model: item.model,
      workshopId: matchedWorkshop?.id || 0,
      workshopName: item.siteName,
      linkedDeviceId: item.linkedDeviceId,
      linkedDeviceCode: item.linkedDeviceCode,
      linkedDeviceName: item.linkedDeviceName,
      soh: item.soh,
      cycleCount: item.cycleCount,
      lastCheckTime: item.lastCheckAt,
      lastCheckAt: item.lastCheckAt,
      checkSource: item.checkSource,
      healthStatus: item.healthStatus,
      healthLabel: item.healthLabel,
      sourceEvidence: item.sourceEvidence,
      recommendation: item.recommendation,
      remark: ''
    }
  })
}

const mergeBatteryArchiveList = (baseList: AssetBatteryVO[], includeArchiveOnly = false): AssetBatteryVO[] => {
  const mergedMap = new Map<string, AssetBatteryVO>()
  baseList.forEach((item) => {
    mergedMap.set(normalizeBatteryCode(item.batteryCode), cloneBatteryRecord(item))
  })
  getBatteryArchiveStore().forEach((item) => {
    const code = normalizeBatteryCode(item.batteryCode)
    const current = mergedMap.get(code)
    if (!current) {
      if (includeArchiveOnly) {
        mergedMap.set(code, cloneBatteryRecord(item))
      }
      return
    }
    mergedMap.set(code, mergeBatteryRecordPreferRemote(current, item))
  })
  return Array.from(mergedMap.values())
}

const getMergedLocalBatteryList = () => mergeBatteryArchiveList(buildSeedBatteryList(), true)

const applyBatteryRule = (item: AssetBatteryVO): AssetBatteryVO => {
  const outcome = projectBatteryRule(item)
  return {
    ...item,
    healthStatus: outcome.healthStatus,
    healthLabel: outcome.healthLabel,
    recommendation: outcome.recommendation
  }
}

const buildLocalBatteryRecord = (
  payload: AssetBatterySaveReqVO,
  id: number,
  current?: AssetBatteryVO
): AssetBatteryVO => {
  const workshop =
    LocalDemoMesApi.getWorkshop(payload.workshopId) || LocalDemoMesApi.listWorkshops()[0] || null
  const linkedDevice = payload.linkedDeviceId
    ? LocalDemoMesApi.getMachinery(payload.linkedDeviceId)
    : null
  const lastCheckValue = payload.lastCheckTime || current?.lastCheckAt || current?.lastCheckTime
  const projectedRule = projectBatteryRule({
    soh: payload.soh ?? current?.soh ?? 100,
    lastCheckAt: lastCheckValue,
    lastCheckTime: lastCheckValue,
    checkSource: payload.checkSource || current?.checkSource || '',
    recommendation: payload.recommendation || current?.recommendation || ''
  })
  const healthStatus = payload.healthStatus || projectedRule.healthStatus

  return {
    id,
    createTime: current?.createTime || new Date().toISOString(),
    batteryCode: payload.batteryCode,
    serialNumber: payload.serialNumber,
    model: payload.model,
    workshopId: payload.workshopId,
    workshopName: workshop?.name || current?.workshopName || '',
    linkedDeviceId: payload.linkedDeviceId,
    linkedDeviceCode:
      linkedDevice?.code ||
      (payload.linkedDeviceId ? current?.linkedDeviceCode : undefined) ||
      undefined,
    linkedDeviceName:
      linkedDevice?.name ||
      (payload.linkedDeviceId ? current?.linkedDeviceName : undefined) ||
      undefined,
    soh: payload.soh ?? current?.soh ?? 100,
    cycleCount: payload.cycleCount ?? current?.cycleCount ?? 0,
    lastCheckTime: lastCheckValue,
    lastCheckAt: lastCheckValue,
    checkSource: payload.checkSource || current?.checkSource || '',
    healthStatus,
    healthLabel: projectedRule.healthLabel,
    sourceEvidence: payload.sourceEvidence || current?.sourceEvidence || '',
    recommendation: projectedRule.recommendation,
    remark: payload.remark || current?.remark || ''
  }
}

const upsertLocalBatteryRecord = (payload: AssetBatterySaveReqVO) => {
  const store = getBatteryArchiveStore()
  const current = store.find(
    (item) =>
      item.id === payload.id || normalizeBatteryCode(item.batteryCode) === normalizeBatteryCode(payload.batteryCode)
  )
  const nextId =
    payload.id ||
    current?.id ||
    Math.max(0, ...getMergedLocalBatteryList().map((item) => Number(item.id) || 0)) + 1
  const nextRecord = buildLocalBatteryRecord(payload, nextId, current)
  const nextStore = store.filter(
    (item) => normalizeBatteryCode(item.batteryCode) !== normalizeBatteryCode(nextRecord.batteryCode)
  )
  nextStore.unshift(nextRecord)
  setBatteryArchiveStore(nextStore)
  return nextRecord
}

export const YianAssetApi = {
  importTemplate: async () => {
    return await request.download({ url: '/yian/asset/import-template' })
  },

  importAssets: async (file: File, updateSupport = false) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await request.upload({
        url: '/yian/asset/import',
        data: formData,
        params: { updateSupport }
      })
      return response.data as AssetImportRespVO
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        return {
          machineryCreateCodes: [],
          machineryUpdateCodes: [],
          batteryCreateCodes: [],
          batteryUpdateCodes: [],
          failureCodes: {
            [file.name]:
              '本地演示模式未接入真实导入解析，请先使用“单个录入”完成设备建档。'
          }
        } satisfies AssetImportRespVO
      }
      throw error
    }
  },

  getBatteryList: async (params?: Record<string, unknown>) => {
    await syncRuleRuntimeConfig()
    if (isLocalMesDemoEnabled()) {
      return getMergedLocalBatteryList().map(applyBatteryRule)
    }
    try {
      const response = (await request.get({ url: '/yian/asset/battery/list', params })) as AssetBatteryVO[]
      const mergedList = mergeBatteryArchiveList(response || [], false)
      mergeRemoteBatteryArchive(mergedList, false)
      return mergedList
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        return getMergedLocalBatteryList().map(applyBatteryRule)
      }
      throw error
    }
  },

  getBattery: async (id: number) => {
    await syncRuleRuntimeConfig()
    if (isLocalMesDemoEnabled()) {
      const matched = getMergedLocalBatteryList().find((item) => item.id === id)
      if (matched) {
        return applyBatteryRule(cloneBatteryRecord(matched))
      }
      throw new Error('未找到对应电池档案')
    }

    try {
      const response = (await request.get({
        url: '/yian/asset/battery/get',
        params: { id }
      })) as AssetBatteryVO | null
      if (response) {
        const localOverride = getBatteryArchiveStore().find(
          (item) =>
            item.id === response.id ||
            normalizeBatteryCode(item.batteryCode) === normalizeBatteryCode(response.batteryCode)
        )
        const nextRecord = mergeBatteryRecordPreferRemote(response, localOverride)
        mergeRemoteBatteryArchive([nextRecord])
        return nextRecord
      }
    } catch (error) {
      if (!isLocalMesDemoEnabled()) {
        throw error
      }
    }

    throw new Error('未找到对应电池档案')
  },

  createBattery: async (data: AssetBatterySaveReqVO) => {
    if (isLocalMesDemoEnabled()) {
      return upsertLocalBatteryRecord(data).id
    }

    try {
      const response = await request.post({ url: '/yian/asset/battery/create', data })
      const nextId = typeof response === 'number' ? response : undefined
      upsertLocalBatteryRecord({ ...data, id: nextId })
      return response
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        return upsertLocalBatteryRecord(data).id
      }
      throw error
    }
  },

  updateBattery: async (data: AssetBatterySaveReqVO) => {
    if (isLocalMesDemoEnabled()) {
      upsertLocalBatteryRecord(data)
      return true
    }

    try {
      const response = await request.put({ url: '/yian/asset/battery/update', data })
      upsertLocalBatteryRecord(data)
      return response
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        upsertLocalBatteryRecord(data)
        return true
      }
      throw error
    }
  }
}
