<template>
  <ContentWrap>
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
          <el-option label="禁止放行" value="danger" />
        </el-select>
      </el-form-item>
      <el-form-item label="站点">
        <el-select v-model="query.workshopId" placeholder="全部" clearable class="!w-180px">
          <el-option v-for="site in siteOptions" :key="site.id" :label="site.name" :value="site.id" />
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
      <el-button v-if="canManageBattery" type="primary" @click="handleCreate">
        <Icon icon="ep:plus" class="mr-4px" />
        单个录入
      </el-button>
      <el-button v-if="canManageBattery" @click="handleImport">
        <Icon icon="ep:upload" class="mr-4px" />
        批量上传
      </el-button>
    </div>

    <el-table v-loading="loading" :data="filteredBatteryList" stripe :show-overflow-tooltip="true">
      <el-table-column label="电池编号 / SN" min-width="220">
        <template #default="{ row }">
          <div class="cell-stack">
            <span class="font-600">{{ row.batteryCode }}</span>
            <span class="text-12px text-[#909399]">SN：{{ row.serialNumber || '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="型号 / 站点" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.model || '-' }}</span>
            <span class="text-12px text-[#909399]">所属站点：{{ row.workshopName || '-' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="健康级别" min-width="180">
        <template #default="{ row }">
          <div class="cell-stack">
            <span class="battery-score" :class="getScoreClass(batteryProfiles[row.batteryCode]?.healthScore)">
              {{ batteryProfiles[row.batteryCode]?.healthScoreLabel || '-' }}
            </span>
            <span class="text-12px text-[#909399]">
              SOH {{ row.soh ?? '-' }}% / {{ row.healthLabel || '-' }}
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="循环次数" width="120">
        <template #default="{ row }">
          {{ row.cycleCount ?? '-' }}
        </template>
      </el-table-column>

      <el-table-column label="最近巡检 / 来源" min-width="220">
        <template #default="{ row }">
          <div class="cell-stack">
            <span>{{ row.lastCheckAt || row.lastCheckTime || '-' }}</span>
            <span v-if="row.checkSource" class="text-12px text-[#909399]">{{ row.checkSource }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="关联主机" min-width="220">
        <template #default="{ row }">
          <div class="cell-stack">
            <template v-if="row.linkedDeviceId && row.linkedDeviceCode">
              <span class="linked-device-link" @click="viewLinkedDevice(row.linkedDeviceId)">
                {{ row.linkedDeviceCode }}
              </span>
              <span class="text-12px text-[#909399]">{{ row.linkedDeviceName || '-' }}</span>
            </template>
            <template v-else>
              <span>-</span>
            </template>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">电池详情</el-button>
          <el-button v-if="canInspectBattery" link type="primary" @click="startInspection(row.id)">
            巡检
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>

  <BatteryForm ref="formRef" @success="getList" />
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import { resolveAssetBatteryProfile } from '@/api/yian/asset'
import BatteryForm from '@/views/yian/asset/battery/BatteryForm.vue'
import { useCache } from '@/hooks/web/useCache'
import { getCurrentYianAccess, hasYianPermission } from '@/utils/yian/access'

defineOptions({ name: 'AssetBattery' })

const router = useRouter()
const formRef = ref()
const { wsCache } = useCache()
const LAST_BATTERY_DETAIL_ID_KEY = 'yian_asset_last_battery_detail_id'

const loading = ref(false)
const hasMounted = ref(false)
const canManageBattery = ref(false)
const canInspectBattery = ref(false)
const batteryList = ref<AssetBatteryVO[]>([])
const query = reactive({
  keyword: '',
  healthStatus: undefined as AssetBatteryVO['healthStatus'] | undefined,
  workshopId: undefined as number | undefined
})

const filteredBatteryList = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return batteryList.value
    .filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.batteryCode.toLowerCase().includes(keyword) ||
        (item.serialNumber || '').toLowerCase().includes(keyword) ||
        (item.model || '').toLowerCase().includes(keyword)
      const matchesHealth = !query.healthStatus || item.healthStatus === query.healthStatus
      const matchesWorkshop = !query.workshopId || item.workshopId === query.workshopId
      return matchesKeyword && matchesHealth && matchesWorkshop
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createTime || '').getTime()
      const rightTime = new Date(right.createTime || '').getTime()
      if (leftTime || rightTime) {
        return rightTime - leftTime
      }
      return Number(right.id || 0) - Number(left.id || 0)
    })
})

const batteryProfiles = computed(() =>
  Object.fromEntries(
    batteryList.value.map((item) => [item.batteryCode, resolveAssetBatteryProfile(item)])
  )
)

const siteOptions = computed(() =>
  [...new Map(batteryList.value.map((item) => [item.workshopId, item.workshopName])).entries()].map(
    ([id, name]) => ({
      id,
      name
    })
  )
)

const getList = async () => {
  loading.value = true
  try {
    batteryList.value = await YianAssetApi.getBatteryList()
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  // MVP 阶段保持前端筛选
}

const resetQuery = () => {
  query.keyword = ''
  query.healthStatus = undefined
  query.workshopId = undefined
}

const handleCreate = () => {
  formRef.value?.open('create')
}

const handleImport = () => {
  router.push({
    path: '/asset/import',
    query: { assetType: 'battery' }
  })
}

const openDetail = (id: number) => {
  wsCache.set(LAST_BATTERY_DETAIL_ID_KEY, id)
  router.push(`/asset/battery/detail/${id}`)
}

const startInspection = (id: number) => {
  router.push({
    path: '/asset/inspection/create',
    query: {
      assetType: 'battery',
      id
    }
  })
}

const viewLinkedDevice = (deviceId: number) => {
  router.push(`/asset/device/detail/${deviceId}`)
}

const getScoreClass = (score?: number) => {
  if (typeof score !== 'number') return 'battery-score--neutral'
  if (score >= 90) return 'battery-score--good'
  if (score >= 70) return 'battery-score--watch'
  return 'battery-score--risk'
}

onMounted(async () => {
  const access = await getCurrentYianAccess()
  canManageBattery.value = hasYianPermission(access, 'asset', 'exec')
  canInspectBattery.value = hasYianPermission(access, 'inspect', 'exec')
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

<style scoped>
.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.linked-device-link {
  color: var(--el-color-primary);
  cursor: pointer;
  line-height: 1.6;
}

.linked-device-link:hover {
  color: var(--el-color-primary-light-3);
}

.battery-score {
  font-size: 16px;
  line-height: 1.6;
  font-weight: 600;
}

.battery-score--good {
  color: #15803d;
}

.battery-score--watch {
  color: #d97706;
}

.battery-score--risk {
  color: #dc2626;
}

.battery-score--neutral {
  color: #606266;
}
</style>
