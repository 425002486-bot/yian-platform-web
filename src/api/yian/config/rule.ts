import dayjs from 'dayjs'
import { ref } from 'vue'
import request from '@/config/axios'
import { config } from '@/config/axios/config'
import { useCache } from '@/hooks/web/useCache'
import { getAccessToken, getTenantId, getVisitTenantId } from '@/utils/auth'

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

export type RuleRuntimeStage =
  | 'pending'
  | 'diagnosing'
  | 'picking'
  | 'repairing'
  | 'inspecting'
  | 'releasing'

export interface RuleRuntimeSnapshot {
  fetchedAt: string
  rules: RuleVO[]
  slaRules: SlaRuleVO[]
  slaByStage: Record<RuleRuntimeStage, SlaRuleVO>
  batteryWarningSohThreshold: number
  batteryDangerSohThreshold: number
  workorderEscalationHours: number
}

export interface BatteryRuleInput {
  batteryCode?: string
  soh?: number
  cycleCount?: number
  checkSource?: string
  lastCheckAt?: string
  healthStatus?: 'normal' | 'warning' | 'danger'
}

export interface BatteryRuleOutcome {
  healthStatus: 'normal' | 'warning' | 'danger'
  healthLabel: string
  recommendation: string
  missingEvidence: boolean
}

export interface DeviceAdmissionRuleOutcome {
  machineryId: number
  deviceCode: string
  enableStatus: 'enabled' | 'disabled'
  enableStatusLabel: string
  currentStatus: 'pending_check' | 'repairing' | 'pending_release' | 'available' | 'grounded'
  currentStatusLabel: string
  currentStatusTagType: 'success' | 'warning' | 'primary' | 'danger' | 'info'
  statusReason: string
  statusSource: string
  warningLevel: 'none' | 'info' | 'warning' | 'danger'
  warningLevelLabel: string
  warningSummary: string
  recommendedAction: string
  linkedBatteryCodes: string[]
  workorderSummary: string
  warnings: string[]
  missingItems: string[]
}

export interface ReleaseRuleInput {
  riskLevel?: 'high' | 'medium' | 'low' | 'unrated'
  inspectionPassed?: boolean
  batteries: BatteryRuleInput[]
}

export interface ReleaseRuleOutcome {
  summary: string
  recommendedResult: 'approved' | 'limited' | 'rejected'
  alerts: string[]
  blockingReasons: string[]
}

export interface WorkorderStageRuleInput {
  stage: RuleRuntimeStage | 'releasing'
  riskLevel?: 'high' | 'medium' | 'low' | 'unrated'
  grounded?: boolean
  groundedSuggestion?: boolean
  needParts?: boolean
  pickerProvided?: boolean
  itemCount?: number
  inventorySufficient?: boolean
  technicianProvided?: boolean
  inspectionPassed?: boolean
  batteryCheck?: boolean
  flightTest?: boolean
  reviewResult?: 'approved' | 'limited' | 'rejected'
  restrictionsProvided?: boolean
}

export interface WorkorderStageRuleOutcome {
  allowed: boolean
  nextStage: string
  summary: string
  timeoutAction: string
  blockingReasons: string[]
  notices: string[]
}

