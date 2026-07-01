import dayjs from 'dayjs'
import type { DvMachineryVO } from '@/api/mes/dv/machinery'
import type {
  AssetDocumentVO,
  AssetHistoryEventVO,
  AssetInspectionAttachmentVO
} from '@/api/yian/asset'
import { YianAiApi, type YianAssetDeviceDocumentParseRespVO } from '@/api/yian/ai'
import { evaluateDeviceAdmissionRuleRemote } from '@/api/yian/config/rule'
import {
  listAssetBattery,
  listLinkedBatteries,
  resolveAssetBatteryProfile,
  resolveAssetDeviceProfile
} from '@/api/yian/asset'
import { useCache } from '@/hooks/web/useCache'
import { MesDvMachineryStatusEnum } from '@/views/mes/utils/constants'

export type AssetDeviceEnableStatus = 'enabled' | 'disabled'
export type AssetDeviceCurrentStatus =
  | 'pending_check'
  | 'repairing'
  | 'pending_release'
  | 'available'
  | 'grounded'
export type AssetWarningLevel = 'none' | 'info' | 'warning' | 'danger'

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
  attachments: AssetInspectionAttachmentVO[]
}

export interface AssetDeviceMasterRecordVO {
  code: string
  machineryTypeName: string
  serialNumber: string
  siteName: string
  ownerName: string
  enableStatus: AssetDeviceEnableStatus
  enableStatusLabel: string
  standardBatteryCodes: string[]
  currentStatus: AssetDeviceCurrentStatus
  currentStatusLabel: string
  currentStatusTagType: 'success' | 'warning' | 'primary' | 'danger' | 'info'
  currentStage: string
  statusReason: string
  statusSource: string
  statusUpdatedAt: string
  warningLevel: AssetWarningLevel
  warningLevelLabel: string
  warningSummary: string
  recommendedAction: string
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
  attachments: AssetInspectionAttachmentVO[]
}

export interface AssetDeviceDocumentUploadPayload {
  code: string
  fileName: string
  files?: File[]
  uploadedBy: string
  uploadedAt?: string
}

const STORAGE_KEY = 'yian_asset_device_master_v3'
const { wsCache } = useCache()
const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'

const CURRENT_STATUS_META: Record<
  AssetDeviceCurrentStatus,
  { label: string; tagType: AssetDeviceMasterRecordVO['currentStatusTagType'] }
> = {
  pending_check: { label: '待检', tagType: 'warning' },
  repairing: { label: '维修中', tagType: 'warning' },
  pending_release: { label: '待放行', tagType: 'warning' },
  available: { label: '可用', tagType: 'success' },
  grounded: { label: '停飞', tagType: 'danger' }
}

const ENABLE_STATUS_META: Record<
  AssetDeviceEnableStatus,
  { label: string; machineryStatus: number }
> = {
  enabled: { label: '启用', machineryStatus: MesDvMachineryStatusEnum.PRODUCING },
  disabled: { label: '停用', machineryStatus: MesDvMachineryStatusEnum.STOP }
}

const WARNING_LEVEL_META: Record<AssetWarningLevel, { label: string }> = {
  none: { label: '正常' },
  info: { label: '提示' },
  warning: { label: '预警' },
  danger: { label: '阻断' }
}

const getInspectionConclusionLabel = (conclusion: AssetDeviceInspectionRecordVO['conclusion']) => {
  if (conclusion === 'pass') return '合格'
  if (conclusion === 'observe') return '观察'
  return '异常'
}

export const ASSET_DEVICE_STATUS_OPTIONS = (
  Object.entries(CURRENT_STATUS_META) as Array<
    [
      AssetDeviceCurrentStatus,
      { label: string; tagType: AssetDeviceMasterRecordVO['currentStatusTagType'] }
    ]
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
      suggestedWorkorder: false,
      attachments: [
        {
          id: 'device-inspection-1201-1-file-1',
          fileName: 'inspection-photo-20260510-1.jpg',
          category: '图片',
          summary: '现场巡检照片',
          uploadedAt: '2026-05-10 09:10',
          uploadedBy: '周启明',
          sizeLabel: '1.6 MB'
        },
        {
          id: 'device-inspection-1201-1-file-2',
          fileName: 'first-flight-checklist.pdf',
          category: '附件',
          summary: '首飞检查单',
          uploadedAt: '2026-05-10 09:10',
          uploadedBy: '周启明',
          sizeLabel: '820 KB'
        }
      ]
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
      suggestedWorkorder: false,
      attachments: [
        {
          id: 'device-inspection-1202-1-file-1',
          fileName: 'inspection-photo-20260509-1.jpg',
          category: '图片',
          summary: '现场巡检照片',
          uploadedAt: '2026-05-09 17:20',
          uploadedBy: '罗家诚',
          sizeLabel: '1.1 MB'
        },
        {
          id: 'device-inspection-1202-1-file-2',
          fileName: 'payload-test-report.pdf',
          category: '附件',
          summary: '检测报告',
          uploadedAt: '2026-05-09 17:20',
          uploadedBy: '罗家诚',
          sizeLabel: '2.0 MB'
        }
      ]
    }
  ]
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const getStore = (): Record<string, Partial<AssetDeviceMasterRecordVO>> =>
  (wsCache.get(STORAGE_KEY) as Record<string, Partial<AssetDeviceMasterRecordVO>> | undefined) || {}

