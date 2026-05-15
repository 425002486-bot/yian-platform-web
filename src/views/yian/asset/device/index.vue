<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="88px" class="mb-16px">
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
      <el-form-item label="设备状态" prop="currentStatus">
        <el-select
          v-model="queryParams.currentStatus"
          placeholder="请选择设备状态"
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
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-4px" />
          查询
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-4px" />
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px flex flex-wrap gap-12px">
      <el-button type="primary" @click="handleCreate">
        <Icon icon="ep:plus" class="mr-4px" />
        单个录入
      </el-button>
      <el-button @click="handleImport">
        <Icon icon="ep:upload" class="mr-4px" />
        批量导入
      </el-button>
      <el-button :loading="exportLoading" @click="handleExport">
        <Icon icon="ep:download" class="mr-4px" />
        导出
      </el-button>
    </div>

    <el-table v-loading="loading" :data="pagedRows" stripe>
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
      <el-table-column label="设备类型" min-width="160">
        <template #default="{ row }">
          <div>{{ row.machineryTypeName || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="所属站点" min-width="160">
        <template #default="{ row }">
          <div>{{ row.assetMaster.siteName || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="责任人" min-width="140">
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
          <el-tag :type="row.assetMaster.currentStatusTagType">{{ row.assetMaster.currentStatusLabel }}</el-tag>
          <div class="mt-6px text-secondary">{{ row.assetMaster.statusReason }}</div>
        </template>
      </el-table-column>
      <el-table-column label="标配电池" min-width="220">
        <template #default="{ row }">
          <div class="font-600">{{ formatBatteryCount(row.assetMaster.standardBatteryCodes) }}</div>
          <div class="text-secondary">{{ formatBatterySummary(row.assetMaster.standardBatteryCodes) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row.id)">设备详情</el-button>
          <el-button
            v-if="hasActiveWorkorder(row.assetMaster.workorderSummary)"
            link
            type="primary"
            @click="handleWorkorders(row.code)"
          >
            关联工单
          </el-button>
          <el-button v-else link type="primary" @click="handleHistory(row.id)">设备履历</el-button>
          <el-button link type="primary" @click="handleInspection(row.id)">巡检</el-button>
          <el-button link type="primary" @click="handleEdit(row.id)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      :total="filteredRows.length"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="noop"
    />
  </ContentWrap>

  <MachineryForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  ASSET_DEVICE_STATUS_OPTIONS,
  resolveAssetDeviceMasterRecord,
  type AssetDeviceCurrentStatus,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'
import { formatDate } from '@/utils/formatTime'
import download from '@/utils/download'
import MachineryForm from '@/views/mes/dv/machinery/MachineryForm.vue'

defineOptions({ name: 'AssetDevice' })

type AssetDeviceRow = DvMachineryVO & {
  assetMaster: AssetDeviceMasterRecordVO
}

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const exportLoading = ref(false)
const deviceList = ref<DvMachineryVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  code: '',
  name: '',
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
  queryParams.currentStatus = ''
  handleQuery()
}

const handleCreate = () => {
  formRef.value?.open('create')
}

const handleEdit = (id: number) => {
  formRef.value?.open('update', id)
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
      item.brand || '',
      item.specification || '',
      item.assetMaster.standardBatteryCodes.join(','),
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

const handleHistory = (id: number) => {
  router.push(`/asset/device/detail/${id}/history`)
}

const handleWorkorders = (code?: string) => {
  if (!code) return
  router.push({
    path: '/workorder/list',
    query: { deviceCode: code }
  })
}

const handleInspection = (id: number) => {
  router.push(`/asset/device/detail/${id}/inspection`)
}

const hasActiveWorkorder = (summary?: string) => !!summary && !summary.includes('当前无在途')

const formatBatteryCount = (batteries: string[]) => {
  if (!batteries.length) return '未配置'
  return `${batteries.length} 块`
}

const formatBatterySummary = (batteries: string[]) => {
  if (!batteries.length) return '暂无标配电池'
  if (batteries.length <= 2) return batteries.join('、')
  return `${batteries.slice(0, 2).join('、')} 等 ${batteries.length - 2} 块`
}

const noop = () => undefined

onMounted(() => {
  getList()
})
</script>

<style lang="scss" scoped>
.text-secondary {
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
