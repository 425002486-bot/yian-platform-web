<template>
  <ContentWrap>
    <el-page-header @back="router.push('/workorder/list')" title="返回工单列表" content="工单详情">
      <template #extra>
        <el-space wrap>
          <el-tag effect="plain">{{ order?.siteName || '待补录站点' }}</el-tag>
          <el-tag effect="plain">{{ order?.owner || '站点负责人' }}</el-tag>
          <el-button type="primary" @click="router.push('/workorder/list')">进入工单中心</el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-empty v-if="!order" description="未找到对应工单" class="mt-20px" />

    <template v-else>
      <el-card class="mt-20px detail-card" shadow="never">
        <div class="detail-card__head">
          <div>
            <div class="detail-card__title">工单 {{ order.orderNo }}</div>
            <div class="detail-card__meta">
              设备 {{ order.deviceCode }} / {{ order.siteName }} / {{ taskSceneText }} / {{ order.symptom }}
            </div>
          </div>
          <div class="detail-card__tags">
            <el-tag :type="order.tagType">{{ order.statusLabel }}</el-tag>
            <el-tag :type="groundedTag.type">{{ groundedTag.label }}</el-tag>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-field">
            <strong>创建时间</strong>
            <span>{{ order.createTime }}</span>
          </div>
          <div class="info-field">
            <strong>工单来源</strong>
            <span>{{ order.sourceLabel }}</span>
          </div>
          <div class="info-field">
            <strong>提交人</strong>
            <span>{{ reporterDisplay }}</span>
          </div>
          <div class="info-field">
            <strong>任务场景</strong>
            <span>{{ taskSceneText }}</span>
          </div>
          <div class="info-field">
            <strong>当前责任人</strong>
            <span>{{ order.owner || '待分派' }}</span>
          </div>
          <div class="info-field">
            <strong>节点截止时间</strong>
            <span :class="order.overdue ? 'text-danger' : ''">{{ order.slaDeadline }}</span>
          </div>
          <div class="info-field info-field--full">
            <strong>故障现象</strong>
            <span>{{ order.symptom }}</span>
          </div>
        </div>
      </el-card>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :xl="14">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">
                <span>{{ stageResult.title }}</span>
                <el-tag v-if="stageResult.tagLabel" :type="stageResult.tagType">{{ stageResult.tagLabel }}</el-tag>
              </div>
            </template>
            <div class="info-grid">
              <div
                v-for="field in stageResult.fields"
                :key="`${stageResult.title}-${field.label}`"
                class="info-field"
                :class="{ 'info-field--full': field.full }"
              >
                <strong>{{ field.label }}</strong>
                <span>{{ field.value }}</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :xl="10">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">
                <span>日志与附件</span>
              </div>
            </template>
            <div class="evidence-list">
              <div class="evidence-item">
                <div class="section-header">
                  <strong>飞行日志</strong>
                  <el-tag type="success">{{ flightLogMeta.count }} 份</el-tag>
                </div>
                <p>{{ flightLogMeta.text }}</p>
              </div>
              <div class="evidence-item">
                <div class="section-header">
                  <strong>现场图片</strong>
                  <el-tag type="info">{{ photoEvidenceMeta.count }} 份</el-tag>
                </div>
                <p>{{ photoEvidenceMeta.text }}</p>
              </div>
              <div class="evidence-item">
                <div class="section-header">
                  <strong>关联证据</strong>
                </div>
                <el-space wrap>
                  <el-button @click="handleViewEvidence">查看证据</el-button>
                  <el-button @click="handleImportLog">导入日志</el-button>
                </el-space>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :xl="14">
          <el-card header="工单时间轴" shadow="never">
            <el-timeline>
              <el-timeline-item
                v-for="item in timelineItems"
                :key="`${item.stage}-${item.at}-${item.title}`"
                :timestamp="item.at"
                placement="top"
              >
                <div class="timeline-title">{{ item.title }}</div>
                <div class="timeline-text">{{ item.detail }}</div>
                <div class="timeline-text">{{ item.operator }}</div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>

        <el-col :xs="24" :xl="10">
          <el-card shadow="never">
            <template #header>
              <div class="section-header">
                <span>当前动作</span>
              </div>
            </template>
            <div class="action-panel">
              <div class="action-panel__title">{{ currentAction.title }}</div>
              <p class="action-panel__desc">{{ currentAction.description }}</p>
              <el-space wrap>
                <el-button
                  v-if="currentAction.primaryText"
                  type="primary"
                  @click="handlePrimaryAction"
                >
                  {{ currentAction.primaryText }}
                </el-button>
                <el-button
                  v-if="order.status === 'releasing'"
                  @click="router.push(`/workorder/release?orderId=${order.id}`)"
                >
                  查看放行审核
                </el-button>
              </el-space>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <div v-if="showProcessingForm" id="workorder-processing-form" class="mt-20px">
        <el-card shadow="never">
          <template #header>
            <div class="section-header">
              <span>{{ processingFormTitle }}</span>
            </div>
          </template>

          <el-form v-if="order.status === 'pending'" :model="acceptForm" label-width="110px">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="受理结论">
                  <el-input model-value="受理并进入初始诊断" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="停飞结论">
                  <el-input model-value="立即停飞" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="机务负责人">
                  <el-input v-model="acceptForm.assignee" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="维修责任人">
                  <el-input v-model="acceptForm.assignee" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="节点截止时间">
                  <el-input :model-value="order.slaDeadline" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="受理备注">
                  <el-input v-model="acceptForm.remark" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item class="mb-0">
              <el-button type="primary" @click="submitAcceptance">提交受理</el-button>
            </el-form-item>
          </el-form>

          <el-form v-else-if="order.status === 'diagnosing'" :model="diagnoseForm" label-width="110px">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="初诊人">
                  <el-input v-model="diagnoseForm.engineer" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="故障分类">
                  <el-input v-model="diagnoseForm.faultCategory" placeholder="例如：飞控系统" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="风险等级">
                  <el-select v-model="diagnoseForm.riskLevel" class="!w-100%">
                    <el-option label="高风险" value="high" />
                    <el-option label="中风险" value="medium" />
                    <el-option label="低风险" value="low" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="建议备件">
                  <el-input
                    v-model="diagnoseForm.suggestedPartsText"
                    placeholder="多个备件用顿号分隔"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="诊断结论">
                  <el-input v-model="diagnoseForm.conclusion" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item class="mb-0">
              <el-button type="primary" @click="submitDiagnosis">提交初诊</el-button>
            </el-form-item>
          </el-form>

          <el-form v-else-if="order.status === 'picking'" :model="pickForm" label-width="110px">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="领料人">
                  <el-input v-model="pickForm.picker" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="备件仓库">
                  <el-input v-model="pickForm.warehouse" />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="备件清单">
                  <el-input
                    v-model="pickForm.itemsText"
                    type="textarea"
                    :rows="3"
                    placeholder="示例：桨叶套装|M350 RTK|1；减震球|标准件|4"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item class="mb-0">
              <el-button type="primary" @click="submitPicking">确认领料</el-button>
            </el-form-item>
          </el-form>

          <el-form v-else-if="order.status === 'repairing'" :model="repairForm" label-width="110px">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="维修责任人">
                  <el-input v-model="repairForm.technician" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="工时">
                  <el-input-number v-model="repairForm.usedHours" :min="1" :max="24" />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="维修措施">
                  <el-input v-model="repairForm.solution" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="维修结论">
                  <el-input v-model="repairForm.result" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item class="mb-0">
              <el-button type="primary" @click="submitRepair">提交维修结果</el-button>
            </el-form-item>
          </el-form>

          <el-form v-else-if="order.status === 'inspecting'" :model="inspectForm" label-width="110px">
            <el-row :gutter="16">
              <el-col :xs="24" :md="12">
                <el-form-item label="复检人">
                  <el-input v-model="inspectForm.inspector" disabled />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="复检结论">
                  <el-radio-group v-model="inspectForm.result">
                    <el-radio label="passed">通过</el-radio>
                    <el-radio label="failed">不通过</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="电池核验">
                  <el-switch v-model="inspectForm.batteryCheck" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="试飞验证">
                  <el-switch v-model="inspectForm.flightTest" />
                </el-form-item>
              </el-col>
              <el-col :xs="24">
                <el-form-item label="复检说明">
                  <el-input v-model="inspectForm.conclusion" type="textarea" :rows="3" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item class="mb-0">
              <el-button type="primary" @click="submitInspection">提交复检结果</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </template>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  RELEASE_META,
  YianWorkorderApi,
  type WorkorderRiskLevel,
  type WorkorderVO
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderDetail' })

