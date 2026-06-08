import dayjs from 'dayjs'
import type { DvMachineryVO } from '@/api/mes/dv/machinery'
import type { AssetBatteryVO as BackendAssetBatteryVO } from '@/api/yian/asset/backend'
import { isLocalMesDemoEnabled } from '@/api/mes/localDemo'
import { useCache } from '@/hooks/web/useCache'
import { evaluateBatteryRule, yianRuleRuntimeVersion } from '@/api/yian/config/rule'

export type AssetRiskTone = 'success' | 'warning' | 'danger' | 'info'

export interface AssetInspectionAttachmentVO {
  id: string
  fileName: string
  category: '图片' | '日志' | '附件'
  summary: string
  uploadedAt: string
  uploadedBy: string
  sizeLabel?: string
}

export interface AssetDocumentVO {
  id: string
  fileName: string
  documentType: string
  parseResult: string
  parseSource: string
  uploadedBy: string
  uploadedAt: string
}

export interface AssetHistoryEventVO {
  id: string
  happenedAt: string
  title: string
  detail: string
  stage: string
  evidence: string
  tone: AssetRiskTone
}

export interface AssetBatteryVO {
  id: string
  createTime?: string
  batteryCode: string
  serialNumber: string
  model: string
  siteName: string
  linkedDeviceId?: number
  linkedDeviceCode?: string
  linkedDeviceName?: string
  soh: number
  cycleCount: number
  lastCheckAt: string
  checkSource: string
  healthStatus: 'normal' | 'warning' | 'danger'
  healthLabel: string
  sourceEvidence: string
  recommendation: string
}

export interface AssetBatteryInspectionVO {
  id: string
  inspectedAt: string
  inspector: string
  source: string
  conclusion: string
  summary: string
  notes?: string
  evidence: string
  attachments: AssetInspectionAttachmentVO[]
  parsedMetrics?: AssetBatteryParsedMetrics
}

export interface AssetBatteryAttachmentVO {
  id: string
  fileName: string
  category: string
  summary: string
  uploadedAt: string
  uploadedBy: string
}

export interface AssetBatteryCorrectionVO {
  id: string
  detectedAt: string
  summary: string
  detail: string
  actionHint: string
  tone: AssetRiskTone
}

export interface AssetBatteryParsedMetrics {
  sourceFileName?: string
  sourceType?: string
  serialNumber?: string
  linkedDeviceCode?: string
  soh?: number
  cycleCount?: number
  maxVoltageDiff?: number
  maxTemperature?: number
}

export interface AssetBatteryProfileVO {
  healthScore?: number
  healthScoreLabel: string
  healthScoreTone: AssetRiskTone
  dataConfidenceLabel?: string
  dataConfidenceTone?: AssetRiskTone
  currentOwnerName: string
  standardDeviceCode?: string
  standardDeviceName?: string
  actualMountedDeviceCode?: string
  actualMountedDeviceName?: string
  inspectionStatus: string
  inspectionDueText: string
  latestDiffSummary?: string
  scoreBreakdown: Array<{
    label: string
    value: string
    tone?: AssetRiskTone
  }>
  pendingData?: Array<{
    label: string
    status: string
    detail: string
    tone?: AssetRiskTone
  }>
  inspectionRecords: AssetBatteryInspectionVO[]
  attachments: AssetBatteryAttachmentVO[]
  correctionHints: AssetBatteryCorrectionVO[]
  remarks: string[]
}

export interface AssetBatteryInspectionPayload {
  batteryCode: string
  inspectedAt: string
  inspector: string
  source: string
  conclusion: 'pass' | 'observe' | 'grounded'
  summary: string
  notes: string
  attachments: AssetInspectionAttachmentVO[]
  parsedMetrics?: AssetBatteryParsedMetrics | null
}

export interface AssetDeviceProfileVO {
  assetCategory: string
  siteName: string
  serialNumber: string
  ownerName: string
  currentStage: string
  statusReason: string
  statusSource: string
  parseSummary: string
  parseSource: string
  parseUpdatedAt: string
  parsedFields: Array<{
    label: string
    value: string
  }>
  warnings: string[]
  missingItems: string[]
  workorderSummary: string
  linkedBatteries: string[]
  documents: AssetDocumentVO[]
  history: AssetHistoryEventVO[]
}