const RULE_RUNTIME_STORAGE_KEY = 'yian_rule_runtime_v1'
const DEFAULT_SLA_BY_STAGE: Record<RuleRuntimeStage, SlaRuleVO> = {
  pending: { id: 1, stage: '工单受理', deadlineHours: 8, timeoutAction: '超时升级到站点负责人', adjustable: false },
  diagnosing: { id: 2, stage: '初始诊断', deadlineHours: 4, timeoutAction: '超时提醒并要求补齐初诊结果', adjustable: true },
  picking: { id: 3, stage: '领料确认', deadlineHours: 24, timeoutAction: '超时提醒备件管理员', adjustable: false },
  repairing: { id: 4, stage: '维修执行', deadlineHours: 48, timeoutAction: '超时升级至维修主管', adjustable: true },
  inspecting: { id: 5, stage: '复检确认', deadlineHours: 2, timeoutAction: '超时提醒复检人员', adjustable: false },
  releasing: { id: 6, stage: '放行审核', deadlineHours: 4, timeoutAction: '超时升级至值班审核人', adjustable: false }
}
const DEFAULT_RULE_RUNTIME_SNAPSHOT: RuleRuntimeSnapshot = {
  fetchedAt: '',
  rules: [],
  slaRules: Object.values(DEFAULT_SLA_BY_STAGE),
  slaByStage: DEFAULT_SLA_BY_STAGE,
  batteryWarningSohThreshold: 80,
  batteryDangerSohThreshold: 65,
  workorderEscalationHours: 14
}
const { wsCache } = useCache()
export const yianRuleRuntimeVersion = ref(0)
let syncingPromise: Promise<RuleRuntimeSnapshot> | null = null

const parseNumericThreshold = (value: string | undefined, fallback: number) => {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g)
  if (!matches?.length) return fallback
  const lastValue = Number(matches[matches.length - 1])
  return Number.isFinite(lastValue) ? lastValue : fallback
}

const normalizeStageKey = (
  row: Partial<SlaRuleVO>,
  index: number
): RuleRuntimeStage | null => {
  const stageText = String(row.stage || '').toLowerCase()
  if (stageText.includes('pending') || stageText.includes('受理')) return 'pending'
  if (stageText.includes('diagnos') || stageText.includes('初诊')) return 'diagnosing'
  if (stageText.includes('pick') || stageText.includes('领料')) return 'picking'
  if (stageText.includes('repair') || stageText.includes('维修')) return 'repairing'
  if (stageText.includes('inspect') || stageText.includes('复检')) return 'inspecting'
  if (stageText.includes('releas') || stageText.includes('放行')) return 'releasing'

  const fallbackById: Record<number, RuleRuntimeStage> = {
    1: 'pending',
    2: 'diagnosing',
    3: 'picking',
    4: 'repairing',
    5: 'inspecting',
    6: 'releasing'
  }
  return fallbackById[row.id || index + 1] || null
}

const buildRuntimeSnapshot = (rules: RuleVO[], slaRules: SlaRuleVO[]): RuleRuntimeSnapshot => {
  const normalizedSlaByStage = { ...DEFAULT_SLA_BY_STAGE }
  const normalizedSlaRules: SlaRuleVO[] = []

  slaRules.forEach((row, index) => {
    const stageKey = normalizeStageKey(row, index)
    if (!stageKey) return
    const normalized = {
      ...DEFAULT_SLA_BY_STAGE[stageKey],
      ...row,
      deadlineHours: Number(row.deadlineHours) || DEFAULT_SLA_BY_STAGE[stageKey].deadlineHours,
      timeoutAction: row.timeoutAction || DEFAULT_SLA_BY_STAGE[stageKey].timeoutAction
    }
    normalizedSlaByStage[stageKey] = normalized
    normalizedSlaRules.push(normalized)
  })

  const activeRules = (rules || []).filter((item) => Number(item.status) === 0)
  const assetRules = activeRules.filter((item) => item.category === 'asset')
  const workorderRules = activeRules.filter((item) => item.category === 'workorder')
  const warningRule = assetRules.find((item) => item.action === 'restrict')
  const dangerRule = assetRules.find((item) => item.action === 'intercept')
  const reviewRule = workorderRules.find((item) => item.action === 'review')

  const batteryWarningSohThreshold = parseNumericThreshold(warningRule?.triggerCondition, 80)
  const parsedDanger = parseNumericThreshold(dangerRule?.triggerCondition, batteryWarningSohThreshold - 15)
  const batteryDangerSohThreshold = Math.min(parsedDanger, batteryWarningSohThreshold - 1)

  return {
    fetchedAt: new Date().toISOString(),
    rules: activeRules,
    slaRules: normalizedSlaRules.length ? normalizedSlaRules : Object.values(normalizedSlaByStage),
    slaByStage: normalizedSlaByStage,
    batteryWarningSohThreshold,
    batteryDangerSohThreshold: Math.max(1, batteryDangerSohThreshold),
    workorderEscalationHours: parseNumericThreshold(reviewRule?.triggerCondition, 14)
  }
}

