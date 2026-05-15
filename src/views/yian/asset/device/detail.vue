<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备台账"
      :content="device?.code ? `设备详情 - ${device.code}` : '设备详情'"
    >
      <template #extra>
        <el-space wrap>
          <el-button @click="handleEdit">
            <Icon icon="ep:edit" class="mr-4px" />
            编辑
          </el-button>
          <el-button @click="goInspection">
            <Icon icon="ep:checked" class="mr-4px" />
            设备巡检
          </el-button>
          <el-button @click="goDocs">
            <Icon icon="ep:document" class="mr-4px" />
            建档附件
          </el-button>
          <el-button @click="goHistory">
            <Icon icon="ep:histogram" class="mr-4px" />
            设备履历
          </el-button>
          <el-button type="primary" @click="goWorkorders">
            <Icon icon="ep:tickets" class="mr-4px" />
            关联工单列表
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="device">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">当前状态</div>
            <el-tag :type="record.currentStatusTagType">{{ record.currentStatusLabel }}</el-tag>
            <div class="summary-block__headline mt-10px">{{ record.currentStage }}</div>
            <div class="summary-block__text">{{ record.statusReason }}</div>
            <div class="summary-block__hint">{{ record.statusSource }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">启用状态</div>
            <div class="summary-block__headline">{{ record.enableStatusLabel }}</div>
            <div class="summary-block__text">状态更新时间：{{ record.statusUpdatedAt }}</div>
            <div class="summary-block__hint">{{ record.inspectionDueText }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">标配电池</div>
            <div class="summary-block__headline">{{ record.standardBatteryCodes.length }} 块</div>
            <div class="summary-block__text">{{ standardBatteryLabel }}</div>
            <div class="summary-block__hint">
              {{ record.latestAttachmentWarning || '当前暂无新的识别提示' }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-descriptions :column="3" border class="mt-20px">
        <el-descriptions-item label="设备编号">{{ device.code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="序列号">{{ record.serialNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ device.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ device.machineryTypeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属站点">{{ record.siteName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="责任人">{{ record.ownerName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="启用状态">{{ record.enableStatusLabel }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">{{ record.currentStatusLabel }}</el-descriptions-item>
        <el-descriptions-item label="标配电池">{{ standardBatteryLabel }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ device.brand || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规格型号">{{ device.specification || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近巡检">{{ record.latestInspectionAt || '暂无记录' }}</el-descriptions-item>
        <el-descriptions-item label="最近保养">{{ formatDateSafe(device.lastMaintenTime) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateSafe(device.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ device.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">建档资料</div>
        </template>
        <div class="prototype-stack">
          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">建档信息</span>
              <el-tag type="info" round>已录入</el-tag>
            </div>
            <div class="prototype-item__desc">{{ archiveInfoText }}</div>
          </div>

          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">证照材料</span>
              <el-tag type="success" round>{{ documentStatusLabel }}</el-tag>
            </div>
            <div class="prototype-item__desc">{{ documentSummary }}</div>
            <el-button class="mt-16px" round @click="goDocs">查看建档附件</el-button>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">主档资料解析结果</div>
        </template>
        <div class="prototype-stack">
          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">解析摘要</span>
              <el-tag type="info" round>{{ parsedFieldCountLabel }}</el-tag>
            </div>
            <div class="prototype-item__desc">{{ parseSummaryText }}</div>
          </div>

          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">设备号比对</span>
              <el-tag :type="deviceCompareTag.type" round>{{ deviceCompareTag.label }}</el-tag>
            </div>
            <div class="prototype-item__desc">{{ deviceCompareText }}</div>
          </div>

          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">有效期抽取</span>
              <el-tag :type="validityTag.type" round>{{ validityTag.label }}</el-tag>
            </div>
            <div class="prototype-item__desc">{{ validityText }}</div>
          </div>

          <div class="prototype-item">
            <div class="prototype-item__header">
              <span class="prototype-item__title">疑似缺失项</span>
              <el-tag :type="missingTag.type" round>{{ missingTag.label }}</el-tag>
            </div>
            <div class="prototype-item__desc">{{ missingText }}</div>
          </div>
        </div>
      </el-card>

      <el-card ref="inspectionSectionRef" shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header flex justify-between items-center">
            <span>设备巡检记录</span>
            <el-button type="primary" link @click="goInspection">发起巡检</el-button>
          </div>
        </template>
        <el-table :data="record.inspections" stripe :row-class-name="inspectionRowClassName">
          <el-table-column label="巡检时间" prop="inspectedAt" width="160" />
          <el-table-column label="巡检人" prop="inspector" width="120" />
          <el-table-column label="巡检周期" prop="cycleLabel" width="140" />
          <el-table-column label="结论" width="120">
            <template #default="{ row }">
              <el-tag :type="inspectionTagType(row.conclusion)">{{ row.conclusionLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="检查摘要" min-width="320">
            <template #default="{ row }">
              <div>{{ row.structureStatus }}</div>
              <div class="text-secondary">{{ row.notes || row.evidence || '-' }}</div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!record.inspections.length" description="暂无设备巡检记录" class="mt-16px" />
      </el-card>
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />
  </ContentWrap>

  <MachineryForm ref="formRef" @success="getDetail" />
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  resolveAssetDeviceMasterRecord,
  type AssetDeviceInspectionRecordVO,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'
import { formatDate } from '@/utils/formatTime'
import MachineryForm from '@/views/mes/dv/machinery/MachineryForm.vue'

defineOptions({ name: 'AssetDeviceDetail' })

type MachineryDetail = DvMachineryVO & {
  createTime?: string | number | Date
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const device = ref<MachineryDetail | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))
const formRef = ref()
const inspectionSectionRef = ref()

const standardBatteryLabel = computed(() => {
  if (!record.value.standardBatteryCodes.length) return '未配置'
  return record.value.standardBatteryCodes.join('、')
})

const archiveInfoText = computed(() => {
  return `录入对象：单台主机。创建人：${record.value.ownerName || '-'}，创建时间：${formatDateSafe(device.value?.createTime)}。`
})

const documentStatusLabel = computed(() => {
  if (!record.value.documents.length) return '0 份'
  return `${record.value.documents.length} 份`
})

const documentSummary = computed(() => {
  if (!record.value.documents.length) {
    return '当前尚未补齐合格证、采购凭证、校准记录和首飞检查单，建议先进入建档附件台账补录。'
  }
  const names = record.value.documents.map((item) => item.documentType).slice(0, 4)
  return `已上传${names.join('、')}等建档资料，可进入建档附件台账统一查看原件、删除和重新解析结果。`
})

const parsedFieldCountLabel = computed(() => `${record.value.parsedFields.length} 项`)

const parseSummaryText = computed(() => {
  if (record.value.parseUpdatedAt && record.value.parseUpdatedAt !== '-') {
    return `${record.value.parseSummary || '已完成主档资料识别'} 最近识别时间为 ${record.value.parseUpdatedAt}。`
  }
  return '当前仅有基础主档信息，尚未补充完整解析资料与设备履历。'
})

const deviceCompareTag = computed(() => {
  if (!record.value.parseUpdatedAt || record.value.parseUpdatedAt === '-') {
    return { label: '待确认', type: 'warning' as const }
  }
  const hasMismatch = record.value.warnings.some(
    (item) => item.includes('设备号') || item.includes('序列号') || item.includes('编号')
  )
  return hasMismatch
    ? { label: '异常', type: 'danger' as const }
    : { label: '一致', type: 'success' as const }
})

const deviceCompareText = computed(() => {
  if (!record.value.parseUpdatedAt || record.value.parseUpdatedAt === '-') {
    return '尚未完成证照与主档设备号自动比对，建议补充合格证或检测资料后重新解析。'
  }
  if (deviceCompareTag.value.label === '异常') {
    return record.value.warnings.join('；')
  }
  return `已将解析资料中的设备标识与当前序列号 ${record.value.serialNumber || '-'} 完成自动比对，当前未发现不一致项。`
})

const validityTag = computed(() => {
  if (!record.value.parseUpdatedAt || record.value.parseUpdatedAt === '-') {
    return { label: '待补', type: 'info' as const }
  }
  return record.value.missingItems.length
    ? { label: '临期', type: 'warning' as const }
    : { label: '有效', type: 'success' as const }
})

const validityText = computed(() => {
  if (!record.value.parseUpdatedAt || record.value.parseUpdatedAt === '-') {
    return '暂未识别到有效期信息，需上传校准记录或检测资料后自动抽取。'
  }
  if (record.value.missingItems.length) {
    return `识别结果提示仍有资料待补，当前建议在 7 日内补齐并更新主档附件。`
  }
  return '当前已完成主要资料识别，可作为状态判断、巡检与放行前核验的依据。'
})

const missingTag = computed(() => {
  if (!record.value.missingItems.length) {
    return { label: '无', type: 'success' as const }
  }
  return { label: `${record.value.missingItems.length} 项`, type: 'warning' as const }
})

const missingText = computed(() => {
  if (!record.value.missingItems.length) {
    return '当前未识别到明显缺失项，建档资料完整性满足当前主档展示需求。'
  }
  return record.value.missingItems.join('；')
})

const inspectionHighlightId = computed(() =>
  typeof route.query.inspectionId === 'string' ? route.query.inspectionId : ''
)

const getDeviceId = () => Number(route.params.id)

const scrollToInspectionSection = async () => {
  if (route.query.anchor !== 'inspection') return
  await nextTick()
  const target = inspectionSectionRef.value?.$el || inspectionSectionRef.value
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    const machinery = await DvMachineryApi.getMachinery(id)
    device.value = machinery
    record.value = resolveAssetDeviceMasterRecord(machinery)
  } finally {
    loading.value = false
  }
  scrollToInspectionSection()
}

const formatDateSafe = (value?: string | number | Date) => (value ? formatDate(value as Date) : '-')

const goBack = () => {
  router.push('/asset/device')
}

const goDocs = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/docs`)
}

const goHistory = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/history`)
}

const goInspection = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/inspection`)
}

const goWorkorders = () => {
  if (!device.value?.code) return
  router.push({
    path: '/workorder/list',
    query: { deviceCode: device.value.code }
  })
}

const handleEdit = () => {
  if (!device.value?.id) return
  formRef.value?.open('update', device.value.id)
}

const inspectionTagType = (conclusion: AssetDeviceInspectionRecordVO['conclusion']) => {
  if (conclusion === 'pass') return 'success'
  if (conclusion === 'observe') return 'warning'
  return 'danger'
}

const inspectionRowClassName = ({ row }: { row: AssetDeviceInspectionRecordVO }) =>
  row.id === inspectionHighlightId.value ? 'inspection-row--highlight' : ''

watch(
  () => route.params.id,
  () => {
    getDetail()
  },
  { immediate: true }
)

watch(
  () => route.query.anchor,
  () => {
    scrollToInspectionSection()
  }
)
</script>

<style lang="scss" scoped>
.summary-block {
  min-height: 190px;
}

.summary-block__title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-block__headline {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.summary-block__text {
  margin-top: 8px;
  line-height: 1.7;
}

.summary-block__hint,
.text-secondary {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.card-header {
  font-weight: 600;
}

.prototype-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prototype-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  padding: 18px 18px 16px;
}

.prototype-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prototype-item__title {
  font-size: 15px;
  font-weight: 700;
}

.prototype-item__desc {
  margin-top: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.8;
}

:deep(.inspection-row--highlight) {
  --el-table-tr-bg-color: #f0f9eb;
}
</style>
