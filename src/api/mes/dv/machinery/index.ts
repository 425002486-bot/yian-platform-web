import request from '@/config/axios'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'

export interface DvMachineryVO {
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
  lastMaintenTime: Date | string
  lastCheckTime: Date | string
  createTime?: string | Date
  remark: string
}

const withLocalMachineryFallback = async <T>(fallback: () => T, remote: () => Promise<T>) => {
  try {
    return await remote()
  } catch (error) {
    if (isLocalMesDemoEnabled()) {
      return fallback()
    }
    throw error
  }
}

export const DvMachineryApi = {
  getMachineryPage: async (params: any) => {
    return await withLocalMachineryFallback(
      () => LocalDemoMesApi.getMachineryPage(params),
      () => request.get({ url: '/mes/dv/machinery/page', params })
    )
  },

  getMachinery: async (id: number) => {
    return await withLocalMachineryFallback(
      () => LocalDemoMesApi.getMachinery(id),
      () => request.get({ url: '/mes/dv/machinery/get?id=' + id })
    )
  },

  createMachinery: async (data: DvMachineryVO) => {
    return await withLocalMachineryFallback(
      () => LocalDemoMesApi.createMachinery(data),
      () => request.post({ url: '/mes/dv/machinery/create', data })
    )
  },

  updateMachinery: async (data: DvMachineryVO) => {
    return await withLocalMachineryFallback(
      () => LocalDemoMesApi.updateMachinery(data),
      () => request.put({ url: '/mes/dv/machinery/update', data })
    )
  },

  deleteMachinery: async (id: number) => {
    return await withLocalMachineryFallback(
      () => LocalDemoMesApi.deleteMachinery(id),
      () => request.delete({ url: '/mes/dv/machinery/delete?id=' + id })
    )
  },

  exportMachinery: async (params: any) => {
    return await request.download({ url: '/mes/dv/machinery/export-excel', params })
  },

  importTemplate: async () => {
    return await request.download({ url: '/mes/dv/machinery/get-import-template' })
  },

  importMachinery: async (file: File, updateSupport = false) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await request.upload({
      url: '/mes/dv/machinery/import',
      data: formData,
      params: { updateSupport }
    })
    return response.data
  }
}
