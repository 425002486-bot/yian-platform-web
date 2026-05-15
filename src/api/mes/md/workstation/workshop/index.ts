import request from '@/config/axios'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'

export interface MdWorkshopVO {
  id: number
  code: string
  name: string
  area: number
  chargeUserId: number
  chargeUserName: string
  status: number
  remark: string
}

const withLocalWorkshopFallback = async <T>(fallback: () => T, remote: () => Promise<T>) => {
  try {
    return await remote()
  } catch (error) {
    if (isLocalMesDemoEnabled()) {
      return fallback()
    }
    throw error
  }
}

export const MdWorkshopApi = {
  getWorkshopPage: async (params: any) => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.getWorkshopPage(params),
      () => request.get({ url: '/mes/md-workshop/page', params })
    )
  },

  getWorkshopSimpleList: async () => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.listWorkshops(),
      () => request.get({ url: '/mes/md-workshop/simple-list' })
    )
  },

  getWorkshop: async (id: number) => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.getWorkshop(id),
      () => request.get({ url: '/mes/md-workshop/get?id=' + id })
    )
  },

  createWorkshop: async (data: MdWorkshopVO) => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.createWorkshop(data),
      () => request.post({ url: '/mes/md-workshop/create', data })
    )
  },

  updateWorkshop: async (data: MdWorkshopVO) => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.updateWorkshop(data),
      () => request.put({ url: '/mes/md-workshop/update', data })
    )
  },

  deleteWorkshop: async (id: number) => {
    return await withLocalWorkshopFallback(
      () => LocalDemoMesApi.deleteWorkshop(id),
      () => request.delete({ url: '/mes/md-workshop/delete?id=' + id })
    )
  },

  exportWorkshop: async (params: any) => {
    return await request.download({ url: '/mes/md-workshop/export-excel', params })
  }
}
