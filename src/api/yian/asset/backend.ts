import request from '@/config/axios'

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

export const YianAssetApi = {
  importTemplate: async () => {
    return await request.download({ url: '/yian/asset/import-template' })
  },

  importAssets: async (file: File, updateSupport = false) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await request.upload({
      url: '/yian/asset/import',
      data: formData,
      params: { updateSupport }
    })
    return response.data as AssetImportRespVO
  },

  getBatteryList: async (params?: Record<string, unknown>) => {
    return await request.get({ url: '/yian/asset/battery/list', params })
  }
}
