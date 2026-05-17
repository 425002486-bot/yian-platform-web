import request from '@/config/axios'

export interface AuditLogVO {
  id: number
  createTime: string
  userName: string
  objectType: string
  bizId: number
  bizCode: string
  action: string
  subType: string
  sourcePage: string
  userIp: string
  extra: string
}

export interface AuditLogPageReqVO {
  pageNo: number
  pageSize: number
  objectType?: string
  operatorName?: string
  createTime?: string[]
}

// 获得审计日志分页
export const getAuditLogPage = (params: AuditLogPageReqVO) => {
  return request.get({ url: '/mes/audit-log/page', params })
}

// 获得审计日志详情
export const getAuditLog = (id: number) => {
  return request.get({ url: '/mes/audit-log/get', params: { id } })
}