const batteryAssets: AssetBatteryVO[] = [
  {
    id: 'bat-001',
    batteryCode: 'YA-BT-00891',
    serialNumber: 'BT24PO31052',
    model: 'TB65',
    siteName: '杭州余杭站',
    linkedDeviceId: 1201,
    linkedDeviceCode: 'UAV-MVP-001',
    linkedDeviceName: 'Inspection UAV 01',
    soh: 87,
    cycleCount: 186,
    lastCheckAt: '2026-05-10 08:40',
    checkSource: '检测报告',
    healthStatus: 'warning',
    healthLabel: '待检观察',
    sourceEvidence: '已解析 1 份检测报告，人工确认上传',
    recommendation: '建议进入重点观察，不建议执行长航时任务'
  },
  {
    id: 'bat-002',
    batteryCode: 'YA-BT-00912',
    serialNumber: 'BT25HZ01018',
    model: 'TB65',
    siteName: '杭州余杭站',
    linkedDeviceId: 1201,
    linkedDeviceCode: 'UAV-MVP-001',
    linkedDeviceName: 'Inspection UAV 01',
    soh: 93,
    cycleCount: 72,
    lastCheckAt: '2026-05-08 14:20',
    checkSource: 'BMS',
    healthStatus: 'normal',
    healthLabel: '状态正常',
    sourceEvidence: 'BMS 自动同步，最近一次健康检查已回传',
    recommendation: '可正常执行巡检任务'
  },
  {
    id: 'bat-003',
    batteryCode: 'YA-BT-01003',
    serialNumber: 'BT24SU22731',
    model: 'TB65',
    siteName: '苏州工业园站',
    linkedDeviceId: 1202,
    linkedDeviceCode: 'UAV-MVP-002',
    linkedDeviceName: 'Inspection UAV 02',
    soh: 78,
    cycleCount: 244,
    lastCheckAt: '2026-05-09 17:30',
    checkSource: '检测工装',
    healthStatus: 'warning',
    healthLabel: '寿命预警',
    sourceEvidence: '工装检测结果已上传，寿命接近限制阈值',
    recommendation: '限制执行白天短航时任务，并安排复检'
  },
  {
    id: 'bat-004',
    batteryCode: 'YA-BT-01007',
    serialNumber: 'BT24SU22739',
    model: 'TB65',
    siteName: '苏州工业园站',
    linkedDeviceId: 1202,
    linkedDeviceCode: 'UAV-MVP-002',
    linkedDeviceName: 'Inspection UAV 02',
    soh: 61,
    cycleCount: 398,
    lastCheckAt: '2026-05-06 11:10',
    checkSource: '人工导入',
    healthStatus: 'danger',
    healthLabel: '禁止放行',
    sourceEvidence: '人工导入检测结果并附检测附件，命中低寿命强规则',
    recommendation: '禁止放行，需完成更换后再绑定主机'
  }
]

const BATTERY_PROFILE_STORAGE_KEY = 'yian_asset_battery_profile_v1'
const { wsCache } = useCache()

