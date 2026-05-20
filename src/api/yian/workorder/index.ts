import dayjs from 'dayjs'
import { useCache } from '@/hooks/web/useCache'

export type WorkorderStage =
  | 'pending'
  | 'diagnosing'
  | 'picking'
  | 'repairing'
  | 'inspecting'
  | 'releasing'
  | 'completed'
  | 'closed'

export type WorkorderSource =
  | 'pilot'
  | 'inspection'
  | 'alert'
  | 'aftersale'
  | 'maintenance'
  | 'service'
  | 'manual'

export type WorkorderPriority = 'P1' | 'P2' | 'P3'
export type WorkorderRiskLevel = 'high' | 'medium' | 'low'
export type WorkorderReleaseResult = 'pending' | 'approved' | 'limited' | 'rejected'

export interface WorkorderMaterialItem {
  name: string
  spec: string
  quantity: number
  status: 'picked' | 'pending'
}

export interface WorkorderTimelineItem {
  stage: WorkorderStage
  title: string
  detail: string
  operator: string
  at: string
}

export interface WorkorderAttachmentItem {
  name: string
  type: 'image' | 'log'
  size: number
  mimeType: string
}

export interface WorkorderStageRecordAcceptance {
  assignee: string
  priority: WorkorderPriority
  remark?: string
  acceptedAt: string
}

export interface WorkorderStageRecordDiagnosis {
  engineer: string
  faultCategory: string
  riskLevel: WorkorderRiskLevel
  conclusion: string
  suggestedParts: string[]
  diagnosedAt: string
}

export interface WorkorderStageRecordPicking {
  picker: string
  warehouse: string
  items: WorkorderMaterialItem[]
  pickedAt: string
}

export interface WorkorderStageRecordRepair {
  technician: string
  solution: string
  result: string
  usedHours: number
  repairedAt: string
}

export interface WorkorderStageRecordInspection {
  inspector: string
  result: 'passed' | 'failed'
  conclusion: string
  batteryCheck: boolean
  flightTest: boolean
  inspectedAt: string
}

export interface WorkorderStageRecordRelease {
  reviewer: string
  result: WorkorderReleaseResult
  conclusion: string
  restrictions?: string
  reviewedAt: string
}

interface WorkorderEntity {
  id: number
  orderNo: string
  deviceId: number
  deviceCode: string
  deviceName: string
  siteName: string
  source: WorkorderSource
  faultTime: string
  taskScene?: string
  symptom: string
  description?: string
  reporterPhone?: string
  imageAttachments?: WorkorderAttachmentItem[]
  logAttachments?: WorkorderAttachmentItem[]
  owner: string
  creator: string
  createTime: string
  slaDeadline: string
  status: WorkorderStage
  acceptance?: WorkorderStageRecordAcceptance
  diagnosis?: WorkorderStageRecordDiagnosis
  picking?: WorkorderStageRecordPicking
  repair?: WorkorderStageRecordRepair
  inspection?: WorkorderStageRecordInspection
  release?: WorkorderStageRecordRelease
  timeline: WorkorderTimelineItem[]
}

export interface WorkorderVO extends WorkorderEntity {
  sourceLabel: string
  statusLabel: string
  tagType: 'danger' | 'warning' | 'primary' | 'success' | 'info'
  currentStep: number
  overdue: boolean
  riskLevel: WorkorderRiskLevel | 'unrated'
  riskLevelLabel: string
  releaseStatus: WorkorderReleaseResult
  releaseStatusLabel: string
  pendingActionLabel: string
}

export interface WorkorderListQuery {
  keyword?: string
  orderNo?: string
  status?: WorkorderStage | ''
  source?: WorkorderSource | ''
  riskLevel?: WorkorderRiskLevel | 'unrated' | ''
  siteName?: string
  overdueOnly?: boolean
  viewTab?: 'running' | 'completed' | 'closed'
  deviceKeyword?: string
}

export interface WorkorderCreateReqVO {
  deviceId: number
  deviceCode: string
  deviceName: string
  siteName?: string
  source: WorkorderSource
  faultTime: string
  taskScene?: string
  symptom: string
  description?: string
  reporterPhone?: string
  imageAttachments?: WorkorderAttachmentItem[]
  logAttachments?: WorkorderAttachmentItem[]
  creator: string
}