interface DetailField {
  label: string
  value: string
  full?: boolean
}

interface DetailBlock {
  title: string
  fields: DetailField[]
  tagLabel?: string
  tagType?: 'success' | 'warning' | 'danger' | 'info' | 'primary'
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const order = ref<WorkorderVO>()
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const acceptForm = reactive({
  assignee: currentOperatorName.value,
  priority: 'P2' as const,
  remark: ''
})

const diagnoseForm = reactive({
  engineer: '',
  faultCategory: '',
  riskLevel: 'medium' as WorkorderRiskLevel,
  suggestedPartsText: '',
  conclusion: ''
})

const pickForm = reactive({
  picker: '',
  warehouse: '华东备件库',
  itemsText: ''
})

const repairForm = reactive({
  technician: '',
  solution: '',
  result: '',
  usedHours: 2
})

const inspectForm = reactive({
  inspector: '',
  result: 'passed' as 'passed' | 'failed',
  conclusion: '',
  batteryCheck: true,
  flightTest: true
})

const timelineItems = computed(() => order.value?.timeline || [])
const taskSceneText = computed(() => order.value?.taskScene || '待补录')
const reporterDisplay = computed(() => {
  if (!order.value) return '-'
  return order.value.reporterPhone
    ? `${order.value.creator} / ${order.value.reporterPhone}`
    : order.value.creator
})

const releaseTagType = (status: WorkorderVO['releaseStatus']) => RELEASE_META[status].tagType
const releaseLabel = (status: WorkorderVO['releaseStatus']) => RELEASE_META[status].label
const riskTagType = (value: WorkorderVO['riskLevel']) =>
  value === 'high' ? 'danger' : value === 'medium' ? 'warning' : value === 'low' ? 'success' : 'info'
const riskLevelLabel = (value: WorkorderRiskLevel | 'unrated') =>
  ({ high: '高风险', medium: '中风险', low: '低风险', unrated: '未定级' } as Record<
    WorkorderRiskLevel | 'unrated',
    string
  >)[value]

const groundedTag = computed(() => {
  if (!order.value) return { label: '-', type: 'info' as const }
  if (order.value.status === 'completed') return { label: '已放行', type: 'success' as const }
  if (order.value.status === 'closed') return { label: '已关闭', type: 'info' as const }
  if (order.value.release?.result === 'rejected') return { label: '驳回返修', type: 'danger' as const }
  if (order.value.release?.result === 'limited') return { label: '限制放行', type: 'warning' as const }
  return { label: '已停飞', type: 'danger' as const }
})

const formatMaterialItems = (items?: { name: string; spec: string; quantity: number }[]) =>
  items?.length ? items.map((item) => `${item.name} x${item.quantity}（${item.spec}）`).join('；') : '待补录'

const stageResult = computed<DetailBlock>(() => {
  if (!order.value) {
    return { title: '处理结果', fields: [] }
  }

  if (order.value.status === 'pending' || order.value.status === 'diagnosing') {
    return {
      title: '受理信息',
      tagLabel: order.value.acceptance ? '已受理' : '待受理',
      tagType: order.value.acceptance ? 'success' : 'warning',
      fields: [
        {
          label: '受理结论',
          value: order.value.acceptance ? '受理并进入初始诊断' : '待受理'
        },
        {
          label: '停飞结论',
          value: groundedTag.value.label === '已放行' ? '可放行' : '立即停飞'
        },
        {
          label: '机务负责人',
          value: order.value.acceptance?.assignee || order.value.owner || '待分派'
        },
        {
          label: '维修责任人',
          value: order.value.diagnosis?.engineer || order.value.owner || '待分派'
        },
        {
          label: '受理备注',
          value: order.value.acceptance?.remark || '待补录受理备注',
          full: true
        }
      ]
    }
  }

  if (order.value.status === 'picking') {
    return {
      title: '初诊结果',
      tagLabel: riskLevelLabel(order.value.riskLevel),
      tagType: riskTagType(order.value.riskLevel),
      fields: [
        { label: '初诊人', value: order.value.diagnosis?.engineer || '待补录' },
        { label: '故障分类', value: order.value.diagnosis?.faultCategory || '待补录' },
        { label: '风险等级', value: riskLevelLabel(order.value.riskLevel) },
        {
          label: '建议备件',
          value: order.value.diagnosis?.suggestedParts.join('、') || '待补录'
        },
        {
          label: '诊断结论',
          value: order.value.diagnosis?.conclusion || '待补录诊断结论',
          full: true
        }
      ]
    }
  }

  if (order.value.status === 'repairing') {
    return {
      title: '领料记录',
      tagLabel: order.value.picking ? '已领料' : '待领料',
      tagType: order.value.picking ? 'success' : 'warning',
      fields: [
        { label: '领料人', value: order.value.picking?.picker || '待补录' },
        { label: '备件仓库', value: order.value.picking?.warehouse || '待补录' },
        { label: '领料时间', value: order.value.picking?.pickedAt || '待补录' },
        {
          label: '领料项数',
          value: order.value.picking ? `${order.value.picking.items.length} 项` : '待补录'
        },
        {
          label: '备件明细',
          value: formatMaterialItems(order.value.picking?.items),
          full: true
        }
      ]
    }
  }

  if (order.value.status === 'inspecting') {
    return {
      title: '维修结果',
      tagLabel: '待复检',
      tagType: 'warning',
      fields: [
        { label: '维修责任人', value: order.value.repair?.technician || '待补录' },
        { label: '维修工时', value: order.value.repair ? `${order.value.repair.usedHours} 小时` : '待补录' },
        {
          label: '维修措施',
          value: order.value.repair?.solution || '待补录维修措施',
          full: true
        },
        {
          label: '维修结论',
          value: order.value.repair?.result || '待补录维修结论',
          full: true
        }
      ]
    }
  }

  if (order.value.status === 'releasing') {
    return {
      title: '复检结果',
      tagLabel: order.value.inspection?.result === 'passed' ? '已通过' : '待复检',
      tagType: order.value.inspection?.result === 'passed' ? 'success' : 'warning',
      fields: [
        { label: '复检人', value: order.value.inspection?.inspector || '待补录' },
        {
          label: '电池核验',
          value: order.value.inspection?.batteryCheck ? '已核验' : '未核验'
        },
        {
          label: '试飞验证',
          value: order.value.inspection?.flightTest ? '已试飞' : '未试飞'
        },
        {
          label: '复检说明',
          value: order.value.inspection?.conclusion || '待补录复检结论',
          full: true
        }
      ]
    }
  }

  if (order.value.status === 'completed') {
    return {
      title: '放行结论',
      tagLabel: releaseLabel(order.value.releaseStatus),
      tagType: releaseTagType(order.value.releaseStatus),
      fields: [
        { label: '审核人', value: order.value.release?.reviewer || '待补录' },
        { label: '审核时间', value: order.value.release?.reviewedAt || '待补录' },
        { label: '限制条件', value: order.value.release?.restrictions || '无' },
        {
          label: '审核结论',
          value: order.value.release?.conclusion || '待补录放行结论',
          full: true
        }
      ]
    }
  }

  return {
    title: '关闭记录',
    tagLabel: '已关闭',
    tagType: 'info',
    fields: [
      { label: '关闭状态', value: '工单已关闭' },
      { label: '当前责任人', value: order.value.owner || '待补录' },
      {
        label: '关闭说明',
        value: order.value.timeline[order.value.timeline.length - 1]?.detail || '待补录关闭说明',
        full: true
      }
    ]
  }
})

const flightLogMeta = computed(() => {
  if (!order.value) return { count: 0, text: '-' }
  const count = order.value.source === 'manual' ? 0 : 1
  if (!count) {
    return {
      count,
      text: '当前未补录飞行日志，建议尽快导入原始日志包。'
    }
  }
  return {
    count,
    text: `FLIGHT_LOG_${order.value.orderNo.replace(/^WO-/, '').replace(/-/g, '_')}.zip，${order.value.createTime} 上传。`
  }
})

const photoEvidenceMeta = computed(() => {
  if (!order.value) return { count: 0, text: '-' }
  const countMap: Record<WorkorderVO['source'], number> = {
    pilot: 5,
    inspection: 3,
    alert: 2,
    aftersale: 4,
    maintenance: 4,
    service: 2,
    manual: 1
  }
  const count = countMap[order.value.source]
  return {
    count,
    text: `现场照片与异常截图共 ${count} 份，已绑定当前工单。`
  }
})

const currentAction = computed(() => {
  if (!order.value) {
    return { title: '-', description: '-', primaryText: '', action: '' }
  }
  const actionMap: Record<
    WorkorderVO['status'],
    { title: string; description: string; primaryText?: string; action?: string }
  > = {
    pending: {
      title: '当前应完成工单受理',
      description: '请确认停飞结论、责任分派和受理备注，提交后进入初始诊断。',
      primaryText: '去受理',
      action: 'scroll'
    },
    diagnosing: {
      title: '当前应进入初始诊断',
      description: '请结合日志和现场信息，形成故障分类、风险等级和建议备件。',
      primaryText: '去初诊',
      action: 'scroll'
    },
    picking: {
      title: '当前应完成领料确认',
      description: '请登记仓库和备件清单，提交后流转至维修环节。',
      primaryText: '去领料',
      action: 'scroll'
    },
    repairing: {
      title: '当前应录入维修结果',
      description: '请补充维修措施、工时与维修结论，提交后进入复检。',
      primaryText: '去维修',
      action: 'scroll'
    },
    inspecting: {
      title: '当前应提交复检结论',
      description: '请完成电池核验、试飞验证和复检说明，决定是否进入放行审核。',
      primaryText: '去复检',
      action: 'scroll'
    },
    releasing: {
      title: '当前应进入放行审核',
      description: '请结合维修、复检和电池核验结果，在放行审核页提交最终结论。',
      primaryText: '去放行审核',
      action: 'release-page'
    },
    completed: {
      title: '当前工单已完成闭环',
      description: '可回看放行结论、处理记录和全部证据资料。'
    },
    closed: {
      title: '当前工单已关闭',
      description: '该工单已结束处理，可查看关闭原因与责任链记录。'
    }
  }
  return actionMap[order.value.status]
})

const showProcessingForm = computed(() =>
  ['pending', 'diagnosing', 'picking', 'repairing', 'inspecting'].includes(order.value?.status || '')
)

const processingFormTitle = computed(() => {
  const titleMap: Partial<Record<WorkorderVO['status'], string>> = {
    pending: '受理录入',
    diagnosing: '初始诊断',
    picking: '领料录入',
    repairing: '维修录入',
    inspecting: '复检录入'
  }
  return titleMap[order.value?.status || 'pending'] || '处理录入'
})

const getOrderId = () => Number(route.params.id)

const resetStageForms = () => {
  acceptForm.priority = 'P2'
  acceptForm.remark = ''
  diagnoseForm.faultCategory = ''
  diagnoseForm.riskLevel = 'medium'
  diagnoseForm.suggestedPartsText = ''
  diagnoseForm.conclusion = ''
  pickForm.warehouse = '华东备件库'
  pickForm.itemsText = ''
  repairForm.solution = ''
  repairForm.result = ''
  repairForm.usedHours = 2
  inspectForm.result = 'passed'
  inspectForm.conclusion = ''
  inspectForm.batteryCheck = true
  inspectForm.flightTest = true
}

const syncOperatorForms = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  acceptForm.assignee = currentOperatorName.value
  diagnoseForm.engineer = currentOperatorName.value
  pickForm.picker = currentOperatorName.value
  repairForm.technician = currentOperatorName.value
  inspectForm.inspector = currentOperatorName.value
}