const deviceProfiles: Record<string, AssetDeviceProfileVO> = {
  'UAV-MVP-001': {
    assetCategory: '单台主机',
    siteName: '杭州余杭站',
    serialNumber: 'AC24HZ92031',
    ownerName: '周启明',
    currentStage: '停飞待放行',
    statusReason: '维修完成且复检通过，当前仍有 1 个待放行节点未闭环',
    statusSource: '来源：维修记录、复检记录、在途工单',
    parseSummary: '已解析 4 份主档资料，当前无证照冲突',
    parseSource: '来源：建档附件与检测报告',
    parseUpdatedAt: '2026-05-10 09:20',
    parsedFields: [
      { label: '设备编号', value: 'YA-AC-00131' },
      { label: '站点绑定', value: '杭州余杭站 / 周启明' },
      { label: '主机机型', value: 'Matrice 350 RTK' },
      { label: '适飞标签', value: '待放行 / 需审核' }
    ],
    warnings: ['当前仍命中“放行前需人工复核”提示，不能直接改成可飞'],
    missingItems: ['未识别到 2026 年度校准附件，建议补传最新版记录'],
    workorderSummary: 'WO-20260502-018 正在待放行，维修与复检资料已齐',
    linkedBatteries: ['YA-BT-00891', 'YA-BT-00912'],
    documents: [
      {
        id: 'doc-001',
        fileName: '校准记录_2025.pdf',
        documentType: '校准资料',
        parseResult: '识别到设备编号与有效期，但缺少 2026 年新版本',
        parseSource: '主档解析',
        uploadedBy: '周启明',
        uploadedAt: '2025-12-08 15:12'
      },
      {
        id: 'doc-002',
        fileName: '合格证_AC24HZ92031.pdf',
        documentType: '合格证',
        parseResult: '设备型号、编号与主档一致',
        parseSource: '主档解析',
        uploadedBy: '周启明',
        uploadedAt: '2025-11-30 10:13'
      },
      {
        id: 'doc-003',
        fileName: '采购凭证_PO20251130.pdf',
        documentType: '采购凭证',
        parseResult: '已识别供应商与到货批次',
        parseSource: '主档解析',
        uploadedBy: '周启明',
        uploadedAt: '2025-11-30 10:15'
      },
      {
        id: 'doc-004',
        fileName: '首飞检查单_20251130.jpg',
        documentType: '首飞检查单',
        parseResult: '已识别责任人与首飞时间',
        parseSource: '人工补录',
        uploadedBy: '周启明',
        uploadedAt: '2025-11-30 10:18'
      }
    ],
    history: [
      {
        id: 'his-001',
        happenedAt: '2026-05-10 09:00',
        title: '当前状态：停飞待放行',
        detail: '设备已维修并复检通过，当前仍需放行审核确认后才能恢复可飞。',
        stage: '设备状态',
        evidence: '来源：复检记录、工单状态',
        tone: 'warning'
      },
      {
        id: 'his-002',
        happenedAt: '2026-05-09 11:00',
        title: '复检通过',
        detail: '返航测试通过，试飞视频与截图已补齐，设备从维修中进入待放行。',
        stage: '复检',
        evidence: '来源：复检附件、试飞记录',
        tone: 'success'
      },
      {
        id: 'his-003',
        happenedAt: '2026-05-08 16:30',
        title: '维修完成',
        detail: '完成云台偏移维修并补齐维修照片、参数截图和更换件记录。',
        stage: '维修执行',
        evidence: '来源：维修工单、领料记录',
        tone: 'info'
      },
      {
        id: 'his-004',
        happenedAt: '2026-03-26 09:10',
        title: '限制放行',
        detail: '因风速传感器异常，附加“白天巡检”限制条件后放行。',
        stage: '放行审核',
        evidence: '来源：放行审核记录',
        tone: 'warning'
      },
      {
        id: 'his-005',
        happenedAt: '2025-11-30 10:18',
        title: '设备建档启用',
        detail: '完成单机建档、站点绑定和责任人分配，首次进入设备台账。',
        stage: '建档',
        evidence: '来源：建档附件、主档创建',
        tone: 'success'
      }
    ]
  },
  'UAV-MVP-002': {
    assetCategory: '单台主机',
    siteName: '苏州工业园站',
    serialNumber: 'AC26SU73088',
    ownerName: '罗家诚',
    currentStage: '待检观察',
    statusReason: '已命中 1 条电池寿命预警规则，当前建议优先完成健康复检',
    statusSource: '来源：电池健康检测结果',
    parseSummary: '已解析 3 份主档资料，需补充最新检测证明',
    parseSource: '来源：建档附件',
    parseUpdatedAt: '2026-05-09 18:10',
    parsedFields: [
      { label: '设备编号', value: 'YA-AC-00188' },
      { label: '站点绑定', value: '苏州工业园站 / 罗家诚' },
      { label: '主机机型', value: 'EVO Max 4T' },
      { label: '观察项', value: '电池寿命预警' }
    ],
    warnings: ['关联电池 YA-BT-01007 命中低寿命强规则，当前不建议安排放飞任务'],
    missingItems: ['缺少最新版年度检测证明，无法确认当前寿命恢复情况'],
    workorderSummary: '当前无在途维修工单，建议从资产中心发起检测或建单',
    linkedBatteries: ['YA-BT-01003', 'YA-BT-01007'],
    documents: [
      {
        id: 'doc-005',
        fileName: '检测报告_20260509.pdf',
        documentType: '检测报告',
        parseResult: '识别到电池寿命预警，但需人工确认是否更换完成',
        parseSource: '主档解析',
        uploadedBy: '罗家诚',
        uploadedAt: '2026-05-09 18:10'
      },
      {
        id: 'doc-006',
        fileName: '合格证_AC26SU73088.pdf',
        documentType: '合格证',
        parseResult: '设备编号与主档一致',
        parseSource: '主档解析',
        uploadedBy: '罗家诚',
        uploadedAt: '2026-04-02 09:11'
      },
      {
        id: 'doc-007',
        fileName: '采购凭证_PO20260401.pdf',
        documentType: '采购凭证',
        parseResult: '已识别供应商与批次信息',
        parseSource: '人工补录',
        uploadedBy: '罗家诚',
        uploadedAt: '2026-04-01 16:40'
      }
    ],
    history: [
      {
        id: 'his-101',
        happenedAt: '2026-05-09 18:10',
        title: '电池健康预警',
        detail: '检测结果提示 1 组绑定电池寿命不足，设备进入待检观察。',
        stage: '资产预警',
        evidence: '来源：检测报告、规则命中',
        tone: 'warning'
      },
      {
        id: 'his-102',
        happenedAt: '2026-04-06 14:00',
        title: '首飞检查通过',
        detail: '已完成首飞检查并更新责任人、站点与附件信息。',
        stage: '建档',
        evidence: '来源：首飞检查单',
        tone: 'success'
      },
      {
        id: 'his-103',
        happenedAt: '2026-04-01 16:40',
        title: '设备建档启用',
        detail: '完成主档建立与附件上传，进入设备台账。',
        stage: '建档',
        evidence: '来源：主档创建、采购凭证',
        tone: 'success'
      }
    ]
  }
}