const setRuleRuntimeSnapshot = (snapshot: RuleRuntimeSnapshot) => {
  wsCache.set(RULE_RUNTIME_STORAGE_KEY, snapshot)
  yianRuleRuntimeVersion.value += 1
  return snapshot
}

export const getRuleRuntimeSnapshot = (): RuleRuntimeSnapshot => {
  // Access the version so computed callers can react to cache refreshes.
  void yianRuleRuntimeVersion.value
  const cached = wsCache.get(RULE_RUNTIME_STORAGE_KEY) as RuleRuntimeSnapshot | undefined
  return cached || DEFAULT_RULE_RUNTIME_SNAPSHOT
}

export const syncRuleRuntimeConfig = async (force = false): Promise<RuleRuntimeSnapshot> => {
  if (!force) {
    const cached = wsCache.get(RULE_RUNTIME_STORAGE_KEY) as RuleRuntimeSnapshot | undefined
    if (cached?.fetchedAt) {
      return setRuleRuntimeSnapshot(cached)
    }
  }
  if (syncingPromise) {
    return syncingPromise
  }
  syncingPromise = getRuleRuntime()
    .then((snapshot) => setRuleRuntimeSnapshot(snapshot))
    .catch(() =>
      Promise.all([getRuleList(), getSlaRuleList()])
        .then(([rules, slaRules]) => setRuleRuntimeSnapshot(buildRuntimeSnapshot(rules || [], slaRules || [])))
    )
    .catch(() => {
      const cached = wsCache.get(RULE_RUNTIME_STORAGE_KEY) as RuleRuntimeSnapshot | undefined
      return setRuleRuntimeSnapshot(cached || DEFAULT_RULE_RUNTIME_SNAPSHOT)
    })
    .finally(() => {
      syncingPromise = null
    })
  return syncingPromise
}

export const invalidateRuleRuntimeConfig = () => {
  wsCache.delete?.(RULE_RUNTIME_STORAGE_KEY)
  yianRuleRuntimeVersion.value += 1
}

export const getSlaRuleForStage = (stage: RuleRuntimeStage) => getRuleRuntimeSnapshot().slaByStage[stage]

export const buildSlaDeadline = (stage: RuleRuntimeStage, from?: string) =>
  dayjs(from || undefined)
    .add(getSlaRuleForStage(stage).deadlineHours, 'hour')
    .format('YYYY-MM-DD HH:mm')

export const evaluateBatteryRule = (input: BatteryRuleInput): BatteryRuleOutcome => {
  const runtime = getRuleRuntimeSnapshot()
  const missingEvidence = !input.lastCheckAt || !input.checkSource
  const sourceStatus = input.healthStatus || 'normal'
  const soh = typeof input.soh === 'number' ? input.soh : undefined

  let healthStatus: BatteryRuleOutcome['healthStatus'] = sourceStatus
  if (soh !== undefined && soh <= runtime.batteryDangerSohThreshold) {
    healthStatus = 'danger'
  } else if (soh !== undefined && soh < runtime.batteryWarningSohThreshold) {
    healthStatus = 'warning'
  } else if (sourceStatus === 'danger') {
    healthStatus = 'danger'
  } else if (sourceStatus === 'warning') {
    healthStatus = 'warning'
  }

  if (healthStatus === 'danger') {
    return {
      healthStatus,
      healthLabel: '禁止放行',
      recommendation: '命中强规则，需完成更换或解绑后再进入放行审核。',
      missingEvidence
    }
  }
  if (healthStatus === 'warning') {
    return {
      healthStatus,
      healthLabel: '限制放行',
      recommendation: '命中观察/寿命预警规则，建议缩短任务时长并尽快复检。',
      missingEvidence
    }
  }
  return {
    healthStatus: 'normal',
    healthLabel: '状态正常',
    recommendation: missingEvidence ? '当前健康状态正常，但请尽快补齐巡检或检测来源。' : '可按标准流程执行任务。',
    missingEvidence
  }
}