const loadOrder = async () => {
  try {
    await syncOperatorForms()
    resetStageForms()
    order.value = YianWorkorderApi.getDetail(getOrderId())
  } catch {
    order.value = undefined
  }
}

const scrollToProcessingForm = async () => {
  await nextTick()
  document.getElementById('workorder-processing-form')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

const handlePrimaryAction = () => {
  if (!order.value) return
  if (currentAction.value.action === 'release-page') {
    router.push(`/workorder/release?orderId=${order.value.id}`)
    return
  }
  scrollToProcessingForm()
}

const handleViewEvidence = () => {
  message.info('MVP 演示版暂以工单详情摘要展示证据，后续可接入证据查看器。')
}

const handleImportLog = () => {
  message.info('MVP 演示版暂未接入真实日志导入页，可在原型中查看导入入口。')
}

const submitAcceptance = () => {
  if (!order.value || !acceptForm.assignee) {
    message.warning('请先确认受理人')
    return
  }
  acceptForm.assignee = currentOperatorName.value
  YianWorkorderApi.submitAcceptance(order.value.id, acceptForm)
  message.success('已进入初诊环节')
  loadOrder()
}

const submitDiagnosis = () => {
  if (!order.value || !diagnoseForm.engineer || !diagnoseForm.faultCategory || !diagnoseForm.conclusion) {
    message.warning('请完整填写初诊信息')
    return
  }
  diagnoseForm.engineer = currentOperatorName.value
  YianWorkorderApi.submitDiagnosis(order.value.id, {
    engineer: diagnoseForm.engineer,
    faultCategory: diagnoseForm.faultCategory,
    riskLevel: diagnoseForm.riskLevel,
    conclusion: diagnoseForm.conclusion,
    suggestedParts: diagnoseForm.suggestedPartsText
      .split(/[、，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  })
  message.success('已进入领料环节')
  loadOrder()
}

const parseMaterialItems = () =>
  pickForm.itemsText
    .split(/[；;\n]/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [name, spec, quantity] = row.split('|').map((item) => item.trim())
      return {
        name,
        spec,
        quantity: Number(quantity || 1),
        status: 'picked' as const
      }
    })
    .filter((item) => item.name)

const submitPicking = () => {
  if (!order.value || !pickForm.picker) {
    message.warning('请填写领料信息')
    return
  }
  pickForm.picker = currentOperatorName.value
  const items = parseMaterialItems()
  if (!items.length) {
    message.warning('请至少填写一项备件')
    return
  }
  YianWorkorderApi.submitPicking(order.value.id, {
    picker: pickForm.picker,
    warehouse: pickForm.warehouse,
    items
  })
  message.success('已进入维修环节')
  loadOrder()
}

const submitRepair = () => {
  if (!order.value || !repairForm.technician || !repairForm.solution || !repairForm.result) {
    message.warning('请完整填写维修结果')
    return
  }
  repairForm.technician = currentOperatorName.value
  YianWorkorderApi.submitRepair(order.value.id, repairForm)
  message.success('已进入复检环节')
  loadOrder()
}

const submitInspection = () => {
  if (!order.value || !inspectForm.inspector || !inspectForm.conclusion) {
    message.warning('请完整填写复检结果')
    return
  }
  inspectForm.inspector = currentOperatorName.value
  YianWorkorderApi.submitInspection(order.value.id, inspectForm)
  message.success(inspectForm.result === 'passed' ? '已进入放行审核' : '复检未通过，已退回维修')
  loadOrder()
}

watch(
  () => route.params.id,
  () => {
    loadOrder()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.detail-card__head,
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-card__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.detail-card__meta,
.timeline-text,
.action-panel__desc,
.evidence-item p {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.detail-card__meta {
  margin-top: 8px;
}

.detail-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.info-field {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.info-field strong {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.info-field span {
  display: block;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.info-field--full {
  grid-column: 1 / -1;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evidence-item {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.evidence-item p {
  margin: 10px 0 0;
}

.timeline-title,
.action-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.action-panel__desc {
  margin: 12px 0 16px;
}

.text-danger {
  color: var(--el-color-danger);
}

@media (max-width: 900px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-field--full {
    grid-column: auto;
  }
}
</style>