const buildDefaultProfile = (device?: Partial<DvMachineryVO> | null): AssetDeviceProfileVO => ({
  assetCategory: '单台主机',
  siteName: '待补录',
  serialNumber: `${device?.code || 'UNKNOWN'}-SN`,
  ownerName: '待补录',
  currentStage: '主档在册',
  statusReason: '当前仅存在基础主档信息，尚未补充完整解析与履历',
  statusSource: '来源：设备主档',
  parseSummary: '暂未接入主档解析结果',
  parseSource: '来源：待补录',
  parseUpdatedAt: '-',
  parsedFields: [
    { label: '设备编号', value: device?.code || '-' },
    { label: '设备名称', value: device?.name || '-' }
  ],
  warnings: [],
  missingItems: ['待补录建档附件与检测资料'],
  workorderSummary: '当前无在途工单',
  linkedBatteries: [],
  documents: [],
  history: []
})

const cloneDocuments = (documents: AssetDocumentVO[]) => documents.map((item) => ({ ...item }))
const cloneHistory = (history: AssetHistoryEventVO[]) => history.map((item) => ({ ...item }))
const cloneBatteryInspection = (records: AssetBatteryInspectionVO[]) =>
  records.map((item) => ({
    ...item,
    parsedMetrics: item.parsedMetrics ? { ...item.parsedMetrics } : undefined,
    attachments: item.attachments?.map((file) => ({ ...file })) || []
  }))
const cloneBatteryAttachments = (attachments: AssetBatteryAttachmentVO[]) =>
  attachments.map((item) => ({ ...item }))
const cloneBatteryCorrections = (corrections: AssetBatteryCorrectionVO[]) =>
  corrections.map((item) => ({ ...item }))

type BatteryProfileStoreEntry = {
  inspectionRecords?: AssetBatteryInspectionVO[]
  archiveAttachments?: AssetBatteryAttachmentVO[]
  correctionHints?: AssetBatteryCorrectionVO[]
  remarks?: string[]
  latestMetrics?: AssetBatteryParsedMetrics | null
}

const BATTERY_ARCHIVE_STORAGE_KEY = 'yian_asset_battery_archive_v1'

const getBatteryProfileStore = (): Record<string, BatteryProfileStoreEntry> =>
  ((wsCache.get(BATTERY_PROFILE_STORAGE_KEY) as Record<string, BatteryProfileStoreEntry> | undefined) || {})

const setBatteryProfileStore = (value: Record<string, BatteryProfileStoreEntry>) => {
  wsCache.set(BATTERY_PROFILE_STORAGE_KEY, value)
}

const getBatteryArchiveStore = (): BackendAssetBatteryVO[] =>
  ((wsCache.get(BATTERY_ARCHIVE_STORAGE_KEY) as BackendAssetBatteryVO[] | undefined) || []).map((item) => ({
    ...item
  }))

const setBatteryArchiveStore = (value: BackendAssetBatteryVO[]) => {
  wsCache.set(
    BATTERY_ARCHIVE_STORAGE_KEY,
    value.map((item) => ({ ...item }))
  )
}

export const resolveAssetDeviceProfile = (
  device?: Partial<DvMachineryVO> | null
): AssetDeviceProfileVO => {
  const code = device?.code || ''
  const profile = deviceProfiles[code]
  if (!profile) {
    return buildDefaultProfile(device)
  }
  return {
    ...profile,
    documents: cloneDocuments(profile.documents),
    history: cloneHistory(profile.history)
  }
}

const toAssetBatteryVO = (battery: BackendAssetBatteryVO): AssetBatteryVO => ({
  id: String(battery.id || battery.batteryCode || ''),
  createTime: battery.createTime,
  batteryCode: battery.batteryCode,
  serialNumber: battery.serialNumber,
  model: battery.model,
  siteName: battery.workshopName || '',
  linkedDeviceId: battery.linkedDeviceId,
  linkedDeviceCode: battery.linkedDeviceCode,
  linkedDeviceName: battery.linkedDeviceName,
  soh: battery.soh,
  cycleCount: battery.cycleCount,
  lastCheckAt: battery.lastCheckAt || battery.lastCheckTime || '',
  checkSource: battery.checkSource,
  healthStatus: battery.healthStatus,
  healthLabel: battery.healthLabel,
  sourceEvidence: battery.sourceEvidence,
  recommendation: battery.recommendation
})

