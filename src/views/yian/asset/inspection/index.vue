<template>
  <ContentWrap>
    <div class="yian-prototype-page yian-asset-list-page">
      <section class="yian-prototype-filter">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="88px">
          <el-form-item label="资产类型" prop="assetType">
            <el-select
              v-model="queryParams.assetType"
              placeholder="请选择资产类型"
              clearable
              class="!w-180px"
            >
              <el-option label="设备" value="device" />
              <el-option label="电池" value="battery" />
            </el-select>
          </el-form-item>
          <el-form-item label="巡检对象" prop="assetCode">
            <el-input
              v-model="queryParams.assetCode"
              placeholder="请输入设备编号、电池编号或名称"
              clearable
              class="!w-260px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="巡检结论" prop="conclusion">
            <el-select
              v-model="queryParams.conclusion"
              placeholder="请选择巡检结论"
              clearable
              class="!w-180px"
            >
              <el-option label="合格" value="pass" />
              <el-option label="观察" value="observe" />
              <el-option label="异常" value="grounded" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleQuery">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </section>

      <section class="yian-prototype-toolbar">
        <el-button v-if="canCreateInspection" type="primary" @click="openCreateDialog">
          <Icon icon="ep:plus" class="mr-4px" />
          发起设备巡检
        </el-button>
      </section>

      <section class="yian-prototype-panel asset-list-panel">
        <el-table v-loading="loading" :data="pagedRows" stripe class="asset-list-table">
          <el-table-column label="巡检时间" prop="inspectedAt" width="170" />

          <el-table-column label="巡检对象" min-width="220">
            <template #default="{ row }">
              <div class="font-600">{{ row.assetCode }}</div>
              <div class="text-secondary">{{ row.assetName }}</div>
            </template>
          </el-table-column>

          <el-table-column label="资产类型" width="110">
            <template #default="{ row }">
              <el-tag :type="row.assetType === 'device' ? 'primary' : 'success'">
                {{ row.assetTypeLabel }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="巡检类型" prop="inspectionMode" min-width="140" />
          <el-table-column label="巡检人" prop="inspector" width="120" />

          <el-table-column label="结论" width="100">
            <template #default="{ row }">
              <el-tag :type="conclusionTagType(row.conclusionCode)">{{ row.conclusionLabel }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="巡检摘要" min-width="360">
            <template #default="{ row }">
              <div>{{ row.summary || '-' }}</div>
              <div v-if="row.notes" class="text-secondary mt-6px">{{ row.notes }}</div>
            </template>
          </el-table-column>

          <el-table-column label="附件" width="110">
            <template #default="{ row }">
              {{ row.attachments.length ? `${row.attachments.length} 份` : '-' }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewAsset(row)">查看对象</el-button>
              <el-button
                link
                type="primary"
                :disabled="!row.attachments.length"
                @click="openAttachments(row)"
              >
                查看附件
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="asset-list-footer">
          <Pagination
            class="yian-prototype-pagination"
            :total="filteredRows.length"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="noop"
          />
        </div>
      </section>
    </div>
  </ContentWrap>

  <el-dialog v-model="createDialogVisible" title="发起设备巡检" width="520px">
    <el-form :model="createForm" label-width="88px">
      <el-form-item label="资产类型">
        <el-radio-group v-model="createForm.assetType">
          <el-radio-button label="device">设备</el-radio-button>
          <el-radio-button label="battery">电池</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="巡检对象">
        <el-select
          v-model="createForm.targetId"
          placeholder="请选择巡检对象"
          filterable
          class="!w-1/1"
        >
          <el-option
            v-for="item in selectableTargets"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleCreateInspection">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="attachmentDialogVisible" title="巡检附件" width="720px">
    <el-empty v-if="!attachmentDialogFiles.length" description="当前巡检记录没有附件" />
    <el-table v-else :data="attachmentDialogFiles" stripe>
      <el-table-column label="文件名称" prop="fileName" min-width="240" />
      <el-table-column label="类型" prop="category" width="100" />
      <el-table-column label="摘要" prop="summary" min-width="180" />
      <el-table-column label="大小" prop="sizeLabel" width="100" />
      <el-table-column label="上传时间" prop="uploadedAt" width="160" />
      <el-table-column label="上传人" prop="uploadedBy" width="120" />
    </el-table>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import type { AssetInspectionAttachmentVO, AssetBatteryInspectionVO } from '@/api/yian/asset'
import { resolveAssetBatteryProfile } from '@/api/yian/asset'
import {
  resolveAssetDeviceMasterRecord,
  type AssetDeviceInspectionRecordVO
} from '@/api/yian/asset/deviceMaster'
import { getCurrentYianAccess, hasYianPermission } from '@/utils/yian/access'

defineOptions({ name: 'AssetInspectionIndex' })

type InspectionAssetType = 'device' | 'battery'
type InspectionConclusionCode = 'pass' | 'observe' | 'grounded'

type InspectionRow = {
  id: string
  assetType: InspectionAssetType
  assetTypeLabel: string
  assetId: string | number
  assetCode: string
  assetName: string
  inspectedAt: string
  inspectionMode: string
  inspector: string
  conclusionCode: InspectionConclusionCode
  conclusionLabel: string
  summary: string
  notes: string
  attachments: AssetInspectionAttachmentVO[]
}

type CreateTargetOption = {
  value: string
  label: string
}

const ATTENTION_KEYWORDS = ['异常', '不良', '关注', '待补', '风险', '告警', '复检', '不通过', '缺少', '备注']
const INSPECTION_MODE_LABEL_MAP: Record<string, string> = {
  '30天例行巡检': '例行巡检',
  '15天高频巡检': '专项巡检',
  '异常复核巡检': '复检',
  '人工巡检': '例行巡检',
  '检测工装': '专项巡检',
  'BMS 复核': '复检',
  BMS: '复检',
  '检测报告': '入库/启用前检查',
  '人工导入': '专项巡检'
}

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const canCreateInspection = ref(false)
const queryFormRef = ref()
const deviceList = ref<DvMachineryVO[]>([])
const batteryList = ref<AssetBatteryVO[]>([])
const createDialogVisible = ref(false)
const attachmentDialogVisible = ref(false)
const attachmentDialogFiles = ref<AssetInspectionAttachmentVO[]>([])
const createForm = reactive({
  assetType: 'device' as InspectionAssetType,
  targetId: ''
})
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  assetType: '' as InspectionAssetType | '',
  assetCode: '',
  conclusion: '' as InspectionConclusionCode | ''
})

const getConclusionCode = (value?: string): InspectionConclusionCode => {
  if (value === 'observe' || value === '观察' || value?.includes('观察')) return 'observe'
  if (value === 'grounded' || value === '异常' || value?.includes('异常')) return 'grounded'
  return 'pass'
}

const getConclusionLabel = (code: InspectionConclusionCode) => {
  if (code === 'observe') return '观察'
  if (code === 'grounded') return '异常'
  return '合格'
}

const normalizeInspectionMode = (value?: string) =>
  INSPECTION_MODE_LABEL_MAP[String(value || '').trim()] || String(value || '').trim() || '-'

const normalizeInspectionSummary = (summary: string, notes: string) => {
  const normalizedSummary = summary.trim()
  const normalizedNotes = notes.includes('未补录附件') ? '' : notes.trim()
  const summaryLines = normalizedSummary
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  const attentionParts: string[] = []
  summaryLines.forEach((line) => {
    if (line.includes('关注项') || line.includes('备注')) {
      attentionParts.push(line)
      return
    }
    if (ATTENTION_KEYWORDS.some((keyword) => line.includes(keyword))) {
      attentionParts.push(line)
    }
  })

  return {
    summary: attentionParts.join('；') || '-',
    notes: normalizedNotes
  }
}

const mapDeviceInspectionRow = (
  device: DvMachineryVO,
  inspection: AssetDeviceInspectionRecordVO
): InspectionRow => {
  const conclusionCode = getConclusionCode(inspection.conclusion)
  const { summary, notes } = normalizeInspectionSummary(
    [inspection.structureStatus, inspection.powerStatus, inspection.sensorStatus, inspection.complianceStatus]
      .filter(Boolean)
      .join('\n'),
    inspection.notes || ''
  )

  return {
    id: inspection.id,
    assetType: 'device',
    assetTypeLabel: '设备',
    assetId: device.id,
    assetCode: device.code || '-',
    assetName: device.name || '-',
    inspectedAt: inspection.inspectedAt,
    inspectionMode: normalizeInspectionMode(inspection.cycleLabel),
    inspector: inspection.inspector,
    conclusionCode,
    conclusionLabel: inspection.conclusionLabel || getConclusionLabel(conclusionCode),
    summary,
    notes,
    attachments: inspection.attachments || []
  }
}

const mapBatteryInspectionRow = (
  battery: AssetBatteryVO,
  inspection: AssetBatteryInspectionVO
): InspectionRow => {
  const conclusionCode = getConclusionCode(inspection.conclusion)
  const { summary, notes } = normalizeInspectionSummary(
    inspection.summary || '',
    inspection.notes || inspection.evidence || ''
  )

  return {
    id: inspection.id,
    assetType: 'battery',
    assetTypeLabel: '电池',
    assetId: battery.id,
    assetCode: battery.batteryCode,
    assetName: battery.model || '-',
    inspectedAt: inspection.inspectedAt,
    inspectionMode: normalizeInspectionMode(inspection.source),
    inspector: inspection.inspector,
    conclusionCode,
    conclusionLabel: getConclusionLabel(conclusionCode),
    summary,
    notes,
    attachments: inspection.attachments || []
  }
}

const allRows = computed<InspectionRow[]>(() => {
  const deviceRows = deviceList.value.flatMap((item) =>
    resolveAssetDeviceMasterRecord(item).inspections.map((inspection) => mapDeviceInspectionRow(item, inspection))
  )
  const batteryRows = batteryList.value.flatMap((item) =>
    resolveAssetBatteryProfile(item).inspectionRecords.map((inspection) =>
      mapBatteryInspectionRow(item, inspection)
    )
  )
  return [...deviceRows, ...batteryRows].sort((left, right) =>
    right.inspectedAt.localeCompare(left.inspectedAt)
  )
})

const filteredRows = computed(() =>
  allRows.value.filter((item) => {
    if (queryParams.assetType && item.assetType !== queryParams.assetType) return false
    if (queryParams.conclusion && item.conclusionCode !== queryParams.conclusion) return false
    if (queryParams.assetCode) {
      const keyword = queryParams.assetCode.trim().toLowerCase()
      const matched = [item.assetCode, item.assetName].some((field) =>
        String(field || '')
          .toLowerCase()
          .includes(keyword)
      )
      if (!matched) return false
    }
    return true
  })
)

const pagedRows = computed(() => {
  const start = (queryParams.pageNo - 1) * queryParams.pageSize
  return filteredRows.value.slice(start, start + queryParams.pageSize)
})

const selectableTargets = computed<CreateTargetOption[]>(() => {
  if (createForm.assetType === 'battery') {
    return batteryList.value.map((item) => ({
      value: String(item.id),
      label: `${item.batteryCode} / ${item.model || '-'}`
    }))
  }
  return deviceList.value.map((item) => ({
    value: String(item.id),
    label: `${item.code || '-'} / ${item.name || '-'}`
  }))
})

const syncQueryFromRoute = () => {
  queryParams.assetType =
    route.query.assetType === 'device' || route.query.assetType === 'battery'
      ? (route.query.assetType as InspectionAssetType)
      : ''
  queryParams.assetCode = String(route.query.assetCode || '')
  queryParams.conclusion =
    route.query.conclusion === 'pass' ||
    route.query.conclusion === 'observe' ||
    route.query.conclusion === 'grounded'
      ? (route.query.conclusion as InspectionConclusionCode)
      : ''
}

const syncCreateDialogFromQuery = () => {
  const routeAssetType =
    route.query.assetType === 'device' || route.query.assetType === 'battery'
      ? (route.query.assetType as InspectionAssetType)
      : 'device'
  createForm.assetType = routeAssetType
  const routeAssetCode = String(route.query.assetCode || '')
  const matchedOption = selectableTargets.value.find((item) => item.label.includes(routeAssetCode))
  createForm.targetId = matchedOption?.value || ''
}

const getList = async () => {
  loading.value = true
  try {
    const [deviceData, batteries] = await Promise.all([
      DvMachineryApi.getMachineryPage({ pageNo: 1, pageSize: 100 }),
      YianAssetApi.getBatteryList()
    ])
    deviceList.value = deviceData.list
    batteryList.value = batteries
    syncCreateDialogFromQuery()
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.assetType = ''
  queryParams.assetCode = ''
  queryParams.conclusion = ''
  queryParams.pageNo = 1
  router.replace({ path: '/asset/inspection' })
}

const openCreateDialog = () => {
  syncCreateDialogFromQuery()
  createDialogVisible.value = true
}

const handleCreateInspection = () => {
  if (!createForm.targetId) {
    message.warning('请先选择巡检对象')
    return
  }
  createDialogVisible.value = false
  router.push({
    path: '/asset/inspection/create',
    query: {
      from: 'inspection-list',
      assetType: createForm.assetType,
      id: createForm.targetId
    }
  })
}

const conclusionTagType = (value: InspectionConclusionCode) => {
  if (value === 'observe') return 'warning'
  if (value === 'grounded') return 'danger'
  return 'success'
}

const viewAsset = (row: InspectionRow) => {
  if (row.assetType === 'battery') {
    router.push(`/asset/battery/detail/${row.assetId}`)
    return
  }
  router.push(`/asset/device/detail/${row.assetId}`)
}

const openAttachments = (row: InspectionRow) => {
  attachmentDialogFiles.value = row.attachments
  attachmentDialogVisible.value = true
}

const noop = () => undefined

watch(
  () => route.query,
  () => {
    syncQueryFromRoute()
    syncCreateDialogFromQuery()
  },
  { immediate: true }
)

watch(
  () => createForm.assetType,
  () => {
    createForm.targetId = ''
  }
)

onMounted(async () => {
  const access = await getCurrentYianAccess()
  canCreateInspection.value = hasYianPermission(access, 'inspect', 'exec')
  getList()
})
</script>

<style lang="scss" scoped>
.asset-list-panel {
  padding: 0;
  overflow: hidden;
}

.asset-list-table {
  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }
}

.asset-list-footer {
  padding: 14px 18px 18px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.text-secondary {
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
</style>