const setStore = (value: Record<string, Partial<AssetDeviceMasterRecordVO>>) => {
  wsCache.set(STORAGE_KEY, value)
}

const syncRemoteRuleResultToStore = (code: string, payload: Partial<AssetDeviceMasterRecordVO>) => {
  if (!code) return
  const store = getStore()
  const current = store[code] || {}
  store[code] = {
    ...current,
    ...payload,
    linkedBatteries: payload.linkedBatteries || current.linkedBatteries,
    standardBatteryCodes: payload.standardBatteryCodes || current.standardBatteryCodes,
    warnings: payload.warnings || current.warnings,
    missingItems: payload.missingItems || current.missingItems
  }
  setStore(store)
}

const normalizeIdentityValue = (value?: string) =>
  String(value || '')
    .trim()
    .toUpperCase()

const isAircraftMachineryType = (value?: string) => value === AIRCRAFT_MACHINERY_TYPE_NAME

const hasPendingReleaseWorkorder = (summary: string, stage?: string, reason?: string) => {
  const combined = [summary, stage, reason].join(' ')
  return combined.includes('待放行') || combined.includes('放行审核')
}

const isInspectionOverdue = (inspectedAt?: string) => {
  if (!inspectedAt) return true
  return Math.max(dayjs().diff(dayjs(inspectedAt), 'day'), 0) >= 30
}

const buildBatteryAlert = (
  machineryTypeName: string,
  standardBatteryCodes: string[]
): {
  level: AssetWarningLevel
  summary: string
  recommendation: string
  source: string
} => {
  if (!isAircraftMachineryType(machineryTypeName)) {
    return {
      level: 'none',
      summary: '',
      recommendation: '',
      source: ''
    }
  }

  if (!standardBatteryCodes.length) {
    return {
      level: 'warning',
      summary: '未配置标配电池',
      recommendation: '建议先补录标配电池关系，再继续巡检或放行判断',
      source: '来源：设备主档'
    }
  }

  const batteries = listAssetBattery().filter((item) =>
    standardBatteryCodes.includes(item.batteryCode)
  )
  const unresolvedCount = Math.max(standardBatteryCodes.length - batteries.length, 0)
  let dangerCount = unresolvedCount
  let warningCount = 0

  batteries.forEach((battery) => {
    // Battery list rows and profile resolver come from different adapters.
    const profile = resolveAssetBatteryProfile(battery as any)
    const hasDanger =
      battery.healthStatus === 'danger' ||
      profile.healthScoreTone === 'danger' ||
      profile.correctionHints.some((item) => item.tone === 'danger') ||
      profile.inspectionStatus.includes('禁放')

    if (hasDanger) {
      dangerCount += 1
      return
    }

    const hasWarning =
      battery.healthStatus === 'warning' ||
      profile.healthScoreTone === 'warning' ||
      profile.correctionHints.some((item) => item.tone === 'warning') ||
      /待巡检|待检|预警|复检/.test(`${profile.inspectionStatus} ${profile.inspectionDueText}`)

    if (hasWarning) {
      warningCount += 1
    }
  })

  if (dangerCount > 0) {
    return {
      level: 'danger',
      summary: `${dangerCount} 组标配电池命中高风险或禁放规则`,
      recommendation: '建议立即更换异常电池并完成复检，设备暂不应安排放飞任务',
      source: '来源：标配电池台账与巡检记录'
    }
  }

  if (warningCount > 0) {
    return {
      level: 'warning',
      summary: `${warningCount} 组标配电池存在预警或待复检提醒`,
      recommendation: '建议 48 小时内优先完成电池健康复检',
      source: '来源：标配电池台账与巡检记录'
    }
  }

  return {
    level: 'none',
    summary: `${standardBatteryCodes.length} 组标配电池状态正常`,
    recommendation: '当前未命中标配电池异常规则',
    source: '来源：标配电池台账'
  }
}