const applyBatteryRule = (battery: AssetBatteryVO): AssetBatteryVO => {
  const outcome = evaluateBatteryRule({
    soh: battery.soh,
    lastCheckAt: battery.lastCheckAt,
    checkSource: battery.checkSource,
    recommendation: battery.recommendation
  })
  return {
    ...battery,
    healthStatus: outcome.healthStatus,
    healthLabel: outcome.healthLabel,
    recommendation: outcome.recommendation
  }
}

export const listAssetBattery = (): AssetBatteryVO[] => {
  void yianRuleRuntimeVersion.value
  const merged = new Map<string, AssetBatteryVO>()
  if (isLocalMesDemoEnabled()) {
    batteryAssets.forEach((item) => {
      merged.set(item.batteryCode, applyBatteryRule({ ...item }))
    })
  }
  getBatteryArchiveStore().forEach((item) => {
    if (!item.batteryCode) return
    merged.set(item.batteryCode, applyBatteryRule(toAssetBatteryVO(item)))
  })
  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = dayjs(left.createTime || left.lastCheckAt || 0).valueOf()
    const rightTime = dayjs(right.createTime || right.lastCheckAt || 0).valueOf()
    return rightTime - leftTime
  })
}

export const listLinkedBatteries = (deviceCode?: string, deviceId?: number) =>
  listAssetBattery().filter((item) => {
    if (deviceCode && item.linkedDeviceCode === deviceCode) {
      return true
    }
    if (deviceId && item.linkedDeviceId === deviceId) {
      return true
    }
    return false
  })

type AssetBatteryLike = Partial<BackendAssetBatteryVO> &
  Partial<Omit<AssetBatteryVO, 'id'>> & {
    batteryCode?: string
    siteName?: string
  }

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const buildCycleScore = (cycleCount?: number) => {
  if (!isNumber(cycleCount)) return undefined
  if (cycleCount <= 100) return 100
  if (cycleCount <= 200) return 90
  if (cycleCount <= 300) return 75
  if (cycleCount <= 400) return 55
  return 35
}

const buildVoltageDiffScore = (diff?: number) => {
  if (!isNumber(diff)) return undefined
  if (diff <= 0.03) return 100
  if (diff <= 0.05) return 85
  if (diff <= 0.08) return 65
  return 40
}

const getInspectionScore = (inspection?: AssetBatteryInspectionVO) => {
  if (!inspection) return undefined
  if (inspection.conclusion === '异常') return 45
  if (inspection.conclusion === '观察') return 75
  return 100
}

