import request from '@/config/axios'
import { listAssetBattery } from '@/api/yian/asset'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'

export interface AssetBatteryVO {
  id: number
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

export interface AssetImportRespVO {
  machineryCreateCodes: string[]
  machineryUpdateCodes: string[]
  batteryCreateCodes: string[]
  batteryUpdateCodes: string[]
  failureCodes: Record<string, string>
}

const mapLocalBatteryList = (): AssetBatteryVO[] => {
  const workshops = LocalDemoMesApi.listWorkshops()
  return listAssetBattery().map((item, index) => {
    const matchedWorkshop = workshops.find((workshop) => workshop.name === item.siteName) || workshops[0]
    return {
      id: index + 1,
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
    try {
      return await request.get({ url: '/yian/asset/battery/list', params })
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        return mapLocalBatteryList()
      }
      throw error
    }
  }
}
