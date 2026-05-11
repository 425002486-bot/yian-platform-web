<template>
  <ContentWrap>
    <el-alert
      title="资产中心按最新 MVP 原型对齐：设备状态由规则判断，附件解析、电池健康和关联事项统一在台账中汇总展示。"
      type="info"
      :closable="false"
      show-icon
      class="mb-16px"
    />

    <el-row :gutter="16" class="mb-16px">
      <el-col :xs="24" :sm="12" :lg="6" v-for="card in summaryCards" :key="card.label">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-card__label">{{ card.label }}</div>
          <div class="summary-card__value">{{ card.value }}</div>
          <div class="summary-card__desc">{{ card.desc }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-form
      ref="queryFormRef"
      :model="queryParams"
      :inline="true"
      label-width="88px"
      class="mb-16px"
    >
      <el-form-item label="设备编码" prop="code">
        <el-input
          v-model="queryParams.code"
          placeholder="请输入设备编码"
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
      <el-form-item label="所属车间" prop="workshopId">
        <el-select
          v-model="queryParams.workshopId"
          placeholder="请选择所属车间"
          clearable
          class="!w-220px"
        >
          <el-option
            v-for="item in workshopList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="设备状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择设备状态"
          clearable
          class="!w-220px"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.MES_DV_MACHINERY_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
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
      <el-button @click="goBatteryCenter">
        <Icon icon="ep:cellphone" class="mr-4px" />
        电池资产
      </el-button>
      <el-button :loading="exportLoading" @click="handleExport">
        <Icon icon="ep:download" class="mr-4px" />
        导出
      </el-button>
    </div>

    <el-table v-loading="loading" :data="assetRows" stripe>
      <el-table-column label="资产编号 / SN" min-width="220">
        <template #default="{ row }">
          <div class="font-600">{{ row.code || '-' }}</div>
          <div class="text-secondary">SN：{{ row.assetProfile.serialNumber || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="资产类型" min-width="150">
        <template #default="{ row }">
          <div>{{ row.assetProfile.assetCategory }}</div>
          <div class="text-secondary">{{ row.machineryTypeName || '未配置机型' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="所属站点 / 责任人" min-width="180">
        <template #default="{ row }">
          <div>{{ row.assetProfile.siteName || '-' }}</div>
          <div class="text-secondary">{{ row.assetProfile.ownerName || '待补录' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="当前状态" min-width="240">
        <template #default="{ row }">
          <dict-tag :type="DICT_TYPE.MES_DV_MACHINERY_STATUS" :value="row.status" />
          <div class="mt-6px">{{ row.assetProfile.currentStage }}</div>
          <div class="text-secondary">{{ row.assetProfile.statusReason }}</div>
          <div class="text-secondary">依据：{{ row.assetProfile.statusSource }}</div>
        </template>
      </el-table-column>
      <el-table-column label="资料解析摘要" min-width="220">
        <template #default="{ row }">
          <div>{{ row.assetProfile.parseSummary }}</div>
          <div class="text-secondary">{{ row.assetProfile.parseSource }}</div>
          <div class="text-secondary">更新时间：{{ row.assetProfile.parseUpdatedAt }}</div>
        </template>
      </el-table-column>
      <el-table-column label="在途事项" min-width="220">
        <template #default="{ row }">
          <div>{{ row.assetProfile.workorderSummary }}</div>
          <div class="text-secondary">
            关联电池：{{ row.assetProfile.linkedBatteries.length || 0 }} 组
          </div>
          <div
            v-if="row.assetProfile.missingItems.length"
            class="text-warning mt-4px"
          >
            缺失：{{ row.assetProfile.missingItems.join('；') }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="最近维保" min-width="180">
        <template #default="{ row }">
          <div>保养：{{ formatDateSafe(row.lastMaintenTime) }}</div>
          <div class="text-secondary">点检：{{ formatDateSafe(row.lastCheckTime) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row.id)">设备详情</el-button>
          <el-button link type="primary" @click="handleHistory(row.id)">设备履历</el-button>
          <el-button link type="primary" @click="handleWorkorders(row.id)">关联工单</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <MachineryForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import { MdWorkshopApi, MdWorkshopVO } from '@/api/mes/md/workstation/workshop'
import { resolveAssetDeviceProfile } from '@/api/yian/asset'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { formatDate } from '@/utils/formatTime'
import download from '@/utils/download'
import MachineryForm from '@/views/mes/dv/machinery/MachineryForm.vue'

defineOptions({ name: 'AssetDevice' })

type AssetDeviceRow = DvMachineryVO & {
  assetProfile: ReturnType<typeof resolveAssetDeviceProfile>
}

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const exportLoading = ref(false)
const deviceList = ref<DvMachineryVO[]>([])
const workshopList = ref<MdWorkshopVO[]>([])
const total = ref(0)
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  code: undefined as string | undefined,
  name: undefined as string | undefined,
  workshopId: undefined as number | undefined,
  status: undefined as number | undefined
})

const assetRows = computed<AssetDeviceRow[]>(() =>
  deviceList.value.map((item) => ({
    ...item,
    assetProfile: resolveAssetDeviceProfile(item)
  }))
)

const summaryCards = computed(() => {
  const rows = assetRows.value
  return [
    {
      label: '当前页设备数',
      value: `${rows.length}`,
      desc: total.value ? `总计 ${total.value} 台设备` : '按原型先打通资产闭环'
    },
    {
      label: '待放行 / 待观察',
      value: `${rows.filter((item) => item.assetProfile.currentStage !== '主档在册').length}`,
      desc: '含待放行、待检观察等规则状态'
    },
    {
      label: '资料待补充',
      value: `${rows.filter((item) => item.assetProfile.missingItems.length > 0).length}`,
      desc: '附件缺失会在详情和附件页继续提示'
    },
    {
      label: '预警电池绑定',
      value: `${rows.filter((item) => item.assetProfile.linkedBatteries.length > 0).length}`,
      desc: '支持联动电池资产查看 SOH 与检测来源'
    }
  ]
})

const getList = async () => {
  loading.value = true
  try {
    const data = await DvMachineryApi.getMachineryPage(queryParams)
    deviceList.value = data.list
    total.value = data.total
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
  handleQuery()
}

const handleCreate = () => {
  formRef.value?.open('create')
}

const handleImport = () => {
  router.push('/asset/import')
}

const goBatteryCenter = () => {
  router.push('/asset/battery')
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await DvMachineryApi.exportMachinery(queryParams)
    download.excel(data, '设备台账.xls')
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

const handleWorkorders = (id: number) => {
  router.push({
    path: `/asset/device/detail/${id}`,
    query: { tab: 'workorders' }
  })
}

const formatDateSafe = (value?: string | number | Date) => {
  return value ? formatDate(value as Date) : '-'
}

onMounted(async () => {
  await Promise.all([
    getList(),
    MdWorkshopApi.getWorkshopSimpleList().then((data) => {
      workshopList.value = data
    })
  ])
})
</script>

<style lang="scss" scoped>
.summary-card {
  min-height: 120px;
}

.summary-card__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-card__value {
  margin-top: 12px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.summary-card__desc {
  margin-top: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.text-secondary {
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.text-warning {
  color: var(--el-color-warning);
}
</style>
