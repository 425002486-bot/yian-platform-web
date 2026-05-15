import dayjs from 'dayjs'
import type { DvMachineryVO } from '@/api/mes/dv/machinery'
import type { AssetDocumentVO, AssetHistoryEventVO } from '@/api/yian/asset'
import { listAssetBattery, resolveAssetDeviceProfile } from '@/api/yian/asset'
import { useCache } from '@/hooks/web/useCache'
import { MesDvMachineryStatusEnum } from '@/views/mes/utils/constants'

export type AssetDeviceEnableStatus = 'enabled' | 'disabled'
export type AssetDeviceCurrentStatus = 'enabled' | 'pending_check' | 'repairing' | 'grounded'

export interface AssetDeviceInspectionRecordVO {
  id: string
  inspectedAt: string
  inspector: string
  cycleLabel: string
  structureStatus: string
  powerStatus: string
  sensorStatus: string
  complianceStatus: string
  conclusion: 'pass' | 'observe' | 'grounded'
  conclusionLabel: string
  notes: string
  evidence: string
  suggestedWorkorder: boolean
}

export interface AssetDeviceMasterRecordVO {
  code: string
  serialNumber: string
  siteName: string
  ownerName: string
  enableStatus: AssetDeviceEnableStatus
  enableStatusLabel: string
  standardBatteryCodes: string[]
  currentStatus: AssetDeviceCurrentStatus
  currentStatusLabel: string
  currentStatusTagType: 'success' | 'warning' | 'primary' | 'danger'
  currentStage: string
  statusReason: string
  statusSource: string
  statusUpdatedAt: string
  parseSummary: string
  parseSource: string
  parseUpdatedAt: string
  parsedFields: Array<{ label: string; value: string }>
  warnings: string[]
  missingItems: string[]
  workorderSummary: string
  linkedBatteries: string[]
  documents: AssetDocumentVO[]
  history: AssetHistoryEventVO[]
  inspections: AssetDeviceInspectionRecordVO[]
  inspectionDueText: string
  latestInspectionAt: string
  latestInspectionConclusion: string
  latestAttachmentWarning: string
}

export interface AssetDeviceMasterSavePayload {
  previousCode?: string
  code: string
  serialNumber: string
  siteName: string
  ownerName: string
  enableStatus: AssetDeviceEnableStatus
  standardBatteryCodes: string[]
}

export interface AssetDeviceInspectionPayload {
  code: string
  inspector: string
  inspectedAt: string
  cycleLabel: string
  structureStatus: string
  powerStatus: string
  sensorStatus: string
  complianceStatus: string
  conclusion: 'pass' | 'observe' | 'grounded'
  notes: string
  evidence: string
  suggestedWorkorder: boolean
}

const STORAGE_KEY = 'yian_asset_device_master_v3'
const { wsCache } = useCache()

const CURRENT_STATUS_META: Record<
  AssetDeviceCurrentStatus,
  { label: string; tagType: AssetDeviceMasterRecordVO['currentStatusTagType'] }
> = {
  enabled: { label: '启用', tagType: 'success' },
  pending_check: { label: '待检', tagType: 'warning' },
  repairing: { label: '维修中', tagType: 'primary' },
  grounded: { label: '停飞', tagType: 'danger' }
}

const ENABLE_STATUS_META: Record<AssetDeviceEnableStatus, { label: string; machineryStatus: number }> = {
  enabled: { label: '启用', machineryStatus: MesDvMachineryStatusEnum.PRODUCING },
  disabled: { label: '停用', machineryStatus: MesDvMachineryStatusEnum.STOP }
}

export const ASSET_DEVICE_STATUS_OPTIONS = (
  Object.entries(CURRENT_STATUS_META) as Array<
    [AssetDeviceCurrentStatus, { label: string; tagType: AssetDeviceMasterRecordVO['currentStatusTagType'] }]
  >
).map(([value, meta]) => ({
  value,
  label: meta.label
}))

export const ASSET_DEVICE_ENABLE_STATUS_OPTIONS = (
  Object.entries(ENABLE_STATUS_META) as Array<
    [AssetDeviceEnableStatus, { label: string; machineryStatus: number }]
  >
).map(([value, meta]) => ({
  value,
  label: meta.label,
  machineryStatus: meta.machineryStatus
}))