const resolveHealthToneByScore = (score?: number): AssetRiskTone => {
  if (!isNumber(score)) return 'info'
  if (score >= 90) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

const buildHealthSummary = (
  soh: number | undefined,
  cycleCount: number | undefined,
  maxVoltageDiff: number | undefined,
  latestInspection?: AssetBatteryInspectionVO
) => {
  const weighted: Array<{
    score: number
    weight: number
    label: string
    value: string
    tone?: AssetRiskTone
  }> = []

  if (isNumber(soh)) {
    weighted.push({
      score: clamp(soh, 0, 100),
      weight: 0.45,
      label: 'SOH',
      value: `${soh}%`
    })
  }

  const cycleScore = buildCycleScore(cycleCount)
  if (isNumber(cycleScore) && isNumber(cycleCount)) {
    weighted.push({
      score: cycleScore,
      weight: 0.25,
      label: '循环次数',
      value: `${cycleCount} 次`,
      tone: cycleScore < 60 ? 'danger' : cycleScore < 80 ? 'warning' : 'success'
    })
  }

  const diffScore = buildVoltageDiffScore(maxVoltageDiff)
  if (isNumber(diffScore) && isNumber(maxVoltageDiff)) {
    weighted.push({
      score: diffScore,
      weight: 0.2,
      label: '最大压差',
      value: `${maxVoltageDiff.toFixed(2)}V`,
      tone: diffScore < 60 ? 'danger' : diffScore < 80 ? 'warning' : 'success'
    })
  }

  const inspectionScore = getInspectionScore(latestInspection)
  if (isNumber(inspectionScore) && latestInspection) {
    weighted.push({
      score: inspectionScore,
      weight: 0.1,
      label: '最近巡检',
      value: latestInspection.conclusion,
      tone: inspectionScore < 60 ? 'danger' : inspectionScore < 80 ? 'warning' : 'success'
    })
  }

  if (!weighted.length) {
    return {
      healthScore: undefined,
      healthScoreLabel: '-',
      healthScoreTone: 'info' as AssetRiskTone,
      dataConfidenceLabel: '-',
      dataConfidenceTone: 'info' as AssetRiskTone,
      scoreBreakdown: [] as AssetBatteryProfileVO['scoreBreakdown']
    }
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  const healthScore = Math.round(
    weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight
  )
  const confidence = Math.round(totalWeight * 100)
  const healthScoreTone = resolveHealthToneByScore(healthScore)
  const dataConfidenceTone: AssetRiskTone =
    confidence >= 85 ? 'success' : confidence >= 60 ? 'warning' : 'info'

  return {
    healthScore,
    healthScoreLabel: `${healthScore} 分`,
    healthScoreTone,
    dataConfidenceLabel: `${confidence}%`,
    dataConfidenceTone,
    scoreBreakdown: weighted.map((item) => ({
      label: item.label,
      value: item.value,
      tone: item.tone
    }))
  }
}

const buildPendingData = (
  battery: AssetBatteryLike | null | undefined,
  inspectionRecords: AssetBatteryInspectionVO[],
  attachments: AssetBatteryAttachmentVO[],
  latestMetrics?: AssetBatteryParsedMetrics | null
) => {
  const pendingData: NonNullable<AssetBatteryProfileVO['pendingData']> = []

  if (!inspectionRecords.length) {
    pendingData.push({
      label: '最近巡检',
      status: '待补录',
      detail: '当前还没有电池巡检记录，请先发起巡检。',
      tone: 'warning'
    })
  }

  if (!attachments.length) {
    pendingData.push({
      label: '附件与日志',
      status: '待补录',
      detail: '尚未上传检测日志或现场附件，无法补充健康依据。',
      tone: 'info'
    })
  }

  if (!isNumber(latestMetrics?.maxVoltageDiff)) {
    pendingData.push({
      label: '最大压差',
      status: '待补录',
      detail: '尚未从日志或检测文件中读取最大压差。',
      tone: 'info'
    })
  }

  if (!battery?.linkedDeviceCode) {
    pendingData.push({
      label: '关联主机',
      status: '待补录',
      detail: '当前未维护关联主机，后续日志校验无法比对挂载关系。',
      tone: 'warning'
    })
  }

  return pendingData
}

const buildCorrectionHints = (
  battery: AssetBatteryLike | null | undefined,
  latestMetrics?: AssetBatteryParsedMetrics | null
) => {
  const correctionHints: AssetBatteryCorrectionVO[] = []
  if (!latestMetrics) return correctionHints

  if (
    latestMetrics.serialNumber &&
    battery?.serialNumber &&
    latestMetrics.serialNumber !== battery.serialNumber
  ) {
    correctionHints.push({
      id: `battery-correction-sn-${battery?.batteryCode || Date.now()}`,
      detectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      summary: '日志识别的电池 SN 与主档不一致',
      detail: `主档 SN：${battery.serialNumber}；日志识别：${latestMetrics.serialNumber}`,
      actionHint: '请先核实电池 SN，确认后再更新主档或日志归属。',
      tone: 'danger'
    })
  }

  if (
    latestMetrics.linkedDeviceCode &&
    battery?.linkedDeviceCode &&
    latestMetrics.linkedDeviceCode !== battery.linkedDeviceCode
  ) {
    correctionHints.push({
      id: `battery-correction-device-${battery?.batteryCode || Date.now()}`,
      detectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      summary: '日志识别的挂载主机与当前关联主机不一致',
      detail: `当前关联：${battery.linkedDeviceCode}；日志识别：${latestMetrics.linkedDeviceCode}`,
      actionHint: '请核实是否为临时换挂，确认后再更新关联主机信息。',
      tone: 'warning'
    })
  }

  return correctionHints
}

const buildBatteryRemarks = (inspectionRecords: AssetBatteryInspectionVO[]) =>
  inspectionRecords
    .map((item) => String(item.notes || '').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)

const buildDefaultBatteryProfile = (battery?: AssetBatteryLike | null): AssetBatteryProfileVO => ({
  healthScore: undefined,
  healthScoreLabel: '-',
  healthScoreTone: 'info',
  dataConfidenceLabel: '-',
  dataConfidenceTone: 'info',
  currentOwnerName: '',
  standardDeviceCode: battery?.linkedDeviceCode,
  standardDeviceName: battery?.linkedDeviceName,
  actualMountedDeviceCode: battery?.linkedDeviceCode,
  actualMountedDeviceName: battery?.linkedDeviceName,
  inspectionStatus: battery?.healthLabel || '-',
  inspectionDueText: '',
  latestDiffSummary: '-',
  scoreBreakdown: [],
  pendingData: [],
  inspectionRecords: [],
  attachments: [],
  correctionHints: [],
  remarks: []
})

export const resolveAssetBatteryProfile = (
  battery?: AssetBatteryLike | null
): AssetBatteryProfileVO => {
  const code = battery?.batteryCode || ''
  const defaultProfile = buildDefaultBatteryProfile(battery)
  const cached = getBatteryProfileStore()[code]
  const inspectionRecords = cloneBatteryInspection(cached?.inspectionRecords || [])
  const attachments = cloneBatteryAttachments(cached?.archiveAttachments || [])
  const latestMetrics = cached?.latestMetrics || null
  const latestInspection = inspectionRecords[0]
  const derivedSoh = isNumber(latestMetrics?.soh) ? latestMetrics?.soh : battery?.soh
  const derivedCycleCount = isNumber(latestMetrics?.cycleCount)
    ? latestMetrics?.cycleCount
    : battery?.cycleCount
  const derivedDiff = latestMetrics?.maxVoltageDiff
  const healthSummary = buildHealthSummary(
    derivedSoh,
    derivedCycleCount,
    derivedDiff,
    latestInspection
  )
  const correctionHints = cloneBatteryCorrections(
    buildCorrectionHints(battery, latestMetrics)
  )

  return {
    ...defaultProfile,
    healthScore: healthSummary.healthScore,
    healthScoreLabel: healthSummary.healthScoreLabel,
    healthScoreTone: healthSummary.healthScoreTone,
    dataConfidenceLabel: healthSummary.dataConfidenceLabel,
    dataConfidenceTone: healthSummary.dataConfidenceTone,
    latestDiffSummary: isNumber(derivedDiff)
      ? `${derivedDiff.toFixed(2)}V / 来源：${latestMetrics?.sourceType || battery?.checkSource || '日志'}`
      : '-',
    scoreBreakdown: healthSummary.scoreBreakdown,
    pendingData: buildPendingData(battery, inspectionRecords, attachments, latestMetrics),
    inspectionRecords,
    attachments,
    correctionHints,
    remarks: buildBatteryRemarks(inspectionRecords)
  }
}

const getBatteryConclusionLabel = (conclusion: AssetBatteryInspectionPayload['conclusion']) => {
  if (conclusion === 'grounded') return '异常'
  if (conclusion === 'observe') return '观察'
  return '合格'
}

const buildInspectionDrivenBatteryOutcome = (
  current: AssetBatteryLike | null | undefined,
  payload: AssetBatteryInspectionPayload,
  inspectedAt: string
) => {
  const soh = isNumber(payload.parsedMetrics?.soh)
    ? clamp(payload.parsedMetrics!.soh, 0, 100)
    : current?.soh || 100
  const cycleCount = isNumber(payload.parsedMetrics?.cycleCount)
    ? Math.max(0, payload.parsedMetrics!.cycleCount)
    : current?.cycleCount || 0
  const baseOutcome = evaluateBatteryRule({
    soh,
    cycleCount,
    lastCheckAt: inspectedAt,
    checkSource: payload.source,
    recommendation: current?.recommendation
  })

  if (payload.conclusion === 'grounded' && baseOutcome.healthStatus !== 'danger') {
    return {
      healthStatus: 'danger' as const,
      healthLabel: '禁止放行',
      recommendation: '本次巡检判定异常，建议立即停用并安排复核、维修或更换。'
    }
  }

  if (payload.conclusion === 'observe' && baseOutcome.healthStatus === 'normal') {
    return {
      healthStatus: 'warning' as const,
      healthLabel: '限制放行',
      recommendation: '本次巡检判定观察，建议限制放行并尽快安排复检。'
    }
  }

  return {
    healthStatus: baseOutcome.healthStatus,
    healthLabel: baseOutcome.healthLabel,
    recommendation: baseOutcome.recommendation
  }
}

export const submitAssetBatteryInspection = (
  batteryCode: string,
  payload: AssetBatteryInspectionPayload
) => {
  const current = resolveAssetBatteryProfile({ batteryCode })
  const inspectedAt = payload.inspectedAt || dayjs().format('YYYY-MM-DD HH:mm')
  const conclusionLabel = getBatteryConclusionLabel(payload.conclusion)
  const inspectionRecord: AssetBatteryInspectionVO = {
    id: `battery-inspection-${batteryCode}-${Date.now()}`,
    inspectedAt,
    inspector: payload.inspector,
    source: payload.source,
    conclusion: conclusionLabel,
    summary: payload.summary,
    notes: payload.notes,
    evidence:
      payload.attachments.length
        ? `${payload.attachments.length} 份附件 / ${payload.attachments
            .map((item) => item.fileName)
            .slice(0, 2)
            .join('、')}`
        : payload.notes || '',
    attachments: payload.attachments.map((item) => ({ ...item, uploadedAt: item.uploadedAt || inspectedAt })),
    parsedMetrics: payload.parsedMetrics ? { ...payload.parsedMetrics } : undefined
  }

  const store = getBatteryProfileStore()
  store[batteryCode] = {
    inspectionRecords: [inspectionRecord, ...current.inspectionRecords],
    archiveAttachments: [...current.attachments],
    remarks: payload.notes.trim()
      ? [payload.notes.trim(), ...current.remarks.filter((item) => item !== payload.notes.trim())]
      : current.remarks,
    correctionHints:
      payload.conclusion === 'grounded'
        ? [
            {
              id: `battery-correction-${batteryCode}-${Date.now()}`,
              detectedAt: inspectedAt,
              summary: '巡检发现异常',
              detail: payload.summary,
              actionHint: '请结合附件与日志尽快复核，必要时安排维修或更换。',
              tone: 'danger'
            },
            ...current.correctionHints
          ]
        : current.correctionHints,
    latestMetrics: payload.parsedMetrics
      ? {
          ...payload.parsedMetrics,
          sourceType: payload.source
        }
      : null
  }
  setBatteryProfileStore(store)

  const archiveStore = getBatteryArchiveStore()
  const archiveIndex = archiveStore.findIndex((item) => item.batteryCode === batteryCode)
  if (archiveIndex >= 0) {
    const target = { ...archiveStore[archiveIndex] }
    const nextSoh = isNumber(payload.parsedMetrics?.soh)
      ? clamp(payload.parsedMetrics!.soh, 0, 100)
      : target.soh
    const nextCycleCount = isNumber(payload.parsedMetrics?.cycleCount)
      ? Math.max(0, payload.parsedMetrics!.cycleCount)
      : target.cycleCount
    const nextOutcome = buildInspectionDrivenBatteryOutcome(
      {
        ...target,
        soh: nextSoh,
        cycleCount: nextCycleCount,
        lastCheckAt: inspectedAt,
        checkSource: payload.source
      },
      payload,
      inspectedAt
    )
    if (isNumber(payload.parsedMetrics?.soh)) {
      target.soh = clamp(payload.parsedMetrics.soh, 0, 100)
    }
    if (isNumber(payload.parsedMetrics?.cycleCount)) {
      target.cycleCount = Math.max(0, payload.parsedMetrics.cycleCount)
    }
    target.lastCheckAt = inspectedAt
    target.lastCheckTime = inspectedAt
    target.checkSource = payload.source
    target.healthStatus = nextOutcome.healthStatus
    target.healthLabel = nextOutcome.healthLabel
    target.recommendation = nextOutcome.recommendation
    target.sourceEvidence = `${payload.source} / ${conclusionLabel}`
    archiveStore[archiveIndex] = target
    setBatteryArchiveStore(archiveStore)
  }

  return resolveAssetBatteryProfile({
    ...(archiveStore.find((item) => item.batteryCode === batteryCode) || {}),
    batteryCode
  })
}

const resolveBatteryAttachmentCategory = (fileName: string) => {
  const lowerName = fileName.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lowerName)) return '现场图片'
  if (/\.(log|txt|csv|json|zip|rar|7z)$/i.test(lowerName)) return '日志附件'
  return '建档附件'
}