const buildInspectionDueText = (
  record: Pick<
    AssetDeviceMasterRecordVO,
    | 'latestInspectionAt'
    | 'currentStatus'
    | 'latestInspectionConclusion'
    | 'parseUpdatedAt'
    | 'documents'
  >
) => {
  const archiveIncomplete = record.parseUpdatedAt === '-' || record.documents.length === 0
  if (archiveIncomplete) return '当前基础资料仍未补齐，建议先完善主档附件与履历'
  if (record.currentStatus === 'pending_release') return '维修或复检已完成，待放行审核闭环'
  if (!record.latestInspectionAt) return '暂无巡检记录，建议尽快完成首检或例行巡检'
  const days = Math.max(dayjs().diff(dayjs(record.latestInspectionAt), 'day'), 0)
  if (days >= 30) return `距上次巡检已 ${days} 天，已超过 30 天例行巡检周期`
  if (record.currentStatus === 'pending_check')
    return `最近一次巡检结论为${record.latestInspectionConclusion}，建议优先复核`
  return `最近一次巡检距今 ${days} 天，当前处于周期内`
}

const hasActiveWorkorder = (summary: string) => {
  if (!summary) return false
  return !summary.includes('当前无在途')
}

const deriveRecordState = (
  record: Pick<
    AssetDeviceMasterRecordVO,
    | 'machineryTypeName'
    | 'enableStatus'
    | 'standardBatteryCodes'
    | 'currentStage'
    | 'statusReason'
    | 'workorderSummary'
    | 'warnings'
    | 'missingItems'
    | 'documents'
    | 'parseUpdatedAt'
    | 'inspections'
  >
) => {
  const latestInspection = record.inspections[0]
  const batteryAlert = buildBatteryAlert(record.machineryTypeName, record.standardBatteryCodes)
  const noArchiveReady = record.parseUpdatedAt === '-' || record.documents.length === 0
  const needsInspection = record.missingItems.length > 0 || record.warnings.length > 0

  let currentStatus: AssetDeviceCurrentStatus = 'available'
  let statusReason = '当前设备无显著风险，可正常使用'
  let statusSource = '来源：设备台账综合判断'
  let warningLevel: AssetWarningLevel = 'none'
  let warningSummary = '当前无显著风险'
  let recommendedAction = '可正常使用，按周期执行巡检'

  if (
    hasPendingReleaseWorkorder(record.workorderSummary, record.currentStage, record.statusReason)
  ) {
    currentStatus = 'pending_release'
    statusReason = '维修或复检已完成，当前仍待放行审核闭环'
    statusSource = '来源：工单流转'
  } else if (hasActiveWorkorder(record.workorderSummary)) {
    currentStatus = 'repairing'
    statusReason = '存在未闭环工单，设备当前处于维修处理阶段'
    statusSource = '来源：工单流转'
  } else if (noArchiveReady) {
    currentStatus = 'pending_check'
    statusReason = '当前基础资料未补齐，尚未形成完整建档信息'
    statusSource = '来源：建档附件'
  } else if (needsInspection) {
    currentStatus = 'pending_check'
    statusReason = record.warnings[0] || record.missingItems[0] || '已命中待检条件'
    statusSource = record.warnings.length ? '来源：主档解析' : '来源：设备巡检记录'
  } else if (latestInspection?.conclusion === 'grounded') {
    currentStatus = 'grounded'
    statusReason = '鏈€杩戜竴娆¤澶囧贰妫€缁撹涓哄紓甯革紝璁惧搴旀殏鍋滀娇鐢ㄥ苟浼樺厛鏁存敼'
    statusSource = '鏉ユ簮锛氳澶囧贰妫€璁板綍'
  } else if (latestInspection?.conclusion === 'observe') {
    currentStatus = 'pending_check'
    statusReason = '鏈€杩戜竴娆¤澶囧贰妫€缁撹涓鸿瀵燂紝寤鸿浼樺厛瀹屾垚澶嶆鍚庡啀缁х画浣跨敤'
    statusSource = '鏉ユ簮锛氳澶囧贰妫€璁板綍'
  }

  if (batteryAlert.level === 'danger') {
    warningLevel = 'danger'
    warningSummary = batteryAlert.summary
    recommendedAction = batteryAlert.recommendation
  } else if (latestInspection?.conclusion === 'grounded') {
    warningLevel = 'danger'
    warningSummary = `巡检结论为${latestInspection.conclusionLabel}`
    recommendedAction = '建议完成整改后发起复检或维修工单'
  } else if (currentStatus === 'pending_release') {
    warningLevel = 'warning'
    warningSummary = '存在待放行任务'
    recommendedAction = '建议优先完成放行审核后再恢复使用'
  } else if (currentStatus === 'repairing') {
    warningLevel = 'warning'
    warningSummary = '存在在途维修工单'
    recommendedAction = '建议优先闭环维修工单'
  } else if (noArchiveReady) {
    warningLevel = 'info'
    warningSummary = '建档资料未补齐'
    recommendedAction = '建议先补录建档附件与履历后再发起巡检'
  } else if (batteryAlert.level === 'warning') {
    warningLevel = 'warning'
    warningSummary = batteryAlert.summary
    recommendedAction = batteryAlert.recommendation
  } else if (latestInspection?.conclusion === 'observe') {
    warningLevel = 'warning'
    warningSummary = `巡检结论为${latestInspection.conclusionLabel}`
    recommendedAction = '建议尽快完成复检后再安排任务'
  } else if (isInspectionOverdue(latestInspection?.inspectedAt)) {
    warningLevel = 'info'
    warningSummary = '巡检周期已到'
    recommendedAction = '建议尽快完成本周期巡检'
  } else if (needsInspection) {
    warningLevel = 'info'
    warningSummary = '存在待补齐项'
    recommendedAction = '建议优先补齐资料后再继续操作'
  }

  if (record.enableStatus === 'disabled') {
    warningLevel = warningLevel === 'danger' ? 'danger' : 'info'
    warningSummary = warningSummary === '当前无显著风险' ? '设备已停用' : warningSummary
    recommendedAction = '当前设备未纳入运营，如需投入使用请先人工启用'
    if (currentStatus === 'available') {
      statusReason = '当前设备已停用，不参与调度和放飞'
      statusSource = '来源：设备启用状态'
    }
  }

  return {
    currentStatus,
    currentStatusLabel: CURRENT_STATUS_META[currentStatus].label,
    currentStatusTagType: CURRENT_STATUS_META[currentStatus].tagType,
    currentStage: CURRENT_STATUS_META[currentStatus].label,
    statusReason,
    statusSource,
    warningLevel,
    warningLevelLabel: WARNING_LEVEL_META[warningLevel].label,
    warningSummary,
    recommendedAction
  }
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

const getDocumentTypeFromFileName = (fileName: string) => {
  const lower = fileName.toLowerCase()
  if (/\.(jpg|jpeg|png|webp|bmp)$/i.test(lower)) return '现场图片'
  if (/\.(pdf|doc|docx)$/i.test(lower)) return '检测报告'
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return '台账资料'
  if (/\.(zip|rar|7z|log|txt|json)$/i.test(lower)) return '日志附件'
  return '建档附件'
}

const buildDocumentParseResult = (documentType: string) => {
  if (documentType === '现场图片') return '已记录现场照片，待人工补充异常说明'
  if (documentType === '日志附件') return '已登记日志附件，待结合设备档案进行人工复核'
  if (documentType === '检测报告') return '已识别为检测/报告类附件，待刷新解析摘要'
  if (documentType === '台账资料') return '已识别为表格台账资料，待刷新解析摘要'
  return '已登记建档附件，待补充解析结论'
}

const buildDocumentSummary = (documents: AssetDocumentVO[]) => {
  if (!documents.length) {
    return {
      parseSummary: '当前暂无建档附件，建议补充合格证、检测报告和首飞检查单',
      parseSource: '来源：待补录',
      warnings: ['尚未上传建档附件，暂时无法形成主档解析结论'],
      missingItems: ['缺少建档附件']
    }
  }

  const documentTypes = [...new Set(documents.map((item) => item.documentType))]
  return {
    parseSummary: `已登记 ${documents.length} 份建档附件，覆盖${documentTypes.join('、')}`,
    parseSource: '来源：建档附件台账（人工补录）',
    warnings: documents.length < 2 ? ['建档附件数量较少，建议继续补充检测报告或凭证'] : [],
    missingItems: []
  }
}

const buildBaseRecord = (device?: Partial<DvMachineryVO> | null): AssetDeviceMasterRecordVO => {
  const base = resolveAssetDeviceProfile(device)
  const code = device?.code || ''
  const linkedBatteryCodes =
    code || device?.id
      ? listLinkedBatteries(code, device?.id).map((item) => item.batteryCode)
      : [...base.linkedBatteries]
  const inspections = clone(seededInspections[code] || [])
  const latestInspection = inspections[0]
  const enableStatus: AssetDeviceEnableStatus = 'enabled'
  return {
    code,
    machineryTypeName: device?.machineryTypeName || '',
    serialNumber: base.serialNumber,
    siteName: base.siteName,
    ownerName: base.ownerName,
    enableStatus,
    enableStatusLabel: ENABLE_STATUS_META[enableStatus].label,
    standardBatteryCodes: linkedBatteryCodes,
    currentStatus: 'pending_check',
    currentStatusLabel: CURRENT_STATUS_META.pending_check.label,
    currentStatusTagType: CURRENT_STATUS_META.pending_check.tagType,
    currentStage: base.currentStage,
    statusReason: base.statusReason,
    statusSource: base.statusSource,
    statusUpdatedAt:
      base.parseUpdatedAt === '-' ? dayjs().format('YYYY-MM-DD HH:mm') : base.parseUpdatedAt,
    warningLevel: 'info',
    warningLevelLabel: WARNING_LEVEL_META.info.label,
    warningSummary: '',
    recommendedAction: '',
    parseSummary: base.parseSummary,
    parseSource: base.parseSource,
    parseUpdatedAt: base.parseUpdatedAt,
    parsedFields: clone(base.parsedFields),
    warnings: [...base.warnings],
    missingItems: [...base.missingItems],
    workorderSummary: base.workorderSummary,
    linkedBatteries: linkedBatteryCodes,
    documents: clone(base.documents),
    history: clone(base.history),
    inspections,
    inspectionDueText: buildInspectionDueText({
      latestInspectionAt: latestInspection?.inspectedAt || '',
      currentStatus: 'pending_check',
      latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检',
      parseUpdatedAt: base.parseUpdatedAt,
      documents: base.documents
    }),
    latestInspectionAt: latestInspection?.inspectedAt || '',
    latestInspectionConclusion: latestInspection?.conclusionLabel || '暂无巡检',
    latestAttachmentWarning: base.missingItems[0] || base.warnings[0] || ''
  }
}

const normalizeRecord = (record: AssetDeviceMasterRecordVO): AssetDeviceMasterRecordVO => {
  const hasDocuments = record.documents.length > 0
  const documentSummary = buildDocumentSummary(record.documents)
  const normalizedHistory = record.history.filter(
    (item) => !(item.title === '建档附件重解析' && item.detail.includes('共处理 0 份附件'))
  )
  const normalizedWarnings = hasDocuments ? [...record.warnings] : [...documentSummary.warnings]
  const normalizedMissingItems = hasDocuments
    ? [...record.missingItems]
    : [...documentSummary.missingItems]
  const normalizedParseSummary = hasDocuments ? record.parseSummary : documentSummary.parseSummary
  const normalizedParseSource = hasDocuments ? record.parseSource : documentSummary.parseSource
  const normalizedParseUpdatedAt = hasDocuments ? record.parseUpdatedAt : '-'
  const normalizedInspections = record.inspections.map((item) => ({
    ...item,
    conclusionLabel: getInspectionConclusionLabel(item.conclusion)
  }))
  const latestInspection = normalizedInspections[0]
  const latestInspectionAt = latestInspection?.inspectedAt || ''
  const latestInspectionConclusion = latestInspection?.conclusionLabel || '暂无巡检'
  const derivedState = deriveRecordState({
    machineryTypeName: record.machineryTypeName,
    enableStatus: record.enableStatus,
    standardBatteryCodes: record.standardBatteryCodes,
    currentStage: record.currentStage,
    statusReason: record.statusReason,
    workorderSummary: record.workorderSummary,
    warnings: normalizedWarnings,
    missingItems: normalizedMissingItems,
    documents: record.documents,
    parseUpdatedAt: normalizedParseUpdatedAt,
    inspections: normalizedInspections
  })
  return {
    ...record,
    ...derivedState,
    enableStatusLabel: ENABLE_STATUS_META[record.enableStatus].label,
    latestInspectionAt,
    latestInspectionConclusion,
    parseSummary: normalizedParseSummary,
    parseSource: normalizedParseSource,
    parseUpdatedAt: normalizedParseUpdatedAt,
    inspectionDueText: buildInspectionDueText({
      latestInspectionAt,
      currentStatus: derivedState.currentStatus,
      latestInspectionConclusion,
      parseUpdatedAt: normalizedParseUpdatedAt,
      documents: record.documents
    }),
    documents: clone(record.documents),
    history: clone(normalizedHistory),
    parsedFields: clone(record.parsedFields),
    warnings: normalizedWarnings,
    missingItems: normalizedMissingItems,
    linkedBatteries: [...record.linkedBatteries],
    standardBatteryCodes: [...record.standardBatteryCodes],
    inspections: clone(normalizedInspections),
    latestAttachmentWarning: hasDocuments
      ? record.latestAttachmentWarning
      : documentSummary.missingItems[0] || documentSummary.warnings[0] || ''
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

export const refreshAssetDeviceRuleRecord = async (device?: Partial<DvMachineryVO> | null) => {
  if (!device?.id || !device.code) return resolveAssetDeviceMasterRecord(device)
  try {
    const remote = await evaluateDeviceAdmissionRuleRemote(device.id)
    syncRemoteRuleResultToStore(device.code, {
      enableStatus: remote.enableStatus,
      enableStatusLabel: remote.enableStatusLabel,
      currentStatus: remote.currentStatus,
      currentStatusLabel: remote.currentStatusLabel,
      currentStatusTagType: remote.currentStatusTagType,
      statusReason: remote.statusReason,
      statusSource: remote.statusSource,
      warningLevel: remote.warningLevel,
      warningLevelLabel: remote.warningLevelLabel,
      warningSummary: remote.warningSummary,
      recommendedAction: remote.recommendedAction,
      linkedBatteries: [...(remote.linkedBatteryCodes || [])],
      standardBatteryCodes: [...(remote.linkedBatteryCodes || [])],
      workorderSummary: remote.workorderSummary,
      warnings: [...(remote.warnings || [])],
      missingItems: [...(remote.missingItems || [])]
    })
  } catch {
    // Keep local derived record as fallback when backend rule service is not yet deployed.
  }
  return resolveAssetDeviceMasterRecord(device)
}

export const refreshAssetDeviceRuleRecords = async (
  devices: Array<Partial<DvMachineryVO> | null | undefined>
) => {
  await Promise.allSettled(devices.map((item) => refreshAssetDeviceRuleRecord(item)))
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
  const nextCode = normalizeIdentityValue(payload.code)
  const nextSerialNumber = normalizeIdentityValue(payload.serialNumber)
  const previousCode = normalizeIdentityValue(payload.previousCode)

  const duplicatedCode = Object.values(store).find(
    (item) =>
      normalizeIdentityValue(item.code) === nextCode &&
      normalizeIdentityValue(item.code) !== previousCode
  )
  if (duplicatedCode) {
    throw new Error(`设备编号重复：${payload.code}`)
  }

  const duplicatedSerialNumber = Object.values(store).find(
    (item) =>
      normalizeIdentityValue(item.serialNumber) === nextSerialNumber &&
      normalizeIdentityValue(item.code) !== previousCode
  )
  if (duplicatedSerialNumber) {
    throw new Error(`设备 SN 重复：${payload.serialNumber}`)
  }

  if (payload.previousCode && payload.previousCode !== payload.code) {
    delete store[payload.previousCode]
  }
  const updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  const nextRecord: AssetDeviceMasterRecordVO = normalizeRecord({
    ...current,
    code: payload.code,
    machineryTypeName: device?.machineryTypeName || current.machineryTypeName,
    serialNumber: payload.serialNumber,
    siteName: payload.siteName,
    ownerName: payload.ownerName,
    enableStatus: payload.enableStatus,
    standardBatteryCodes: [...payload.standardBatteryCodes],
    linkedBatteries: [...payload.standardBatteryCodes],
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
  { label: string; tone: AssetHistoryEventVO['tone'] }
> = {
  pass: { label: '合格', tone: 'success' },
  observe: { label: '观察', tone: 'warning' },
  grounded: { label: '异常', tone: 'danger' }
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
    suggestedWorkorder: payload.suggestedWorkorder,
    attachments: payload.attachments.map((item) => ({
      ...item,
      uploadedAt: item.uploadedAt || inspectedAt
    }))
  }
  const nextRecord = normalizeRecord({
    ...current,
    inspections: [record, ...current.inspections],
    history: [
      buildHistoryEvent(
        `设备巡检${record.conclusionLabel}`,
        `${payload.cycleLabel}由${payload.inspector}完成，结论为${record.conclusionLabel}。`,
        '设备巡检',
        CONCLUSION_META[payload.conclusion].tone,
        inspectedAt,
        payload.evidence ||
          (record.attachments.length
            ? `来源：${record.attachments.map((item) => item.fileName).join('、')}`
            : '来源：设备巡检')
      ),
      ...current.history
    ]
  })
  const store = getStore()
  store[payload.code] = nextRecord
  setStore(store)
  return nextRecord
}

export const linkInspectionWorkorderToDevice = (
  device: Partial<DvMachineryVO> | null | undefined,
  payload: {
    code: string
    orderNo: string
    creator: string
    createdAt?: string
  }
) => {
  const current = resolveAssetDeviceMasterRecord({
    ...device,
    code: payload.code
  })
  const createdAt = payload.createdAt || dayjs().format('YYYY-MM-DD HH:mm')
  const nextRecord = normalizeRecord({
    ...current,
    workorderSummary: `${payload.orderNo} 已由巡检异常生成工单，当前待受理`,
    statusUpdatedAt: createdAt,
    history: [
      buildHistoryEvent(
        '巡检异常转工单',
        `${payload.creator} 根据巡检异常发起工单 ${payload.orderNo}，后续请在工单中心继续跟进。`,
        '关联工单',
        'warning',
        createdAt,
        '来源：设备巡检'
      ),
      ...current.history
    ]
  })
  const store = getStore()
  store[payload.code] = nextRecord
  setStore(store)
  return nextRecord
}

const mergeRemoteDocumentParseResult = (
  current: AssetDeviceMasterRecordVO,
  payload: AssetDeviceDocumentUploadPayload,
  remote: YianAssetDeviceDocumentParseRespVO
) => {
  const uploadedAt =
    remote.parseUpdatedAt || payload.uploadedAt || dayjs().format('YYYY-MM-DD HH:mm')
  return normalizeRecord({
    ...current,
    parseSummary: remote.parseSummary,
    parseSource: remote.parseSource,
    parseUpdatedAt: uploadedAt,
    parsedFields: clone(remote.parsedFields || current.parsedFields),
    warnings: [...(remote.warnings || [])],
    missingItems: [...(remote.missingItems || [])],
    latestAttachmentWarning: remote.warnings?.[0] || remote.missingItems?.[0] || '',
    documents: clone(remote.documents || current.documents),
    history: [
      buildHistoryEvent(
        '建档附件解析完成',
        `${payload.uploadedBy} 上传并解析了 ${remote.documents?.length || payload.files?.length || 0} 份附件`,
        '建档附件',
        remote.mode === 'model' ? 'success' : 'warning',
        uploadedAt,
        `来源：${remote.parseSource}`
      ),
      ...current.history
    ]
  })
}

const syncAssetDeviceDocumentParseResult = (
  device: Partial<DvMachineryVO> | null | undefined,
  remote: YianAssetDeviceDocumentParseRespVO,
  historyTitle: string,
  historyDescription: string
) => {
  const current = resolveAssetDeviceMasterRecord(device)
  const updatedAt = remote.parseUpdatedAt || dayjs().format('YYYY-MM-DD HH:mm')
  const nextRecord = normalizeRecord({
    ...current,
    parseSummary: remote.parseSummary,
    parseSource: remote.parseSource,
    parseUpdatedAt: updatedAt,
    parsedFields: clone(remote.parsedFields || current.parsedFields),
    warnings: [...(remote.warnings || [])],
    missingItems: [...(remote.missingItems || [])],
    latestAttachmentWarning: remote.warnings?.[0] || remote.missingItems?.[0] || '',
    documents: clone(remote.documents || current.documents),
    history: [
      buildHistoryEvent(
        historyTitle,
        historyDescription,
        '建档附件',
        remote.mode === 'model' ? 'success' : 'warning',
        updatedAt,
        `来源：${remote.parseSource}`
      ),
      ...current.history
    ]
  })
  if (nextRecord.code) {
    const store = getStore()
    store[nextRecord.code] = nextRecord
    setStore(store)
  }
  return nextRecord
}

export const hydrateAssetDeviceDocumentParseFromRemote = async (
  device: Partial<DvMachineryVO> | null | undefined
) => {
  if (!device?.id && !device?.code) {
    return resolveAssetDeviceMasterRecord(device)
  }
  try {
    const remote = await YianAiApi.getLatestAssetDeviceDocuments({
      machineryId: device?.id ? Number(device.id) : undefined,
      code: device?.code || undefined
    })
    if (!remote) {
      return resolveAssetDeviceMasterRecord(device)
    }
    return syncAssetDeviceDocumentParseResult(
      device,
      remote,
      'Load persisted parse result',
      `Loaded the latest persisted archive parse result with ${remote.documents?.length || 0} document(s).`
    )
  } catch {
    return resolveAssetDeviceMasterRecord(device)
  }
}

export const uploadAssetDeviceDocument = async (
  device: Partial<DvMachineryVO> | null | undefined,
  payload: AssetDeviceDocumentUploadPayload
) => {
  const current = resolveAssetDeviceMasterRecord({
    ...device,
    code: payload.code
  })
  if (payload.files?.length && device?.id) {
    try {
      const remote = await YianAiApi.parseAssetDeviceDocuments({
        machineryId: Number(device.id),
        code: payload.code,
        uploadedBy: payload.uploadedBy,
        files: payload.files
      })
      const nextRecord = mergeRemoteDocumentParseResult(current, payload, remote)
      return syncAssetDeviceDocumentParseResult(
        { ...device, code: payload.code },
        {
          ...remote,
          parseUpdatedAt: nextRecord.parseUpdatedAt
        },
        '建档附件解析完成',
        `${payload.uploadedBy} uploaded and parsed ${remote.documents?.length || payload.files?.length || 0} archive file(s).`
      )
    } catch {
      // Fall back to the original local parser when the backend AI endpoint is unavailable.
    }
  }
  const uploadedAt = payload.uploadedAt || dayjs().format('YYYY-MM-DD HH:mm')
  const documentType = getDocumentTypeFromFileName(payload.fileName)
  const document: AssetDocumentVO = {
    id: `asset-document-${payload.code}-${Date.now()}`,
    fileName: payload.fileName,
    documentType,
    parseResult: buildDocumentParseResult(documentType),
    parseSource: '人工补录',
    uploadedBy: payload.uploadedBy,
    uploadedAt
  }
  const documents = [document, ...current.documents]
  const summary = buildDocumentSummary(documents)
  const nextRecord = normalizeRecord({
    ...current,
    parseSummary: summary.parseSummary,
    parseSource: summary.parseSource,
    parseUpdatedAt: uploadedAt,
    warnings: summary.warnings,
    missingItems: summary.missingItems,
    latestAttachmentWarning: summary.warnings[0] || '',
    documents,
    history: [
      buildHistoryEvent(
        '建档附件上传',
        `${payload.uploadedBy} 上传了 ${payload.fileName}`,
        '建档附件',
        'info',
        uploadedAt,
        `来源：${documentType}`
      ),
      ...current.history
    ]
  })
  const store = getStore()
  store[payload.code] = nextRecord
  setStore(store)
  return nextRecord
}

export const reparseAssetDeviceDocuments = async (
  device: Partial<DvMachineryVO> | null | undefined,
  code: string,
  operator: string
) => {
  const current = resolveAssetDeviceMasterRecord({
    ...device,
    code
  })
  if (!current.documents.length) {
    return current
  }
  if (device?.id) {
    try {
      const remote = await YianAiApi.reparseAssetDeviceDocuments({
        machineryId: Number(device.id),
        code,
        operator,
        fileNames: current.documents.map((item) => item.fileName)
      })
      return syncAssetDeviceDocumentParseResult(
        { ...device, code },
        remote,
        '建档附件重新解析完成',
        `${operator} re-ran archive parsing for ${current.documents.length} file(s).`
      )
      const nextRecord = normalizeRecord({
        ...current,
        parseSummary: remote.parseSummary,
        parseSource: remote.parseSource,
        parseUpdatedAt: remote.parseUpdatedAt,
        parsedFields: clone(remote.parsedFields || current.parsedFields),
        warnings: [...(remote.warnings || [])],
        missingItems: [...(remote.missingItems || [])],
        latestAttachmentWarning: remote.warnings?.[0] || remote.missingItems?.[0] || '',
        documents: clone(remote.documents || current.documents),
        history: [
          buildHistoryEvent(
            '建档附件重新解析',
            `${operator} 触发建档附件重新解析，共处理 ${current.documents.length} 份附件`,
            '建档附件',
            remote.mode === 'model' ? 'success' : 'warning',
            remote.parseUpdatedAt,
            `来源：${remote.parseSource}`
          ),
          ...current.history
        ]
      })
      const store = getStore()
      store[code] = nextRecord
      setStore(store)
      return nextRecord
    } catch {
      // Fall back to the original local parser when the backend AI endpoint is unavailable.
    }
  }
  const updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  const summary = buildDocumentSummary(current.documents)
  const nextRecord = normalizeRecord({
    ...current,
    parseSummary: summary.parseSummary,
    parseSource: current.documents.length ? '来源：建档附件台账重新解析' : summary.parseSource,
    parseUpdatedAt: updatedAt,
    warnings: summary.warnings,
    missingItems: summary.missingItems,
    latestAttachmentWarning: summary.warnings[0] || '',
    documents: current.documents.map((item) => ({
      ...item,
      parseSource: current.documents.length ? '重新解析' : item.parseSource,
      parseResult: buildDocumentParseResult(item.documentType)
    })),
    history: [
      buildHistoryEvent(
        '建档附件重解析',
        `${operator} 触发建档附件重解析，共处理 ${current.documents.length} 份附件`,
        '建档附件',
        'warning',
        updatedAt,
        '来源：附件解析'
      ),
      ...current.history
    ]
  })
  const store = getStore()
  store[code] = nextRecord
  setStore(store)
  return nextRecord
}

export const getDeviceEnableStatusByMachineryStatus = (
  status?: number
): AssetDeviceEnableStatus => {
  return status === MesDvMachineryStatusEnum.STOP ? 'disabled' : 'enabled'
}

export const getMachineryStatusByEnableStatus = (enableStatus: AssetDeviceEnableStatus) =>
  ENABLE_STATUS_META[enableStatus].machineryStatus

export const listDeviceBatteryOptions = () =>
  listAssetBattery().map((item) => ({
    label: `${item.batteryCode} / ${item.serialNumber}`,
    value: item.batteryCode
  }))