export interface WorkorderSummaryVO {
  total: number
  pending: number
  diagnosing: number
  picking: number
  repairing: number
  inspecting: number
  releasing: number
  completed: number
  overdue: number
}

export interface WorkorderAttachmentAppendPayload {
  type: WorkorderAttachmentItem['type']
  files: WorkorderAttachmentItem[]
  operator: string
}

export interface WorkorderBoardColumnVO {
  key: WorkorderStage
  label: string
  count: number
  orders: WorkorderVO[]
}

const STORAGE_KEY = 'yian_workorder_center_v1'
const { wsCache } = useCache()

const STAGE_META: Record<
  WorkorderStage,
  { label: string; tagType: WorkorderVO['tagType']; step: number; actionLabel: string }
> = {
  pending: { label: '待受理', tagType: 'danger', step: 1, actionLabel: '填写受理信息' },
  diagnosing: { label: '待初诊', tagType: 'warning', step: 2, actionLabel: '提交初诊结论' },
  picking: { label: '待领料', tagType: 'primary', step: 3, actionLabel: '确认领料记录' },
  repairing: { label: '维修中', tagType: 'primary', step: 4, actionLabel: '提交维修结果' },
  inspecting: { label: '待复检', tagType: 'info', step: 5, actionLabel: '提交复检结论' },
  releasing: { label: '待放行', tagType: 'warning', step: 6, actionLabel: '进入放行审核' },
  completed: { label: '已完成', tagType: 'success', step: 7, actionLabel: '查看闭环结果' },
  closed: { label: '已关闭', tagType: 'info', step: 7, actionLabel: '查看关闭原因' }
}

const SOURCE_LABEL_MAP: Record<WorkorderSource, string> = {
  pilot: '飞手上报',
  inspection: '站点巡检',
  alert: '系统告警',
  aftersale: '售后返场',
  maintenance: '定保发现',
  service: '客服代录',
  manual: '人工补录'
}

const RISK_LEVEL_LABEL_MAP: Record<WorkorderRiskLevel | 'unrated', string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  unrated: '未定级'
}

export const RELEASE_META: Record<
  WorkorderReleaseResult,
  { label: string; tagType: WorkorderVO['tagType'] }
> = {
  pending: { label: '待审核', tagType: 'warning' },
  approved: { label: '正常放行', tagType: 'success' },
  limited: { label: '限制放行', tagType: 'primary' },
  rejected: { label: '驳回返修', tagType: 'danger' }
}

const BOARD_STAGES: WorkorderStage[] = [
  'pending',
  'diagnosing',
  'picking',
  'repairing',
  'inspecting',
  'releasing'
]

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const now = () => dayjs().format('YYYY-MM-DD HH:mm')

const createTimeline = (
  stage: WorkorderStage,
  title: string,
  detail: string,
  operator: string,
  at = now()
): WorkorderTimelineItem => ({
  stage,
  title,
  detail,
  operator,
  at
})

