import request from '@/config/axios'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'

export interface DvMachineryTypeVO {
  id: number
  parentId: number
  code: string
  name: string
  sort: number
  status: number
  remark: string
}

const withLocalMachineryTypeFallback = async <T>(fallback: () => T, remote: () => Promise<T>) => {
  try {
    return await remote()
  } catch (error) {
    if (isLocalMesDemoEnabled()) {
      return fallback()
    }
    throw error
  }
}

export const DvMachineryTypeApi = {
  getMachineryTypeList: async (params?: any) => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.getMachineryTypeList(params),
      () => request.get({ url: '/mes/dv/machinery-type/list', params })
    )
  },

  getMachineryTypeSimpleList: async () => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.listMachineryTypes(),
      () => request.get({ url: '/mes/dv/machinery-type/simple-list' })
    )
  },

  getMachineryType: async (id: number) => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.getMachineryType(id),
      () => request.get({ url: '/mes/dv/machinery-type/get?id=' + id })
    )
  },

  createMachineryType: async (data: DvMachineryTypeVO) => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.createMachineryType(data),
      () => request.post({ url: '/mes/dv/machinery-type/create', data })
    )
  },

  updateMachineryType: async (data: DvMachineryTypeVO) => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.updateMachineryType(data),
      () => request.put({ url: '/mes/dv/machinery-type/update', data })
    )
  },

  deleteMachineryType: async (id: number) => {
    return await withLocalMachineryTypeFallback(
      () => LocalDemoMesApi.deleteMachineryType(id),
      () => request.delete({ url: '/mes/dv/machinery-type/delete?id=' + id })
    )
  }
}
