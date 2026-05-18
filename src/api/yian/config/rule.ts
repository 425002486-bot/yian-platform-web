import request from '@/config/axios'

export interface RuleVO {
  id: number
  name: string
  category: string
  triggerCondition: string
  triggerObject: string
  scope: string
  action: string
  execNode: string
  stationScope: string
  impactCount: number
  status: number
  remark: string
  createTime: string
}

export interface SlaRuleVO {
  id: number
  stage: string
  deadlineHours: number
  timeoutAction: string
  adjustable: boolean
}

export interface RuleChangeLogVO {
  id: number
  ruleId: number
  ruleName: string
  changeType: string
  beforeValue: string
  afterValue: string
  operatorName: string
  createTime: string
}

// 规则 CRUD
export const getRuleList = (category?: string) => {
  return request.get({ url: '/mes/config/rule/list', params: { category } })
}
export const getRule = (id: number) => {
  return request.get({ url: '/mes/config/rule/get', params: { id } })
}
export const createRule = (data: any) => {
  return request.post({ url: '/mes/config/rule/create', data })
}
export const updateRule = (data: any) => {
  return request.put({ url: '/mes/config/rule/update', data })
}
export const deleteRule = (id: number) => {
  return request.delete({ url: '/mes/config/rule/delete', params: { id } })
}

// SLA
export const getSlaRuleList = () => {
  return request.get({ url: '/mes/config/rule/sla/list' })
}
export const updateSlaRule = (data: any) => {
  return request.put({ url: '/mes/config/rule/sla/update', data })
}

// 变更记录
export const getRuleChangeLogList = () => {
  return request.get({ url: '/mes/config/rule/change-log/list' })
}
