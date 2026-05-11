<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备台账"
      :content="device?.code ? `设备详情 - ${device.code}` : '设备详情'"
    >
      <template #extra>
        <el-space wrap>
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
            关联工单
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
            <dict-tag :type="DICT_TYPE.MES_DV_MACHINERY_STATUS" :value="device.status" />
            <div class="summary-block__headline mt-10px">{{ profile.currentStage }}</div>
            <div class="summary-block__text">{{ profile.statusReason }}</div>
            <div class="summary-block__hint">依据：{{ profile.statusSource }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">资料解析摘要</div>
            <div class="summary-block__headline">{{ profile.parseSummary }}</div>
            <div class="summary-block__text">{{ profile.parseSource }}</div>
            <div class="summary-block__hint">更新时间：{{ profile.parseUpdatedAt }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">关联电池</div>
            <div class="summary-block__headline">{{ linkedBatteries.length }} 组</div>
            <div class="summary-block__text">
              {{ batterySummary || '当前未绑定电池资产' }}
            </div>
            <div class="summary-block__hint">来源：BMS / 检测工装 / 人工导入附件</div>
          </el-card>
        </el-col>
      </el-row>

      <el-descriptions :column="3" border class="mt-20px">
        <el-descriptions-item label="设备编码">{{ device.code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ device.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="序列号">
          {{ profile.serialNumber || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="设备状态">
          <dict-tag :type="DICT_TYPE.MES_DV_MACHINERY_STATUS" :value="device.status" />
        </el-descriptions-item>
        <el-descriptions-item label="设备类型">
          {{ profile.assetCategory }}
        </el-descriptions-item>
        <el-descriptions-item label="品牌">
          {{ device.brand || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="规格型号">
          {{ device.specification || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="所属站点">
          {{ profile.siteName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="所属车间">
          {{ device.workshopName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="责任人">
          {{ profile.ownerName || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="最近保养">
          {{ formatDateSafe(device.lastMaintenTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="最近点检">
          {{ formatDateSafe(device.lastCheckTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateSafe(device.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ device.remark || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">主档解析结果</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item
                v-for="field in profile.parsedFields"
                :key="field.label"
                :label="field.label"
              >
                {{ field.value }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">缺失与预警</div>
            </template>
            <el-empty
              v-if="!profile.warnings.length && !profile.missingItems.length"
              description="当前没有额外预警"
            />
            <template v-else>
              <el-alert
                v-for="(warning, index) in profile.warnings"
                :key="`warning-${index}`"
                :title="warning"
                type="warning"
                :closable="false"
                show-icon
                class="mb-12px"
              />
              <el-alert
                v-for="(item, index) in profile.missingItems"
                :key="`missing-${index}`"
                :title="item"
                type="error"
                :closable="false"
                show-icon
                class="mb-12px"
              />
            </template>
          </el-card>
        </el-col>
      </el-row>

      <el-tabs v-model="activeTab" class="mt-20px" @tab-change="handleTabChange">
        <el-tab-pane label="关联工单" name="workorders" lazy>
          <MachineryRepairList :machinery-id="device.id" />
        </el-tab-pane>
        <el-tab-pane label="保养记录" name="mainten" lazy>
          <MachineryMaintenRecordList :machinery-id="device.id" />
        </el-tab-pane>
        <el-tab-pane label="点检记录" name="check" lazy>
          <MachineryCheckRecordList :machinery-id="device.id" />
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import { listLinkedBatteries, resolveAssetDeviceProfile } from '@/api/yian/asset'
import { DICT_TYPE } from '@/utils/dict'
import { formatDate } from '@/utils/formatTime'
import MachineryRepairList from '@/views/mes/dv/machinery/MachineryRepairList.vue'
import MachineryMaintenRecordList from '@/views/mes/dv/machinery/MachineryMaintenRecordList.vue'
import MachineryCheckRecordList from '@/views/mes/dv/machinery/MachineryCheckRecordList.vue'

defineOptions({ name: 'AssetDeviceDetail' })

type MachineryDetail = DvMachineryVO & {
  createTime?: string | number | Date
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const device = ref<MachineryDetail | null>(null)
const activeTab = ref('workorders')

const profile = computed(() => resolveAssetDeviceProfile(device.value))
const linkedBatteries = computed(() => listLinkedBatteries(device.value?.code))
const batterySummary = computed(() =>
  linkedBatteries.value.map((item) => `${item.batteryCode}(${item.healthLabel})`).join('；')
)

const syncTabFromRoute = () => {
  const tab = route.query.tab
  activeTab.value =
    typeof tab === 'string' && ['workorders', 'mainten', 'check'].includes(tab)
      ? tab
      : 'workorders'
}

const getDeviceId = () => Number(route.params.id)

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    device.value = await DvMachineryApi.getMachinery(id)
  } finally {
    loading.value = false
  }
}

const formatDateSafe = (value?: string | number | Date) => {
  return value ? formatDate(value as Date) : '-'
}

const handleTabChange = (tabName: string | number) => {
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: String(tabName)
    }
  })
}

const goBack = () => {
  router.push('/asset/device')
}

const goDocs = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/docs`)
}

const goHistory = () => {
  router.push(`/asset/device/detail/${getDeviceId()}/history`)
}

const goWorkorders = () => {
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: 'workorders'
    }
  })
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRoute()
  },
  { immediate: true }
)

watch(
  () => route.params.id,
  () => {
    getDetail()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.summary-block {
  min-height: 180px;
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

.summary-block__hint {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.card-header {
  font-weight: 600;
}
</style>