const seedOrders = (): WorkorderEntity[] => [
  {
    id: 101,
    orderNo: 'WO-20260514-001',
    deviceId: 1203,
    deviceCode: 'UAV-IMPORT-101',
    deviceName: 'DJI M350 RTK',
    siteName: '嘉兴南湖站',
    source: 'pilot',
    faultTime: '2026-05-14 08:15',
    taskScene: '返航阶段',
    symptom: '返航阶段高度突降，伴随姿态告警',
    description: '飞手反馈返航过程中机体姿态异常，现场已停飞并上传日志。',
    reporterPhone: '138 0000 3211',
    owner: '张工',
    creator: '李站长',
    createTime: '2026-05-14 08:25',
    slaDeadline: '2026-05-15 08:25',
    status: 'pending',
    timeline: [createTimeline('pending', '工单创建', '飞手上报异常并提交工单', '李站长', '2026-05-14 08:25')]
  },
  {
    id: 102,
    orderNo: 'WO-20260513-003',
    deviceId: 1202,
    deviceCode: 'UAV-MVP-002',
    deviceName: 'DJI M30T',
    siteName: '苏州工业园站',
    source: 'inspection',
    faultTime: '2026-05-13 10:10',
    taskScene: '站点巡检作业阶段',
    symptom: '云台抖动异常，热成像画面存在跳帧',
    description: '巡检时发现云台稳定性下降，需确认减震结构与相机模组状态。',
    reporterPhone: '0512-8888 2033',
    owner: '王工',
    creator: '华东运维中心',
    createTime: '2026-05-13 10:25',
    slaDeadline: '2026-05-14 10:25',
    status: 'diagnosing',
    acceptance: {
      assignee: '王工',
      priority: 'P2',
      remark: '先排查云台减震球与相机排线',
      acceptedAt: '2026-05-13 10:40'
    },
    timeline: [
      createTimeline('pending', '工单创建', '站点巡检发现异常并建单', '华东运维中心', '2026-05-13 10:25'),
      createTimeline('diagnosing', '完成受理', '指派王工进入初诊', '调度台', '2026-05-13 10:40')
    ]
  },
  {
    id: 103,
    orderNo: 'WO-20260512-006',
    deviceId: 1201,
    deviceCode: 'UAV-MVP-001',
    deviceName: 'DJI M350 RTK',
    siteName: '杭州余杭站',
    source: 'alert',
    faultTime: '2026-05-12 16:20',
    taskScene: '返场温升复核',
    symptom: '动力系统高温告警，返场后电机温升持续偏高',
    description: '系统告警触发后停飞，初诊判断需更换动力相关部件。',
    owner: '李工',
    creator: '系统告警',
    createTime: '2026-05-12 16:28',
    slaDeadline: '2026-05-14 12:00',
    status: 'repairing',
    acceptance: {
      assignee: '李工',
      priority: 'P1',
      remark: '纳入高优工单处理',
      acceptedAt: '2026-05-12 16:40'
    },
    diagnosis: {
      engineer: '李工',
      faultCategory: '动力系统',
      riskLevel: 'high',
      conclusion: '3 号电机温升异常，建议更换电机与连接线并复位飞控。',
      suggestedParts: ['3 号电机总成', '电调连接线'],
      diagnosedAt: '2026-05-12 17:10'
    },
    picking: {
      picker: '周工',
      warehouse: '华东备件库',
      items: [
        { name: '3 号电机总成', spec: 'M350 RTK', quantity: 1, status: 'picked' },
        { name: '电调连接线', spec: '动力线束', quantity: 1, status: 'picked' }
      ],
      pickedAt: '2026-05-12 17:45'
    },
    timeline: [
      createTimeline('pending', '工单创建', '系统告警自动建单', '系统告警', '2026-05-12 16:28'),
      createTimeline('diagnosing', '完成受理', '升级为高优先级工单', '调度台', '2026-05-12 16:40'),
      createTimeline('picking', '提交初诊', '确认故障类别并申请备件', '李工', '2026-05-12 17:10'),
      createTimeline('repairing', '完成领料', '备件已发放到维修位', '周工', '2026-05-12 17:45')
    ]
  },
  {
    id: 104,
    orderNo: 'WO-20260510-011',
    deviceId: 1203,
    deviceCode: 'UAV-IMPORT-101',
    deviceName: 'DJI M350 RTK',
    siteName: '嘉兴南湖站',
    source: 'maintenance',
    faultTime: '2026-05-10 09:00',
    taskScene: '定保复位校准',
    symptom: '飞控异常导致返航失败',
    description: '完成飞控复位和桨叶更换后进入复检，待放行审核。',
    owner: '张工',
    creator: '定保任务',
    createTime: '2026-05-10 09:20',
    slaDeadline: '2026-05-14 18:00',
    status: 'releasing',
    acceptance: {
      assignee: '张工',
      priority: 'P2',
      remark: '复位飞控并执行全套地面检查',
      acceptedAt: '2026-05-10 09:45'
    },
    diagnosis: {
      engineer: '张工',
      faultCategory: '飞控系统',
      riskLevel: 'medium',
      conclusion: '飞控参数漂移，需复位并更换受损桨叶。',
      suggestedParts: ['桨叶套装'],
      diagnosedAt: '2026-05-10 10:20'
    },
    picking: {
      picker: '赵工',
      warehouse: '华东备件库',
      items: [{ name: '桨叶套装', spec: 'M350 RTK', quantity: 1, status: 'picked' }],
      pickedAt: '2026-05-10 10:40'
    },
    repair: {
      technician: '张工',
      solution: '复位飞控参数，更换桨叶并完成静态校准。',
      result: '静态检查通过，准备复检。',
      usedHours: 3,
      repairedAt: '2026-05-10 13:20'
    },
    inspection: {
      inspector: '陈工',
      result: 'passed',
      conclusion: '地面校验、悬停测试均通过，可进入放行审核。',
      batteryCheck: true,
      flightTest: true,
      inspectedAt: '2026-05-10 15:10'
    },
    timeline: [
      createTimeline('pending', '工单创建', '定保发现异常后建单', '定保任务', '2026-05-10 09:20'),
      createTimeline('diagnosing', '完成受理', '指派张工处理', '调度台', '2026-05-10 09:45'),
      createTimeline('picking', '提交初诊', '确认飞控参数异常并申请桨叶备件', '张工', '2026-05-10 10:20'),
      createTimeline('repairing', '完成领料', '桨叶套装已发放', '赵工', '2026-05-10 10:40'),
      createTimeline('inspecting', '提交维修结果', '飞控复位和桨叶更换完成', '张工', '2026-05-10 13:20'),
      createTimeline('releasing', '复检通过', '已进入放行审核', '陈工', '2026-05-10 15:10')
    ]
  }
]

