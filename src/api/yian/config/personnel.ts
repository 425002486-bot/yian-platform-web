import request from '@/config/axios'
import { config } from '@/config/axios/config'
import { getAccessToken, getTenantId, getVisitTenantId } from '@/utils/auth'

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

export type YianPermissionLevel = 'exec' | 'view' | 'none'

export interface YianCurrentAccessVO {
  userId: number | null
  userName: string | null
  bizRole: string | null
  bizRoleLabel: string | null
  stationId: number | null
  stationName: string | null
  permissions: Record<string, YianPermissionLevel>
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

export const getCurrentAccess = async (): Promise<YianCurrentAccessVO | null> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const accessToken = getAccessToken()
  const tenantId = getTenantId()
  const visitTenantId = getVisitTenantId()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  if (tenantId !== undefined && tenantId !== null) {
    headers['tenant-id'] = String(tenantId)
  }
  if (visitTenantId !== undefined && visitTenantId !== null) {
    headers['visit-tenant-id'] = String(visitTenantId)
  }

  try {
    const response = await fetch(`${config.base_url}/mes/config/personnel/current-access`, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      return null
    }
    const payload = await response.json()
    return (payload?.data ?? null) as YianCurrentAccessVO | null
  } catch {
    return null
  }
}
