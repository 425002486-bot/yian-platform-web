<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回电池台账"
      :content="battery?.batteryCode ? `电池详情 - ${battery.batteryCode}` : '电池详情'"
    >
      <template #extra>
        <el-space wrap>
          <el-button @click="handleEditMaster">
            <Icon icon="ep:edit-pen" class="mr-4px" />
            编辑主档
          </el-button>
          <el-button @click="goDocs">
            <Icon icon="ep:document" class="mr-4px" />
            建档附件
          </el-button>
          <el-button @click="goStartInspection">
            <Icon icon="ep:checked" class="mr-4px" />
            发起巡检
          </el-button>
          <el-button @click="goInspectionRecords">
            <Icon icon="ep:document" class="mr-4px" />
            巡检记录
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="battery && profile">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="7">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__header">
              <span class="summary-block__title">当前状态</span>
              <el-tag :type="getHealthTagType(battery.healthStatus)" effect="light">
                {{ battery.healthLabel || '-' }}
              </el-tag>
            </div>
            <div class="summary-block__text">{{ summaryReason }}</div>
            <div v-if="summaryWarning" class="summary-block__meta summary-block__meta--warning">
              {{ summaryWarning }}
            </div>
            <div class="summary-block__meta">
              <span class="summary-block__label">处理建议：</span>{{ recommendedAction }}
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="17">
          <el-card shadow="never" class="overview-card">
            <template #header>
              <div class="card-header">主档信息</div>
            </template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="电池编号">{{ battery.batteryCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="电池 SN">{{ battery.serialNumber || '-' }}</el-descriptions-item>
              <el-descriptions-item label="型号">{{ battery.model || '-' }}</el-descriptions-item>
              <el-descriptions-item label="所属站点">{{ battery.workshopName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="健康状态">{{ battery.healthLabel || '-' }}</el-descriptions-item>
              <el-descriptions-item label="SOH">{{ formatPercent(battery.soh) }}</el-descriptions-item>
              <el-descriptions-item label="循环次数">
                {{ typeof battery.cycleCount === 'number' ? `${battery.cycleCount} 次` : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="最近巡检">{{ battery.lastCheckTime || '-' }}</el-descriptions-item>
              <el-descriptions-item label="检测来源">{{ battery.checkSource || '-' }}</el-descriptions-item>
              <el-descriptions-item label="备案归属主机">
                {{ profile.standardDeviceCode || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="当前挂载主机">
                {{ profile.actualMountedDeviceCode || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="最近一次最大压差">
                {{ profile.latestDiffSummary || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="3">
                {{ battery.remark || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="section-card">
            <template #header>
              <div class="card-header">健康分说明</div>
            </template>
            <div class="prototype-stack">
              <div class="prototype-item">
                <div class="prototype-item__header">
                  <span class="prototype-item__title">总分</span>
                  <el-tag :type="getRiskTagType(profile.healthScoreTone)" effect="light">
                    {{ profile.healthScoreLabel || '-' }}
                  </el-tag>
                </div>
                <div class="prototype-item__desc">
                  SOH {{ formatPercent(battery.soh) }} / 数据置信度 {{ profile.dataConfidenceLabel || '-' }}
                </div>
              </div>

              <div v-for="item in profile.scoreBreakdown" :key="item.label" class="prototype-item">
                <div class="prototype-item__header">
                  <span class="prototype-item__title">{{ item.label }}</span>
                  <el-tag v-if="item.tone" :type="getRiskTagType(item.tone)" effect="light">
                    关注
                  </el-tag>
                </div>
                <div class="prototype-item__desc">{{ item.value }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="section-card">
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

              <div v-if="parsedMetricItems.length" class="prototype-item">
                <div class="prototype-item__header">
                  <span class="prototype-item__title">已解析字段</span>
                </div>
                <div class="prototype-item__desc">
                  {{ parsedMetricItems.map((item) => `${item.label}：${item.value}`).join('；') }}
                </div>
              </div>

              <div v-if="profile.correctionHints.length" class="prototype-item">
                <div class="prototype-item__header">
                  <span class="prototype-item__title">相关提示</span>
                  <el-tag :type="getRiskTagType(profile.correctionHints[0].tone)" effect="light">
                    {{ profile.correctionHints.length }} 项
                  </el-tag>
                </div>
                <div class="prototype-item__desc">
                  <div
                    v-for="item in profile.correctionHints"
                    :key="item.id"
                    class="prototype-item__hint"
                  >
                    <div>{{ item.summary }}</div>
                    <div class="prototype-item__meta">{{ item.detail }}</div>
                    <div class="prototype-item__meta prototype-item__meta--action">
                      {{ item.actionHint }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!parsedMetricItems.length && !profile.correctionHints.length" class="prototype-item">
                <div class="prototype-item__header">
                  <span class="prototype-item__title">解析结果</span>
                </div>
                <div class="prototype-item__desc">当前暂无新的解析字段或比对提醒。</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else description="未找到对应电池数据" class="mt-20px" />

    <BatteryForm ref="formRef" @success="getDetail" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import {
  resolveAssetBatteryProfile,
  type AssetBatteryParsedMetrics,
  type AssetBatteryProfileVO,
  type AssetRiskTone
} from '@/api/yian/asset'
import BatteryForm from '@/views/yian/asset/battery/BatteryForm.vue'
import { useCache } from '@/hooks/web/useCache'

defineOptions({ name: 'AssetBatteryDetail' })

const router = useRouter()
const route = useRoute()
const message = useMessage()
const formRef = ref()
const { wsCache } = useCache()
const LAST_BATTERY_DETAIL_ID_KEY = 'yian_asset_last_battery_detail_id'

const loading = ref(false)
const battery = ref<AssetBatteryVO | null>(null)

const profile = computed<AssetBatteryProfileVO | null>(() =>
  battery.value ? resolveAssetBatteryProfile(battery.value) : null
)

const latestMetrics = computed<AssetBatteryParsedMetrics | null>(() => {
  const record = profile.value?.inspectionRecords.find((item) => item.parsedMetrics)
  return record?.parsedMetrics || null
})

const parsedMetricItems = computed(() => {
  const metrics = latestMetrics.value
  if (!metrics) return []
  const items: Array<{ label: string; value: string }> = []
  if (metrics.serialNumber) items.push({ label: '电池 SN', value: metrics.serialNumber })
  if (metrics.linkedDeviceCode) items.push({ label: '挂载主机', value: metrics.linkedDeviceCode })
  if (typeof metrics.soh === 'number') items.push({ label: 'SOH', value: `${metrics.soh}%` })
  if (typeof metrics.cycleCount === 'number') items.push({ label: '循环次数', value: `${metrics.cycleCount} 次` })
  if (typeof metrics.maxVoltageDiff === 'number') items.push({ label: '最大压差', value: `${metrics.maxVoltageDiff.toFixed(2)}V` })
  if (typeof metrics.maxTemperature === 'number') items.push({ label: '最高温度', value: `${metrics.maxTemperature}℃` })
  return items
})

const parsedFieldCountLabel = computed(() => `${parsedMetricItems.value.length} 项`)

const parseSummaryText = computed(() => {
  if (parsedMetricItems.value.length) {
    return `最近一次日志解析已识别 ${parsedMetricItems.value.length} 个字段，可用于与当前电池主档进行核对。`
  }
  if (profile.value?.attachments.length) {
    return `已登记 ${profile.value.attachments.length} 份建档附件，当前暂无结构化识别字段。`
  }
  return '当前暂无建档附件与解析结果。'
})

const summaryReason = computed(() => {
  if (!profile.value) return '-'
  if (profile.value.correctionHints.length) return profile.value.correctionHints[0].summary
  if (battery.value?.checkSource || battery.value?.lastCheckTime) {
    return `最近巡检时间 ${battery.value?.lastCheckTime || '-'}，来源 ${battery.value?.checkSource || '-'}。`
  }
  return '当前暂无新的风险提醒。'
})

const summaryWarning = computed(() => {
  if (!profile.value?.correctionHints.length) return ''
  return profile.value.correctionHints[0].detail
})

const recommendedAction = computed(() => {
  if (!profile.value) return '-'
  if (profile.value.correctionHints.length) return profile.value.correctionHints[0].actionHint
  if (battery.value?.recommendation) return battery.value.recommendation
  return '如需补充依据，请前往建档附件上传相关文件。'
})

const getBatteryId = () => {
  const routeId = Number(route.params.id || route.query.id || 0)
  if (routeId) {
    wsCache.set(LAST_BATTERY_DETAIL_ID_KEY, routeId)
    return routeId
  }
  return Number(wsCache.get(LAST_BATTERY_DETAIL_ID_KEY) || 0)
}

const getDetail = async () => {
  const id = getBatteryId()
  if (!id) {
    battery.value = null
    return
  }
  loading.value = true
  try {
    battery.value = await YianAssetApi.getBattery(id)
  } finally {
    loading.value = false
  }
}

const getHealthTagType = (status: AssetBatteryVO['healthStatus']) => {
  if (status === 'danger') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

const getRiskTagType = (tone?: AssetRiskTone) => {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'info') return 'info'
  return 'success'
}

const formatPercent = (value?: number) => (typeof value === 'number' ? `${value}%` : '-')

const goBack = () => {
  router.push('/asset/battery')
}

const handleEditMaster = () => {
  if (!battery.value?.id) {
    message.warning('未找到电池主档信息')
    return
  }
  formRef.value?.open('update', battery.value.id)
}

const goDocs = () => {
  const id = getBatteryId()
  if (!id) return
  router.push(`/asset/battery/detail/${id}/docs`)
}

const goDocsUpload = () => {
  const id = getBatteryId()
  if (!id) return
  router.push({
    path: `/asset/battery/detail/${id}/docs`,
    query: { action: 'upload' }
  })
}

const goInspectionRecords = () => {
  if (!battery.value?.batteryCode) return
  router.push({
    path: '/asset/inspection',
    query: {
      assetType: 'battery',
      assetCode: battery.value.batteryCode
    }
  })
}

const goStartInspection = () => {
  if (!battery.value?.id) return
  router.push({
    path: '/asset/inspection/create',
    query: {
      assetType: 'battery',
      id: String(battery.value.id)
    }
  })
}

watch(
  () => [route.params.id, route.query.id],
  () => {
    getDetail()
  },
  { immediate: true }
)
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

.section-card {
  height: 100%;
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

.prototype-item__meta {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.prototype-item__meta--action {
  color: #409eff;
}

.prototype-item__hint + .prototype-item__hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-light);
}
</style>
