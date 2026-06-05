<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备详情"
      :content="device?.code ? `设备履历 - ${device.code}` : '设备履历'"
    />

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="device">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">当前状态</div>
            <div class="summary-block__headline">{{ record.currentStatusLabel }}</div>
            <div class="summary-block__text">{{ record.statusReason }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">建档附件解析</div>
            <div class="summary-block__headline">{{ record.parseSummary }}</div>
            <div class="summary-block__text">{{ record.parseUpdatedAt }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">最近巡检</div>
            <div class="summary-block__headline">{{ record.latestInspectionAt || '暂无记录' }}</div>
            <div class="summary-block__text">{{ record.latestInspectionConclusion }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">电子履历时间线</div>
        </template>
        <el-empty v-if="!record.history.length" description="当前没有设备履历记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="event in record.history"
            :key="event.id"
            :timestamp="event.happenedAt"
            :type="timelineTypeMap[event.tone]"
            placement="top"
          >
            <el-card shadow="hover">
              <div class="timeline-title">{{ event.title }}</div>
              <div class="timeline-stage">{{ event.stage }}</div>
              <div class="timeline-detail">{{ event.detail }}</div>
              <div class="timeline-evidence">{{ event.evidence }}</div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  refreshAssetDeviceRuleRecord,
  resolveAssetDeviceMasterRecord,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'

defineOptions({ name: 'AssetDeviceHistory' })

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const device = ref<DvMachineryVO | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))

const timelineTypeMap = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'primary'
} as const

const getDeviceId = () => Number(route.params.id)

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
    record.value = await refreshAssetDeviceRuleRecord(machinery)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/device/detail/${getDeviceId()}`)
}

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
  min-height: 160px;
}

.summary-block__title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-block__headline {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.5;
}

.summary-block__text {
  margin-top: 8px;
  line-height: 1.7;
}

.card-header {
  font-weight: 600;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
}

.timeline-stage {
  margin-top: 6px;
  color: var(--el-color-primary);
}

.timeline-detail {
  margin-top: 8px;
  line-height: 1.7;
}

.timeline-evidence {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
}
</style>
