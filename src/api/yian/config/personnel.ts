import request from '@/config/axios'

export interface PersonnelVO {
  id: number
  userId: number
  userName: string
  mobile: string
  userStatus: number
  stationId: number
  stationName: string
  jobTitle: string
  bizRole: string
  bizRoleLabel: string
  stages: string
  createTime: string
}

export const getPersonnelPage = (params: any) => {
  return request.get({ url: '/mes/config/personnel/page', params })
}

export const getPersonnel = (id: number) => {
  return request.get({ url: '/mes/config/personnel/get', params: { id } })
}

export const createPersonnel = (data: any) => {
  return request.post({ url: '/mes/config/personnel/create', data })
}

export const updatePersonnel = (data: any) => {
  return request.put({ url: '/mes/config/personnel/update', data })
}

export const deletePersonnel = (id: number) => {
  return request.delete({ url: '/mes/config/personnel/delete', params: { id } })
}

export const getBizRoles = () => {
  return request.get({ url: '/mes/config/personnel/biz-roles' })
}

// 角色概览（含人数和权限矩阵）
export const getRoleSummary = () => {
  return request.get({ url: '/mes/config/personnel/role-summary' })
}
