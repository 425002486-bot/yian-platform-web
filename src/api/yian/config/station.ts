import request from '@/config/axios'

export interface StationVO {
  id: number
  code: string
  name: string
  region: string
  principalUserId: number
  principalUserName: string
  serviceScope: string
  status: number
  remark: string
  createTime: string
}

export interface StationSaveReqVO {
  id?: number
  code: string
  name: string
  region?: string
  principalUserId?: number
  serviceScope?: string
  status: number
  remark?: string
}

export const getStationPage = (params: any) => {
  return request.get({ url: '/mes/config/station/page', params })
}

export const getStation = (id: number) => {
  return request.get({ url: '/mes/config/station/get', params: { id } })
}

export const createStation = (data: StationSaveReqVO) => {
  return request.post({ url: '/mes/config/station/create', data })
}

export const updateStation = (data: StationSaveReqVO) => {
  return request.put({ url: '/mes/config/station/update', data })
}

export const deleteStation = (id: number) => {
  return request.delete({ url: '/mes/config/station/delete', params: { id } })
}