const seededInspections: Record<string, AssetDeviceInspectionRecordVO[]> = {
  'UAV-MVP-001': [
    {
      id: 'device-inspection-1201-1',
      inspectedAt: '2026-05-10 09:10',
      inspector: '周启明',
      cycleLabel: '30天例行巡检',
      structureStatus: '机臂锁扣正常，外壳无新裂纹',
      powerStatus: '桨叶无缺口，电机转动顺滑',
      sensorStatus: '避障镜头已清洁，RTK 天线连接正常',
      complianceStatus: '登记二维码清晰，保险标签在有效期内',
      conclusion: 'observe',
      conclusionLabel: '观察',
      notes: '当前有待放行工单，完成放行审核前继续保持待检。',
      evidence: '巡检照片 3 张 / 首飞检查单',
      suggestedWorkorder: false
    }
  ],
  'UAV-MVP-002': [
    {
      id: 'device-inspection-1202-1',
      inspectedAt: '2026-05-09 17:20',
      inspector: '罗家诚',
      cycleLabel: '30天例行巡检',
      structureStatus: '机身外壳轻微划痕，机臂无裂纹',
      powerStatus: '桨叶正常，需关注挂载电池寿命预警',
      sensorStatus: '图传天线与镜头状态正常',
      complianceStatus: '校准材料待补充最新年度证明',
      conclusion: 'observe',
      conclusionLabel: '观察',
      notes: '建议 48 小时内补传最新检测证明并完成复检。',
      evidence: '巡检照片 2 张 / 检测报告',
      suggestedWorkorder: false
    }
  ]
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const getStore = (): Record<string, Partial<AssetDeviceMasterRecordVO>> =>
  (wsCache.get(STORAGE_KEY) as Record<string, Partial<AssetDeviceMasterRecordVO>> | undefined) || {}

const setStore = (value: Record<string, Partial<AssetDeviceMasterRecordVO>>) => {
  wsCache.set(STORAGE_KEY, value)
}

const buildInspectionDueText = (record: Pick<
  AssetDeviceMasterRecordVO,
  'latestInspectionAt' | 'currentStatus' | 'latestInspectionConclusion'
>) => {
  if (!record.latestInspectionAt) return '暂无巡检记录，建议尽快完成 30 天例行巡检'
  const days = Math.max(dayjs().diff(dayjs(record.latestInspectionAt), 'day'), 0)
  if (record.currentStatus === 'grounded') return '最近一次巡检已给出停飞建议，需完成处置后再恢复'
  if (days >= 30) return `距上次巡检已 ${days} 天，已超过 30 天例行巡检周期`
  if (record.currentStatus === 'pending_check') return `最近一次巡检结论为${record.latestInspectionConclusion}，建议优先复核`
  return `最近一次巡检距今 ${days} 天，当前处于周期内`
}

const hasActiveWorkorder = (summary: string) => {
  if (!summary) return false
  return !summary.includes('当前无在途')
}

const deriveCurrentStatus = (
  enableStatus: AssetDeviceEnableStatus,
  baseWarnings: string[],
  missingItems: string[],
  workorderSummary: string,
  latestInspection?: AssetDeviceInspectionRecordVO
): AssetDeviceCurrentStatus => {
  if (enableStatus === 'disabled') return 'grounded'
  if (latestInspection?.conclusion === 'grounded') return 'grounded'
  if (hasActiveWorkorder(workorderSummary)) return 'repairing'
  if (baseWarnings.length || missingItems.length || latestInspection?.conclusion === 'observe') {
    return 'pending_check'
  }
  return 'enabled'
}

const buildHistoryEvent = (
  title: string,
  detail: string,
  stage: string,
  tone: AssetHistoryEventVO['tone'],
  happenedAt: string,
  evidence: string
): AssetHistoryEventVO => ({
  id: `history-${happenedAt}-${Math.random().toString(36).slice(2, 8)}`,
  happenedAt,
  title,
  detail,
  stage,
  tone,
  evidence
})

const buildBaseRecord = (device?: Partial<DvMachineryVO> | null): AssetDeviceMasterRecordVO => {
  const base = resolveAssetDeviceProfile(device)
  const code = device?.code || ''
  const inspections = clone(seededInspections[code] || [])
  const latestInspection = inspections[0]
  const enableStatus: AssetDeviceEnableStatus = 'enabled'
  const currentStatus = deriveCurrentStatus(
    enableStatus,
    base.warnings,
    base.missingItems,
    base.workorderSummary,
    latestInspection
  )
  return {
    code,
    serialNumber: base.serialNumber,
    siteName: base.siteName,
    ownerName: base.ownerName,
    enableStatus,
    enableStatusLabel: ENABLE_STATUS_META[enableStatus].label,
    standardBatteryCodes: [...base.linkedBatteries],
    currentStatus,
    currentStatusLabel: CURRENT_STATUS_META[currentStatus].label,
    currentStatusTagType: CURRENT_STATUS_META[currentStatus].tagType,
    currentStage: base.currentStage,
    statusReason: base.statusReason,
    statusSource: base.statusSource,
    statusUpdatedAt: base.parseUpdatedAt === '-' ? dayjs().format('YYYY-MM-DD HH:mm') : base.parseUpdatedAt,
    parseSummary: base.parseSummary,
    parseSource: base.parseSource,
    parseUpdatedAt: base.parseUpdatedAt,
    parsedFields: clone(base.parsedFields),
    warnings: [...base.warnings],
    missingItems: [...base.missingItems],
    workorderSummary: base.workorderSummary,
    linkedBatteries: [...base.linkedBatteries],
    documents: clone(base.documents),
    history: clone(base.history),
    inspections,
    inspectionDueText: buildInspectionDueText({
      latestInspectionAt: latestInspection?.inspectedAt || '',
      currentStatus,
      latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检'
    }),
    latestInspectionAt: latestInspection?.inspectedAt || '',
    latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检',
    latestAttachmentWarning: base.missingItems[0] || base.warnings[0] || ''
  }
}

const normalizeRecord = (record: AssetDeviceMasterRecordVO): AssetDeviceMasterRecordVO => {
  const latestInspection = record.inspections[0]
  const currentStatus = record.currentStatus
  return {
    ...record,
    enableStatusLabel: ENABLE_STATUS_META[record.enableStatus].label,
    currentStatusLabel: CURRENT_STATUS_META[currentStatus].label,
    currentStatusTagType: CURRENT_STATUS_META[currentStatus].tagType,
    latestInspectionAt: latestInspection?.inspectedAt || '',
    latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检',
    inspectionDueText: buildInspectionDueText({
      latestInspectionAt: latestInspection?.inspectedAt || '',
      currentStatus,
      latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检'
    }),
    documents: clone(record.documents),
    history: clone(record.history),
    parsedFields: clone(record.parsedFields),
    warnings: [...record.warnings],
    missingItems: [...record.missingItems],
    linkedBatteries: [...record.linkedBatteries],
    standardBatteryCodes: [...record.standardBatteryCodes],
    inspections: clone(record.inspections)
  }
}

export const resolveAssetDeviceMasterRecord = (
  device?: Partial<DvMachineryVO> | null
): AssetDeviceMasterRecordVO => {
  const base = buildBaseRecord(device)
  const code = device?.code || ''
  const cached = code ? getStore()[code] : undefined
  if (!cached) return normalizeRecord(base)
  return normalizeRecord({
    ...base,
    ...clone(cached),
    parsedFields: clone(cached.parsedFields || base.parsedFields),
    warnings: [...(cached.warnings || base.warnings)],
    missingItems: [...(cached.missingItems || base.missingItems)],
    linkedBatteries: [...(cached.linkedBatteries || base.linkedBatteries)],
    standardBatteryCodes: [...(cached.standardBatteryCodes || base.standardBatteryCodes)],
    documents: clone(cached.documents || base.documents),
    history: clone(cached.history || base.history),
    inspections: clone(cached.inspections || base.inspections)
  })
}

export const saveAssetDeviceMasterRecord = (
  device: Partial<DvMachineryVO> | null | undefined,
  payload: AssetDeviceMasterSavePayload
) => {
  const current = resolveAssetDeviceMasterRecord({
    ...device,
    code: payload.previousCode || payload.code
  })
  const store = getStore()
  if (payload.previousCode && payload.previousCode !== payload.code) {
    delete store[payload.previousCode]
  }
  const currentStatus = deriveCurrentStatus(
    payload.enableStatus,
    current.warnings,
    current.missingItems,
    current.workorderSummary,
    current.inspections[0]
  )
  const updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  const nextRecord: AssetDeviceMasterRecordVO = normalizeRecord({
    ...current,
    code: payload.code,
    serialNumber: payload.serialNumber,
    siteName: payload.siteName,
    ownerName: payload.ownerName,
    enableStatus: payload.enableStatus,
    standardBatteryCodes: [...payload.standardBatteryCodes],
    linkedBatteries: [...payload.standardBatteryCodes],
    currentStatus,
    currentStatusLabel: CURRENT_STATUS_META[currentStatus].label,
    currentStatusTagType: CURRENT_STATUS_META[currentStatus].tagType,
    statusUpdatedAt: updatedAt,
    parsedFields: [
      { label: '设备编号', value: payload.code || '-' },
      { label: '站点绑定', value: `${payload.siteName || '-'} / ${payload.ownerName || '-'}` },
      ...current.parsedFields.filter((item) => !['设备编号', '站点绑定'].includes(item.label))
    ],
    history: [
      buildHistoryEvent(
        '设备主档更新',
        `更新责任人、启用状态或标配电池信息，当前启用状态为${ENABLE_STATUS_META[payload.enableStatus].label}。`,
        '主档编辑',
        'info',
        updatedAt,
        '来源：设备编辑'
      ),
      ...current.history
    ]
  })
  store[payload.code] = nextRecord
  setStore(store)
  return nextRecord
}

const CONCLUSION_META: Record<
  AssetDeviceInspectionRecordVO['conclusion'],
  { label: string; nextStatus: AssetDeviceCurrentStatus; tone: AssetHistoryEventVO['tone'] }
> = {
  pass: { label: '合格', nextStatus: 'enabled', tone: 'success' },
  observe: { label: '观察', nextStatus: 'pending_check', tone: 'warning' },
  grounded: { label: '停飞建议', nextStatus: 'grounded', tone: 'danger' }
}

export const submitAssetDeviceInspection = (
  device: Partial<DvMachineryVO> | null | undefined,
  payload: AssetDeviceInspectionPayload
) => {
  const current = resolveAssetDeviceMasterRecord({
    ...device,
    code: payload.code
  })
  const inspectedAt = payload.inspectedAt || dayjs().format('YYYY-MM-DD HH:mm')
  const record: AssetDeviceInspectionRecordVO = {
    id: `inspection-${payload.code}-${Date.now()}`,
    inspectedAt,
    inspector: payload.inspector,
    cycleLabel: payload.cycleLabel,
    structureStatus: payload.structureStatus,
    powerStatus: payload.powerStatus,
    sensorStatus: payload.sensorStatus,
    complianceStatus: payload.complianceStatus,
    conclusion: payload.conclusion,
    conclusionLabel: CONCLUSION_META[payload.conclusion].label,
    notes: payload.notes,
    evidence: payload.evidence,
    suggestedWorkorder: payload.suggestedWorkorder
  }
  const nextStatus =
    current.enableStatus === 'disabled'
      ? 'grounded'
      : hasActiveWorkorder(current.workorderSummary)
        ? 'repairing'
        : CONCLUSION_META[payload.conclusion].nextStatus
  const nextReason =
    current.enableStatus === 'disabled'
      ? '设备当前处于停用状态，需人工恢复启用后才能重新投入使用。'
      : hasActiveWorkorder(current.workorderSummary)
        ? '存在未闭环工单，设备继续保持维修中，待工单流程完成后再恢复可用。'
        : payload.conclusion === 'pass'
          ? '已完成最近一次设备巡检，当前未命中待检、维修中或停飞规则。'
          : payload.conclusion === 'observe'
            ? '最近一次巡检存在观察项，建议优先复核后再安排任务。'
            : '最近一次巡检命中停飞建议，需先完成处置和复核。'
  const nextRecord = normalizeRecord({
    ...current,
    currentStatus: nextStatus,
    currentStatusLabel: CURRENT_STATUS_META[nextStatus].label,
    currentStatusTagType: CURRENT_STATUS_META[nextStatus].tagType,
    statusReason: nextReason,
    statusSource: '来源：设备巡检记录',
    statusUpdatedAt: inspectedAt,
    inspections: [record, ...current.inspections],
    history: [
      buildHistoryEvent(
        `设备巡检${record.conclusionLabel}`,
        `${payload.cycleLabel}由${payload.inspector}完成，结论为${record.conclusionLabel}。`,
        '设备巡检',
        CONCLUSION_META[payload.conclusion].tone,
        inspectedAt,
        payload.evidence || '来源：设备巡检'
      ),
      ...current.history
    ]
  })
  const store = getStore()
  store[payload.code] = nextRecord
  setStore(store)
  return nextRecord
}

export const getDeviceEnableStatusByMachineryStatus = (status?: number): AssetDeviceEnableStatus => {
  return status === MesDvMachineryStatusEnum.STOP ? 'disabled' : 'enabled'
}

export const getMachineryStatusByEnableStatus = (enableStatus: AssetDeviceEnableStatus) =>
  ENABLE_STATUS_META[enableStatus].machineryStatus

export const listDeviceBatteryOptions = () =>
  listAssetBattery().map((item) => ({
    label: `${item.batteryCode} / ${item.serialNumber}`,
    value: item.batteryCode
  }))
