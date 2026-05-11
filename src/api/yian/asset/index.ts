import type { DvMachineryVO } from '@/api/mes/dv/machinery'

export type AssetRiskTone = 'success' | 'warning' | 'danger' | 'info'

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
  siteName: device?.workshopName || '-',
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

export const listAssetBattery = (): AssetBatteryVO[] => batteryAssets.map((item) => ({ ...item }))

export const listLinkedBatteries = (deviceCode?: string) =>
  listAssetBattery().filter((item) => item.linkedDeviceCode === deviceCode)