const ensureOrders = (): WorkorderEntity[] => {
  const cached = wsCache.get(STORAGE_KEY) as WorkorderEntity[] | undefined
  if (cached?.length) {
    return cached
  }
  const seeds = seedOrders()
  wsCache.set(STORAGE_KEY, seeds)
  return seeds
}

const saveOrders = (orders: WorkorderEntity[]) => {
  wsCache.set(STORAGE_KEY, orders)
}

const isOverdue = (order: WorkorderEntity) =>
  !['completed', 'closed'].includes(order.status) && dayjs(order.slaDeadline).isBefore(dayjs())

const toVO = (order: WorkorderEntity): WorkorderVO => {
  const stageMeta = STAGE_META[order.status]
  const releaseStatus = order.status === 'releasing' ? 'pending' : order.release?.result || 'pending'
  const riskLevel = order.diagnosis?.riskLevel || 'unrated'
  return {
    ...clone(order),
    sourceLabel: SOURCE_LABEL_MAP[order.source],
    statusLabel: stageMeta.label,
    tagType: stageMeta.tagType,
    currentStep: stageMeta.step,
    overdue: isOverdue(order),
    riskLevel,
    riskLevelLabel: RISK_LEVEL_LABEL_MAP[riskLevel],
    releaseStatus,
    releaseStatusLabel: RELEASE_META[releaseStatus].label,
    pendingActionLabel: stageMeta.actionLabel
  }
}

const sortOrders = (orders: WorkorderEntity[]) =>
  [...orders].sort((a, b) => dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf())

const mutateOrder = (
  id: number,
  updater: (draft: WorkorderEntity) => void
): WorkorderVO => {
  const orders = ensureOrders()
  const target = orders.find((item) => item.id === id)
  if (!target) {
    throw new Error('未找到对应工单')
  }
  updater(target)
  saveOrders(orders)
  return toVO(target)
}

const nextId = () => {
  const orders = ensureOrders()
  return orders.length ? Math.max(...orders.map((item) => item.id)) + 1 : 1
}

const nextOrderNo = () => {
  const seq = String(nextId()).padStart(3, '0')
  return `WO-${dayjs().format('YYYYMMDD')}-${seq}`
}

export const WORKORDER_STAGE_OPTIONS = Object.entries(STAGE_META).map(([value, meta]) => ({
  value: value as WorkorderStage,
  label: meta.label
}))

export const WORKORDER_BOARD_STAGE_OPTIONS = BOARD_STAGES.map((key) => ({
  value: key,
  label: STAGE_META[key].label
}))

export const WORKORDER_RELEASE_OPTIONS = Object.entries(RELEASE_META).map(([value, meta]) => ({
  value: value as WorkorderReleaseResult,
  label: meta.label
}))

export const WORKORDER_SOURCE_OPTIONS = Object.entries(SOURCE_LABEL_MAP).map(([value, label]) => ({
  value: value as WorkorderSource,
  label
}))

export const WORKORDER_RISK_OPTIONS = Object.entries(RISK_LEVEL_LABEL_MAP).map(([value, label]) => ({
  value: value as WorkorderRiskLevel | 'unrated',
  label
}))