export const evaluateBatteryRuleRemote = (data: BatteryRuleInput) => {
  return request.post<never, BatteryRuleOutcome>({ url: '/mes/config/rule/battery/evaluate', data })
}

const buildSilentRequestHeaders = () => {
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
  return headers
}

export const evaluateDeviceAdmissionRuleRemote = async (id: number) => {
  const url = new URL(`${config.base_url}/mes/config/rule/device-admission/evaluate`)
  url.searchParams.set('id', String(id))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildSilentRequestHeaders()
  })
  if (!response.ok) {
    throw new Error(`device-admission-rule-http-${response.status}`)
  }

  const payload = await response.json()
  if (payload?.code !== 0 && payload?.code !== 200) {
    throw new Error(payload?.msg || 'device-admission-rule-unavailable')
  }
  if (!payload?.data) {
    throw new Error('device-admission-rule-empty')
  }
  return payload.data as DeviceAdmissionRuleOutcome
}

export const evaluateReleaseRule = (input: ReleaseRuleInput): ReleaseRuleOutcome => {
  const batteryOutcomes = input.batteries.map((item) => ({
    batteryCode: item.batteryCode,
    ...evaluateBatteryRule(item)
  }))
  const dangerBatteries = batteryOutcomes.filter((item) => item.healthStatus === 'danger')
  const warningBatteries = batteryOutcomes.filter((item) => item.healthStatus === 'warning')
  const evidenceMissingBatteries = batteryOutcomes.filter((item) => item.missingEvidence)
  const alerts: string[] = []
  const blockingReasons: string[] = []

  dangerBatteries.forEach((item) => {
    alerts.push(`${item.batteryCode || '关联电池'}命中禁止放行规则。`)
  })
  warningBatteries.forEach((item) => {
    alerts.push(`${item.batteryCode || '关联电池'}命中限制放行规则。`)
  })
  evidenceMissingBatteries.forEach((item) => {
    alerts.push(`${item.batteryCode || '关联电池'}缺少最近巡检或检测来源，不能作为正常放行依据。`)
  })

  if (input.inspectionPassed === false) {
    blockingReasons.push('复检未通过，当前不允许提交正常放行或限制放行。')
  }
  if (dangerBatteries.length) {
    blockingReasons.push('存在命中禁止放行规则的电池，当前只能驳回返修。')
  }

  if (blockingReasons.length) {
    return {
      summary: '当前命中禁止放行条件，需先完成返修、解绑或更换后再重新发起放行审核。',
      recommendedResult: 'rejected',
      alerts,
      blockingReasons
    }
  }

  if (warningBatteries.length || evidenceMissingBatteries.length || input.riskLevel === 'high') {
    return {
      summary: '当前建议限制放行，并补充限制条件或观察要求后再放行。',
      recommendedResult: 'limited',
      alerts,
      blockingReasons
    }
  }

  return {
    summary: '当前未命中限制或拦截规则，可按标准流程提交正常放行。',
    recommendedResult: 'approved',
    alerts,
    blockingReasons
  }
}

export const evaluateReleaseRuleRemote = (data: ReleaseRuleInput) => {
  return request.post<never, ReleaseRuleOutcome>({ url: '/mes/config/rule/release/evaluate', data })
}

export const evaluateWorkorderStageRuleRemote = (data: WorkorderStageRuleInput) => {
  return request.post<never, WorkorderStageRuleOutcome>({
    url: '/mes/config/rule/workorder-stage/evaluate',
    data
  })
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

export const getRuleRuntime = () => {
  return request.get<never, RuleRuntimeSnapshot>({ url: '/mes/config/rule/runtime' })
}

// 变更记录
export const getRuleChangeLogList = () => {
  return request.get({ url: '/mes/config/rule/change-log/list' })
}
