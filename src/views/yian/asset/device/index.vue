<template>
  <ContentWrap>
    <div class="yian-prototype-page yian-asset-list-page">
      <section class="yian-prototype-filter">
        <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="88px">
          <el-form-item label="设备编号" prop="code">
            <el-input
              v-model="queryParams.code"
              placeholder="请输入设备编号"
              clearable
              class="!w-220px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="设备名称" prop="name">
            <el-input
              v-model="queryParams.name"
              placeholder="请输入设备名称"
              clearable
              class="!w-220px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="启用状态" prop="enableStatus">
            <el-select
              v-model="queryParams.enableStatus"
              placeholder="请选择启用状态"
              clearable
              class="!w-220px"
            >
              <el-option
                v-for="item in ASSET_DEVICE_ENABLE_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="当前状态" prop="currentStatus">
            <el-select
              v-model="queryParams.currentStatus"
              placeholder="请选择当前状态"
              clearable
              class="!w-220px"
            >
              <el-option
                v-for="item in ASSET_DEVICE_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleQuery">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </section>

      <section class="yian-prototype-toolbar">
        <el-button v-if="canManageAsset" type="primary" @click="handleCreate">
          <Icon icon="ep:plus" class="mr-4px" />
          单个录入
        </el-button>
        <el-button v-if="canManageAsset" @click="handleImport">
          <Icon icon="ep:upload" class="mr-4px" />
          批量导入
        </el-button>
        <el-button :loading="exportLoading" @click="handleExport">
          <Icon icon="ep:download" class="mr-4px" />
          导出
        </el-button>
      </section>

      <section class="yian-prototype-panel asset-list-panel">
        <el-table v-loading="loading" :data="pagedRows" stripe class="asset-list-table">
          <el-table-column label="设备编号 / SN" min-width="220">
            <template #default="{ row }">
              <div class="font-600">{{ row.code || '-' }}</div>
              <div class="text-secondary">SN：{{ row.assetMaster.serialNumber || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="设备名称" min-width="180">
            <template #default="{ row }">
              <div>{{ row.name || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="设备类型" min-width="140">
            <template #default="{ row }">
              <div>{{ row.machineryTypeName || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="所属站点" min-width="160">
            <template #default="{ row }">
              <div>{{ row.assetMaster.siteName || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="责任人" min-width="120">
            <template #default="{ row }">
              <div>{{ row.assetMaster.ownerName || '-' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="启用状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.assetMaster.enableStatus === 'enabled' ? 'success' : 'info'">
                {{ row.assetMaster.enableStatusLabel }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="当前状态" min-width="220">
            <template #default="{ row }">
              <el-tag class="device-status-tag" :class="statusTagClass(row.assetMaster.currentStatus)">
                {{ row.assetMaster.currentStatusLabel }}
              </el-tag>
              <div class="mt-6px text-secondary">{{ row.assetMaster.statusReason }}</div>
              <div v-if="visibleWarningSummary(row.assetMaster)" class="mt-6px status-warning-text">
                {{ visibleWarningSummary(row.assetMaster) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="标配电池" min-width="220">
            <template #default="{ row }">
              <div class="font-600">{{ formatBatteryCount(row) }}</div>
              <div class="text-secondary">{{ formatBatterySummary(row) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleDetail(row.id)">设备详情</el-button>
              <el-button v-if="canInspectAsset" link type="primary" @click="handleInspectionRecord(row)">
                巡检
              </el-button>
              <el-button
                v-if="hasActiveWorkorder(row.assetMaster.workorderSummary)"
                link
                type="primary"
                @click="handleWorkorders(row.code)"
              >
                关联工单
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

  <MachineryForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { onActivated, onMounted } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  ASSET_DEVICE_ENABLE_STATUS_OPTIONS,
  ASSET_DEVICE_STATUS_OPTIONS,
  refreshAssetDeviceRuleRecords,
  resolveAssetDeviceMasterRecord,
  type AssetDeviceEnableStatus,
  type AssetDeviceCurrentStatus,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'
import { formatDate } from '@/utils/formatTime'
import download from '@/utils/download'
import MachineryForm from '@/views/mes/dv/machinery/MachineryForm.vue'
import { getCurrentYianAccess, hasYianPermission } from '@/utils/yian/access'

defineOptions({ name: 'AssetDevice' })

const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'

type AssetDeviceRow = DvMachineryVO & {
  assetMaster: AssetDeviceMasterRecordVO
}

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const exportLoading = ref(false)
const canManageAsset = ref(false)
const canInspectAsset = ref(false)
const deviceList = ref<DvMachineryVO[]>([])
const hasMounted = ref(false)
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  code: '',
  name: '',
  enableStatus: '' as AssetDeviceEnableStatus | '',
  currentStatus: '' as AssetDeviceCurrentStatus | ''
})

const assetRows = computed<AssetDeviceRow[]>(() =>
  deviceList.value.map((item) => ({
    ...item,
    assetMaster: resolveAssetDeviceMasterRecord(item)
  }))
)

const filteredRows = computed(() =>
  assetRows.value.filter((item) => {
    if (queryParams.enableStatus && item.assetMaster.enableStatus !== queryParams.enableStatus) {
      return false
    }
    if (queryParams.currentStatus && item.assetMaster.currentStatus !== queryParams.currentStatus) {
      return false
    }
    return true
  })
)

const pagedRows = computed(() => {
  const start = (queryParams.pageNo - 1) * queryParams.pageSize
  return filteredRows.value.slice(start, start + queryParams.pageSize)
})

const getList = async () => {
  loading.value = true
  try {
    const data = await DvMachineryApi.getMachineryPage({
      pageNo: 1,
      pageSize: 100,
      code: queryParams.code || undefined,
      name: queryParams.name || undefined
    })
    deviceList.value = data.list
    await refreshAssetDeviceRuleRecords(deviceList.value)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.enableStatus = ''
  queryParams.currentStatus = ''
  handleQuery()
}

const handleCreate = () => {
  formRef.value?.open('create')
}

const handleImport = () => {
  router.push('/asset/import')
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const header = [
      '设备编号',
      '序列号',
      '设备名称',
      '设备类型',
      '所属站点',
      '责任人',
      '启用状态',
      '当前状态',
      '预警建议',
      '品牌',
      '规格型号',
      '标配电池SN列表',
      '建档资料解析摘要',
      '最近巡检时间',
      '备注'
    ]
    const rows = filteredRows.value.map((item) => [
      item.code || '',
      item.assetMaster.serialNumber || '',
      item.name || '',
      item.machineryTypeName || '',
      item.assetMaster.siteName || '',
      item.assetMaster.ownerName || '',
      item.assetMaster.enableStatusLabel || '',
      item.assetMaster.currentStatusLabel || '',
      `${item.assetMaster.warningSummary || ''} ${item.assetMaster.recommendedAction || ''}`.trim(),
      item.brand || '',
      item.specification || '',
      isAircraftDevice(item) ? item.assetMaster.standardBatteryCodes.join(',') || '未配置' : '-',
      item.assetMaster.parseSummary || '',
      item.assetMaster.latestInspectionAt || '',
      item.remark || ''
    ])
    const content = [header, ...rows].map((row) => row.join('\t')).join('\n')
    download.excel(
      new Blob([`\ufeff${content}`]),
      `设备台账-${formatDate(new Date(), 'YYYY-MM-DD')}.xls`
    )
  } finally {
    exportLoading.value = false
  }
}

const handleDetail = (id: number) => {
  router.push(`/asset/device/detail/${id}`)
}

const handleWorkorders = (code?: string) => {
  if (!code) return
  router.push({
    path: '/workorder/list',
    query: { deviceCode: code }
  })
}

const handleInspectionRecord = (row: AssetDeviceRow) => {
  router.push({
    path: '/asset/inspection/create',
    query: {
      assetType: 'device',
      id: String(row.id || '')
    }
  })
}

const hasActiveWorkorder = (summary?: string) => !!summary && !summary.includes('当前无在途')

const isAircraftDevice = (row: AssetDeviceRow) => row.machineryTypeName === AIRCRAFT_MACHINERY_TYPE_NAME

const statusTagClass = (status: AssetDeviceCurrentStatus) => `status-tag--${status}`

const visibleWarningSummary = (record: AssetDeviceMasterRecordVO) => {
  const summary = record.warningSummary?.trim()
  if (!summary || summary === '当前无显著风险') return ''
  if (summary === '建档资料未补齐') return ''
  return record.statusReason.includes(summary) ? '' : summary
}

const formatBatteryCount = (row: AssetDeviceRow) => {
  if (!isAircraftDevice(row)) return '-'
  const batteries = row.assetMaster.standardBatteryCodes
  if (!batteries.length) return '未配置'
  return `${batteries.length} 组`
}

const formatBatterySummary = (row: AssetDeviceRow) => {
  if (!isAircraftDevice(row)) return '-'
  const batteries = row.assetMaster.standardBatteryCodes
  if (!batteries.length) return '暂无标配电池'
  if (batteries.length <= 2) return batteries.join('、')
  return `${batteries.slice(0, 2).join('、')} 等 ${batteries.length} 组`
}

const noop = () => undefined

onMounted(async () => {
  const access = await getCurrentYianAccess()
  canManageAsset.value = hasYianPermission(access, 'asset', 'exec')
  canInspectAsset.value = hasYianPermission(access, 'inspect', 'exec')
  await getList()
  hasMounted.value = true
})

onActivated(() => {
  if (!hasMounted.value) {
    return
  }
  getList()
})
</script>

<style lang="scss" scoped>
.asset-list-panel {
  padding: 0;
  overflow: hidden;
}

.asset-list-table {
  :deep(.el-table) {
    border: 0;
    border-radius: 0;
  }

  :deep(.el-table__inner-wrapper::before),
  :deep(.el-table::before) {
    display: none;
  }

  :deep(th.el-table__cell:first-child) {
    border-top-left-radius: 24px;
  }

  :deep(th.el-table__cell:last-child) {
    border-top-right-radius: 24px;
  }

  :deep(.el-table__body-wrapper) {
    scrollbar-gutter: stable;
  }
}

.status-warning-text {
  color: var(--el-color-warning-dark-2);
  line-height: 1.6;
}

.asset-list-footer {
  padding: 14px 20px 16px;
  border-top: 1px solid rgba(216, 226, 234, 0.85);
  background: linear-gradient(180deg, rgba(248, 251, 253, 0.68) 0%, #ffffff 100%);
}

.asset-list-footer :deep(.yian-prototype-pagination) {
  margin-top: 0;
}

.device-status-tag {
  border-width: 1px;
  font-weight: 500;
}

.status-tag--pending_check,
.status-tag--repairing,
.status-tag--pending_release {
  color: #b45309;
  background: #fff7ed;
  border-color: #fdba74;
}

.status-tag--available {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
}

.status-tag--grounded {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fca5a5;
}
</style>