export const YianWorkorderApi = {
  getSummary() {
    const orders = ensureOrders().map(toVO)
    return {
      total: orders.length,
      pending: orders.filter((item) => item.status === 'pending').length,
      diagnosing: orders.filter((item) => item.status === 'diagnosing').length,
      picking: orders.filter((item) => item.status === 'picking').length,
      repairing: orders.filter((item) => item.status === 'repairing').length,
      inspecting: orders.filter((item) => item.status === 'inspecting').length,
      releasing: orders.filter((item) => item.status === 'releasing').length,
      completed: orders.filter((item) => item.status === 'completed').length,
      overdue: orders.filter((item) => item.overdue).length
    } satisfies WorkorderSummaryVO
  },

  getList(query?: WorkorderListQuery) {
    const keyword = query?.keyword?.trim() || query?.orderNo?.trim()
    const deviceKeyword = query?.deviceKeyword?.trim()
    return sortOrders(ensureOrders())
      .map(toVO)
      .filter((item) => {
        if (
          keyword &&
          !`${item.orderNo} ${item.deviceCode} ${item.creator} ${item.owner}`
            .toLowerCase()
            .includes(keyword.toLowerCase())
        ) {
          return false
        }
        if (query?.status && item.status !== query.status) {
          return false
        }
        if (query?.source && item.source !== query.source) {
          return false
        }
        if (query?.riskLevel && item.riskLevel !== query.riskLevel) {
          return false
        }
        if (query?.siteName && item.siteName !== query.siteName) {
          return false
        }
        if (query?.overdueOnly && !item.overdue) {
          return false
        }
        if (query?.viewTab === 'running' && ['completed', 'closed'].includes(item.status)) {
          return false
        }
        if (query?.viewTab === 'completed' && item.status !== 'completed') {
          return false
        }
        if (query?.viewTab === 'closed' && item.status !== 'closed') {
          return false
        }
        if (
          deviceKeyword &&
          !`${item.deviceCode} ${item.deviceName}`.toLowerCase().includes(deviceKeyword.toLowerCase())
        ) {
          return false
        }
        return true
      })
  },

  getBoard(query?: WorkorderListQuery) {
    const orders = this.getList({ ...query, viewTab: 'running' })
    return BOARD_STAGES.map((key) => ({
      key,
      label: STAGE_META[key].label,
      count: orders.filter((item) => item.status === key).length,
      orders: orders.filter((item) => item.status === key)
    })) satisfies WorkorderBoardColumnVO[]
  },

  getSiteOptions() {
    return [...new Set(ensureOrders().map((item) => item.siteName).filter(Boolean))]
  },

  getDetail(id: number) {
    const target = ensureOrders().find((item) => item.id === id)
    if (!target) {
      throw new Error('未找到对应工单')
    }
    return toVO(target)
  },

  getReleaseList(status?: WorkorderReleaseResult | '') {
    return sortOrders(ensureOrders())
      .map(toVO)
      .filter((item) => item.status === 'releasing' || item.release)
      .filter((item) => !status || item.releaseStatus === status)
  },

  create(data: WorkorderCreateReqVO) {
    const orders = ensureOrders()
    const order: WorkorderEntity = {
      id: nextId(),
      orderNo: nextOrderNo(),
      deviceId: data.deviceId,
      deviceCode: data.deviceCode,
      deviceName: data.deviceName,
      siteName: data.siteName || '待补录',
      source: data.source,
      faultTime: data.faultTime,
      taskScene: data.taskScene,
      symptom: data.symptom,
      description: data.description,
      reporterPhone: data.reporterPhone,
      imageAttachments: data.imageAttachments,
      logAttachments: data.logAttachments,
      owner: '待分派',
      creator: data.creator,
      createTime: now(),
      slaDeadline: dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm'),
      status: 'pending',
      timeline: [
        createTimeline('pending', '工单创建', `${SOURCE_LABEL_MAP[data.source]}提交异常工单`, data.creator)
      ]
    }
    orders.unshift(order)
    saveOrders(orders)
    return toVO(order)
  },

  appendAttachments(id: number, payload: WorkorderAttachmentAppendPayload) {
    return mutateOrder(id, (draft) => {
      const uploadedAt = now()
      if (payload.type === 'image') {
        draft.imageAttachments = [...(draft.imageAttachments || []), ...payload.files]
      } else {
        draft.logAttachments = [...(draft.logAttachments || []), ...payload.files]
      }
      const label = payload.type === 'image' ? '现场图片' : '日志附件'
      draft.timeline.push(
        createTimeline(
          draft.status,
          `补充${label}`,
          `${payload.operator} 新增 ${payload.files.length} 份${label}`,
          payload.operator,
          uploadedAt
        )
      )
    })
  },

  submitAcceptance(
    id: number,
    payload: Pick<WorkorderStageRecordAcceptance, 'assignee' | 'priority' | 'remark'>
  ) {
    return mutateOrder(id, (draft) => {
      draft.owner = payload.assignee
      draft.status = 'diagnosing'
      draft.acceptance = { ...payload, acceptedAt: now() }
      draft.timeline.push(
        createTimeline(
          'diagnosing',
          '完成受理',
          `工单已分派给${payload.assignee}，优先级${payload.priority}`,
          payload.assignee
        )
      )
    })
  },

  submitDiagnosis(
    id: number,
    payload: Pick<
      WorkorderStageRecordDiagnosis,
      'engineer' | 'faultCategory' | 'riskLevel' | 'conclusion' | 'suggestedParts'
    >
  ) {
    return mutateOrder(id, (draft) => {
      draft.owner = payload.engineer
      draft.status = 'picking'
      draft.diagnosis = { ...payload, diagnosedAt: now() }
      draft.timeline.push(
        createTimeline(
          'picking',
          '提交初诊',
          `确认${payload.faultCategory}异常，风险等级${payload.riskLevel}`,
          payload.engineer
        )
      )
    })
  },

  submitPicking(
    id: number,
    payload: Pick<WorkorderStageRecordPicking, 'picker' | 'warehouse' | 'items'>
  ) {
    return mutateOrder(id, (draft) => {
      draft.status = 'repairing'
      draft.picking = { ...payload, pickedAt: now() }
      draft.timeline.push(
        createTimeline(
          'repairing',
          '完成领料',
          `从${payload.warehouse}领出${payload.items.length}项备件`,
          payload.picker
        )
      )
    })
  },

  submitRepair(
    id: number,
    payload: Pick<WorkorderStageRecordRepair, 'technician' | 'solution' | 'result' | 'usedHours'>
  ) {
    return mutateOrder(id, (draft) => {
      draft.owner = payload.technician
      draft.status = 'inspecting'
      draft.repair = { ...payload, repairedAt: now() }
      draft.timeline.push(
        createTimeline('inspecting', '提交维修结果', payload.result, payload.technician)
      )
    })
  },

  submitInspection(
    id: number,
    payload: Pick<
      WorkorderStageRecordInspection,
      'inspector' | 'result' | 'conclusion' | 'batteryCheck' | 'flightTest'
    >
  ) {
    return mutateOrder(id, (draft) => {
      draft.owner = payload.inspector
      draft.inspection = { ...payload, inspectedAt: now() }
      if (payload.result === 'passed') {
        draft.status = 'releasing'
        draft.timeline.push(
          createTimeline('releasing', '复检通过', payload.conclusion, payload.inspector)
        )
      } else {
        draft.status = 'repairing'
        draft.timeline.push(
          createTimeline('repairing', '复检未通过', payload.conclusion, payload.inspector)
        )
      }
    })
  },

  submitRelease(
    id: number,
    payload: Pick<WorkorderStageRecordRelease, 'reviewer' | 'result' | 'conclusion' | 'restrictions'>
  ) {
    return mutateOrder(id, (draft) => {
      draft.owner = payload.reviewer
      draft.release = { ...payload, reviewedAt: now() }
      if (payload.result === 'rejected') {
        draft.status = 'repairing'
        draft.timeline.push(
          createTimeline('repairing', '放行驳回', payload.conclusion, payload.reviewer)
        )
      } else {
        draft.status = 'completed'
        draft.timeline.push(
          createTimeline('completed', '完成放行', payload.conclusion, payload.reviewer)
        )
      }
    })
  },

  reset() {
    const orders = seedOrders()
    saveOrders(orders)
    return orders.map(toVO)
  }
}