const buildBatteryAttachmentSummary = (category: string, uploadedBy: string) => {
  if (category === '现场图片') return `现场补录 / 上传人：${uploadedBy}`
  if (category === '日志附件') return `日志补录 / 上传人：${uploadedBy}`
  return `建档补录 / 上传人：${uploadedBy}`
}

export const uploadAssetBatteryDocument = (
  battery: AssetBatteryLike | null | undefined,
  payload: {
    fileName: string
    uploadedBy: string
    uploadedAt?: string
  }
) => {
  const batteryCode = battery?.batteryCode || ''
  if (!batteryCode) {
    return resolveAssetBatteryProfile(battery)
  }

  const uploadedAt = payload.uploadedAt || dayjs().format('YYYY-MM-DD HH:mm')
  const category = resolveBatteryAttachmentCategory(payload.fileName)
  const attachment: AssetBatteryAttachmentVO = {
    id: `battery-attachment-${batteryCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: payload.fileName,
    category,
    summary: buildBatteryAttachmentSummary(category, payload.uploadedBy),
    uploadedAt,
    uploadedBy: payload.uploadedBy
  }

  const store = getBatteryProfileStore()
  const currentStore = store[batteryCode] || {}
  const currentProfile = resolveAssetBatteryProfile(battery)

  store[batteryCode] = {
    inspectionRecords: currentStore.inspectionRecords || currentProfile.inspectionRecords,
    archiveAttachments: [attachment, ...(currentStore.archiveAttachments || currentProfile.attachments)],
    correctionHints: currentStore.correctionHints || currentProfile.correctionHints,
    remarks: currentStore.remarks || currentProfile.remarks,
    latestMetrics: currentStore.latestMetrics || latestMetricsToRecord(currentProfile.inspectionRecords)
  }
  setBatteryProfileStore(store)

  return resolveAssetBatteryProfile(battery)
}

const latestMetricsToRecord = (inspectionRecords: AssetBatteryInspectionVO[]) =>
  inspectionRecords.find((item) => item.parsedMetrics)?.parsedMetrics || null


