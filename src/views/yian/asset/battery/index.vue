<template>
  <ContentWrap>
    <el-alert
      title="电池资产使用真实后台列表；统一资产导入后，电池会自动分流到这里，主机继续进入设备台账。"
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
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">预警电池</span>
            <strong class="stat-value text-[#d97706]">{{ warningCount }}</strong>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">禁止放行</span>
            <strong class="stat-value text-[#dc2626]">{{ dangerCount }}</strong>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never">
          <div class="stat-card">
            <span class="stat-label">检测来源</span>
            <strong class="stat-value">{{ sourceSummary }}</strong>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-form :inline="true" class="mb-16px">
      <el-form-item label="搜索">
        <el-input v-model="query.keyword" placeholder="电池编码 / SN" clearable class="!w-220px" />
      </el-form-item>
      <el-form-item label="健康状态">
        <el-select v-model="query.healthStatus" placeholder="全部" clearable class="!w-140px">
          <el-option label="状态正常" value="normal" />
          <el-option label="寿命预警" value="warning" />
          <el-option label="禁止放行" value="danger" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属站点">
        <el-select v-model="query.workshopName" placeholder="全部" clearable class="!w-180px">
          <el-option
            v-for="site in siteOptions"
            :key="site"
            :label="site"
            :value="site"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="filteredBatteryList" stripe :show-overflow-tooltip="true">
      <el-table-column label="电池编号 / SN" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <span class="font-600">{{ row.batteryCode }}</span>
            <span class="text-12px text-[#909399]">SN：{{ row.serialNumber }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="适配型号" prop="model" width="120" />
      <el-table-column label="所属站点" prop="workshopName" width="180" />
      <el-table-column label="关联主机" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.linkedDeviceCode || '-' }}</span>
            <span class="text-12px text-[#909399]">{{ row.linkedDeviceName || '未绑定主机' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="SOH" width="110">
        <template #default="{ row }">
          <el-tag :type="getBatteryTagType(row.healthStatus)">{{ row.soh }}%</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="循环次数" prop="cycleCount" width="100" />
      <el-table-column label="最近检测" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.lastCheckAt || '-' }}</span>
            <span class="text-12px text-[#909399]">{{ row.checkSource || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="健康状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getBatteryTagType(row.healthStatus)" effect="light">
            {{ row.healthLabel }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="建议动作" min-width="220" prop="recommendation" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="row.linkedDeviceId"
            link
            type="primary"
            @click="viewLinkedDevice(row.linkedDeviceId)"
          >
            关联主机
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailVisible" title="电池资产详情" size="560px">
      <template v-if="currentBattery">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="电池编号">{{ currentBattery.batteryCode }}</el-descriptions-item>
          <el-descriptions-item label="序列号">{{ currentBattery.serialNumber }}</el-descriptions-item>
          <el-descriptions-item label="适配型号">{{ currentBattery.model }}</el-descriptions-item>
          <el-descriptions-item label="所属站点">{{ currentBattery.workshopName }}</el-descriptions-item>
          <el-descriptions-item label="关联主机">
            {{ currentBattery.linkedDeviceCode || '-' }}
            {{ currentBattery.linkedDeviceName || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="SOH">{{ currentBattery.soh }}%</el-descriptions-item>
          <el-descriptions-item label="循环次数">{{ currentBattery.cycleCount }}</el-descriptions-item>
          <el-descriptions-item label="最近检测">{{ currentBattery.lastCheckAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="检测来源">{{ currentBattery.checkSource || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源依据">{{ currentBattery.sourceEvidence || '-' }}</el-descriptions-item>
          <el-descriptions-item label="建议动作">{{ currentBattery.recommendation || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'

defineOptions({ name: 'AssetBattery' })

const router = useRouter()

const loading = ref(false)
const batteryList = ref<AssetBatteryVO[]>([])
const detailVisible = ref(false)
const currentBattery = ref<AssetBatteryVO>()
const query = reactive({
  keyword: '',
  healthStatus: undefined as AssetBatteryVO['healthStatus'] | undefined,
  workshopName: undefined as string | undefined
})

const siteOptions = computed(() => [...new Set(batteryList.value.map((item) => item.workshopName))])
const filteredBatteryList = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return batteryList.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.batteryCode.toLowerCase().includes(keyword) ||
      item.serialNumber.toLowerCase().includes(keyword)
    const matchesHealth = !query.healthStatus || item.healthStatus === query.healthStatus
    const matchesWorkshop = !query.workshopName || item.workshopName === query.workshopName
    return matchesKeyword && matchesHealth && matchesWorkshop
  })
})
const warningCount = computed(
  () => batteryList.value.filter((item) => item.healthStatus === 'warning').length
)
const dangerCount = computed(
  () => batteryList.value.filter((item) => item.healthStatus === 'danger').length
)
const sourceSummary = computed(() => {
  const sources = [...new Set(batteryList.value.map((item) => item.checkSource).filter(Boolean))]
  return sources.length ? sources.join(' / ') : '-'
})

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

const resetQuery = () => {
  query.keyword = ''
  query.healthStatus = undefined
  query.workshopName = undefined
}

const openDetail = (row: AssetBatteryVO) => {
  currentBattery.value = row
  detailVisible.value = true
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
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  color: #909399;
  font-size: 13px;
}

.stat-value {
  font-size: 26px;
  line-height: 1;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
