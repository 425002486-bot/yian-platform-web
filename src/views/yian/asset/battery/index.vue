<template>
  <ContentWrap>
    <el-alert
      title="电池资产使用真实后台台账；健康分、巡检记录和日志纠偏提示按资产中心口径统一展示。"
      type="info"
      :closable="false"
      show-icon
      class="mb-16px"
    />

    <el-row :gutter="16" class="mb-16px">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">电池总数</span>
            <strong class="stat-value">{{ batteryList.length }}</strong>
            <span class="stat-desc">统一查看独立电池主档</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">待巡检</span>
            <strong class="stat-value text-[#d97706]">{{ pendingInspectionCount }}</strong>
            <span class="stat-desc">按健康分与巡检时效共同提示</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">健康分异常</span>
            <strong class="stat-value text-[#dc2626]">{{ abnormalScoreCount }}</strong>
            <span class="stat-desc">含观察中与停飞禁用电池</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">纠偏提示</span>
            <strong class="stat-value text-[#2563eb]">{{ correctionHintCount }}</strong>
            <span class="stat-desc">仅提示差异，主档需人工编辑</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-form :model="query" :inline="true" class="mb-16px">
      <el-form-item label="搜索">
        <el-input
          v-model="query.keyword"
          placeholder="电池编号 / SN / 型号"
          clearable
          class="!w-260px"
        />
      </el-form-item>
      <el-form-item label="健康状态">
        <el-select v-model="query.healthStatus" placeholder="全部" clearable class="!w-160px">
          <el-option label="状态正常" value="normal" />
          <el-option label="寿命预警" value="warning" />
          <el-option label="停飞禁用" value="danger" />
        </el-select>
      </el-form-item>
      <el-form-item label="站点">
        <el-select v-model="query.workshopId" placeholder="全部" clearable class="!w-180px">
          <el-option
            v-for="site in siteOptions"
            :key="site.id"
            :label="site.name"
            :value="site.id"
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

    <el-table v-loading="loading" :data="filteredBatteryList" stripe :show-overflow-tooltip="true">
      <el-table-column label="电池编号 / SN" min-width="190">
        <template #default="{ row }">
          <div class="cell-stack">
            <span class="font-600">{{ row.batteryCode }}</span>
            <span class="text-12px text-[#909399]">SN：{{ row.serialNumber || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="型号" min-width="120">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.model || '-' }}</span>
            <span class="text-12px text-[#909399]">归属：{{ row.workshopName || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="备案归属 / 当前挂载" min-width="250">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>备案：{{ row.assetProfile.standardDeviceCode || '-' }}</span>
            <span class="text-12px text-[#909399]">
              当前：
              <el-button
                v-if="row.linkedDeviceId"
                link
                type="primary"
                class="!p-0"
                @click="viewLinkedDevice(row.linkedDeviceId)"
              >
                {{ row.linkedDeviceCode }}
              </el-button>
              <template v-else>-</template>
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="健康分" min-width="150">
        <template #default="{ row }">
          <div class="cell-stack">
            <span class="health-score" :class="`health-score--${row.assetProfile.healthScoreTone}`">
              {{ row.assetProfile.healthScoreLabel }}
            </span>
            <span class="text-12px text-[#909399]">SOH {{ row.soh ?? '-' }}%</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="资产状态" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <el-tag :type="getBatteryTagType(row.healthStatus)" effect="light">
              {{ row.assetProfile.inspectionStatus }}
            </el-tag>
            <span class="text-12px text-[#909399]">{{ row.assetProfile.inspectionDueText }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="最近巡检 / 日志" min-width="210">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.lastCheckAt || '-' }}</span>
            <span class="text-12px text-[#909399]">{{ row.checkSource || '待补录来源' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">电池详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import { resolveAssetBatteryProfile, type AssetBatteryProfileVO } from '@/api/yian/asset'

defineOptions({ name: 'AssetBattery' })

type BatteryRow = AssetBatteryVO & {
  assetProfile: AssetBatteryProfileVO
}

const router = useRouter()

const loading = ref(false)
const batteryList = ref<AssetBatteryVO[]>([])
const query = reactive({
  keyword: '',
  healthStatus: undefined as AssetBatteryVO['healthStatus'] | undefined,
  workshopId: undefined as number | undefined
})

const batteryRows = computed<BatteryRow[]>(() =>
  batteryList.value.map((item) => ({
    ...item,
    assetProfile: resolveAssetBatteryProfile(item)
  }))
)

const filteredBatteryList = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return batteryRows.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.batteryCode.toLowerCase().includes(keyword) ||
      (item.serialNumber || '').toLowerCase().includes(keyword) ||
      (item.model || '').toLowerCase().includes(keyword)
    const matchesHealth = !query.healthStatus || item.healthStatus === query.healthStatus
    const matchesWorkshop = !query.workshopId || item.workshopId === query.workshopId
    return matchesKeyword && matchesHealth && matchesWorkshop
  })
})

const siteOptions = computed(() =>
  [...new Map(batteryList.value.map((item) => [item.workshopId, item.workshopName])).entries()].map(
    ([id, name]) => ({
      id,
      name
    })
  )
)

const pendingInspectionCount = computed(
  () =>
    batteryRows.value.filter((item) =>
      ['待巡检', '观察中', '停飞禁用'].includes(item.assetProfile.inspectionStatus)
    ).length
)
const abnormalScoreCount = computed(
  () => batteryRows.value.filter((item) => item.assetProfile.healthScoreTone !== 'success').length
)
const correctionHintCount = computed(
  () => batteryRows.value.filter((item) => item.assetProfile.correctionHints.length > 0).length
)

const getList = async () => {
  loading.value = true
  try {
    batteryList.value = await YianAssetApi.getBatteryList()
  } finally {
    loading.value = false
  }
}

const getBatteryTagType = (status: AssetBatteryVO['healthStatus']) => {
  if (status === 'danger') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

const handleQuery = () => {
  // MVP 阶段保持前端筛选，避免频繁切换页面时丢失筛选条件
}

const resetQuery = () => {
  query.keyword = ''
  query.healthStatus = undefined
  query.workshopId = undefined
}

const openDetail = (id: number) => {
  router.push(`/asset/battery/detail/${id}`)
}

const viewLinkedDevice = (deviceId: number) => {
  router.push(`/asset/device/detail/${deviceId}`)
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.stat-card {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  color: #909399;
  font-size: 13px;
}

.stat-value {
  font-size: 28px;
  line-height: 1;
}

.stat-desc {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.health-score {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.health-score--success {
  color: #15803d;
}

.health-score--warning {
  color: #d97706;
}

.health-score--danger {
  color: #dc2626;
}

.health-score--info {
  color: #2563eb;
}
</style>
