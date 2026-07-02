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
          <el-button @click="goInspectionRecords">
            <Icon icon="ep:checked" class="mr-4px" />
            巡检记录
          </el-button>
          <el-button @click="goDocs">
            <Icon icon="ep:document" class="mr-4px" />
            建档附件
          </el-button>
          <el-button @click="goHistory">
            <Icon icon="ep:histogram" class="mr-4px" />
            设备履历
          </el-button>
          <el-button @click="goWorkorders">
            <Icon icon="ep:tickets" class="mr-4px" />
            关联工单
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="device">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="7">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__header">
              <span class="summary-block__title">当前状态</span>
              <el-tag class="device-status-tag" :class="statusTagClass(record.currentStatus)">
                {{ record.currentStatusLabel }}
              </el-tag>
            </div>
            <div class="summary-block__text">{{ record.statusReason }}</div>
            <div v-if="visibleWarningSummary" class="summary-block__meta summary-block__meta--warning">
              {{ visibleWarningSummary }}
            </div>
            <div class="summary-block__meta">
              <span class="summary-block__label">处理建议：</span>{{ record.recommendedAction }}
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="17">
          <el-card shadow="never" class="overview-card">
            <template #header>
              <div class="card-header">主档信息</div>
            </template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="设备编号">{{ device.code || '-' }}</el-descriptions-item>
              <el-descriptions-item label="序列号">{{ record.serialNumber || '-' }}</el-descriptions-item>
              <el-descriptions-item label="设备名称">{{ device.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="设备类型">{{ device.machineryTypeName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="所属站点">{{ record.siteName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="责任人">{{ record.ownerName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="启用状态">{{ record.enableStatusLabel }}</el-descriptions-item>
              <el-descriptions-item label="当前状态">{{ record.currentStatusLabel }}</el-descriptions-item>
              <el-descriptions-item v-if="isAircraftDevice" label="标配电池">
                {{ standardBatteryLabel }}
              </el-descriptions-item>
              <el-descriptions-item label="品牌">{{ device.brand || '-' }}</el-descriptions-item>
              <el-descriptions-item label="规格型号">{{ device.specification || '-' }}</el-descriptions-item>
              <el-descriptions-item label="最近巡检">{{ record.latestInspectionAt || '暂无记录' }}</el-descriptions-item>
              <el-descriptions-item label="状态更新时间">{{ record.statusUpdatedAt }}</el-descriptions-item>
              <el-descriptions-item v-if="isAircraftDevice" label="电池摘要">
                {{ record.latestAttachmentWarning || '当前暂无新的识别提示' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateSafe(device.createTime) }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ device.remark || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header flex justify-between items-center">
            <span>资料解析</span>
            <el-button type="primary" link @click="goDocsUpload">上传附件</el-button>
          </div>
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
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />
  </ContentWrap>

  <MachineryForm ref="formRef" @success="getDetail" />
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  hydrateAssetDeviceDocumentParseFromRemote,
  refreshAssetDeviceRuleRecord,
  resolveAssetDeviceMasterRecord,
  type AssetDeviceCurrentStatus,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'
import { formatDate } from '@/utils/formatTime'
import MachineryForm from '@/views/mes/dv/machinery/MachineryForm.vue'

defineOptions({ name: 'AssetDeviceDetail' })

const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'

type MachineryDetail = DvMachineryVO & {
  createTime?: string | number | Date
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const device = ref<MachineryDetail | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))
const formRef = ref()
const hasLoaded = ref(false)

const isAircraftDevice = computed(
  () => device.value?.machineryTypeName === AIRCRAFT_MACHINERY_TYPE_NAME
)

const standardBatteryLabel = computed(() => {
  if (!record.value.standardBatteryCodes.length) return '未配置'
  return record.value.standardBatteryCodes.join('、')
})

const visibleWarningSummary = computed(() => {
  const summary = record.value.warningSummary?.trim()
  if (!summary || summary === '当前无显著风险') return ''
  if (summary === '建档资料未补齐') return ''
  return record.value.statusReason.includes(summary) ? '' : summary
})

const parsedFieldCountLabel = computed(() => `${record.value.parsedFields.length} 项`)

const parseSummaryText = computed(() => {
  if (record.value.parseUpdatedAt && record.value.parseUpdatedAt !== '-') {
    return `${record.value.parseSummary || '已完成主档资料识别'}，最近识别时间为 ${record.value.parseUpdatedAt}。`
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
    return '识别结果提示仍有资料待补，当前建议在 7 日内补齐并更新主档附件。'
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

const getDeviceId = () => Number(route.params.id)

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    const data = (await DvMachineryApi.getMachinery(id)) as MachineryDetail | null
    device.value = data
    record.value = resolveAssetDeviceMasterRecord(data)
    record.value = await hydrateAssetDeviceDocumentParseFromRemote(data)
    record.value = await refreshAssetDeviceRuleRecord(data)
    hasLoaded.value = true
  } finally {
    loading.value = false
  }
}

const formatDateSafe = (value?: string | number | Date) => (value ? formatDate(value as Date) : '-')

const goBack = () => {
  router.push('/asset/device')
}

const goDocs = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/docs`)
}

const goDocsUpload = () => {
  router.push({
    path: `/asset/device/detail/${getDeviceId()}/docs`,
    query: { action: 'upload' }
  })
}

const goHistory = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/history`)
}

const goInspectionRecords = () => {
  if (!device.value?.code) return
  router.push({
    path: '/asset/inspection',
    query: {
      assetType: 'device',
      assetCode: device.value.code
    }
  })
}

const goWorkorders = () => {
  if (!device.value?.code) return
  router.push({
    path: '/workorder/list',
    query: { deviceCode: device.value.code }
  })
}

const statusTagClass = (status: AssetDeviceCurrentStatus) => `status-tag--${status}`

const handleEdit = () => {
  if (!device.value?.id) return
  formRef.value?.open('update', device.value.id)
}

watch(
  () => route.params.id,
  () => {
    getDetail()
  },
  { immediate: true }
)

onActivated(() => {
  if (!hasLoaded.value) {
    return
  }
  getDetail()
})
</script>

<style lang="scss" scoped>
.summary-block {
  min-height: 100%;
}

.summary-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-block__title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.device-status-tag {
  border-width: 1px;
  font-weight: 500;
}

.summary-block__text {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
}

.summary-block__meta {
  margin-top: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.summary-block__meta--warning {
  color: #d97706;
}

.summary-block__label {
  color: var(--el-text-color-secondary);
}

.text-secondary {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.card-header {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.4;
}

.overview-card {
  height: 100%;
}

.overview-card :deep(.el-card__body) {
  padding-top: 0;
}

.prototype-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prototype-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 18px;
  padding: 18px 20px;
}

.prototype-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prototype-item__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.prototype-item__desc {
  margin-top: 10px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.75;
}

.status-tag--archiving {
  color: #b45309;
  border-color: rgba(249, 115, 22, 0.32);
  background: rgba(255, 247, 237, 0.92);
}

.status-tag--pending_inspection,
.status-tag--repairing,
.status-tag--pending_release {
  color: #b45309;
  border-color: rgba(249, 115, 22, 0.32);
  background: rgba(255, 247, 237, 0.92);
}

.status-tag--available {
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.28);
  background: rgba(240, 253, 244, 0.95);
}

.status-tag--grounded {
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(254, 242, 242, 0.95);
}
</style>
