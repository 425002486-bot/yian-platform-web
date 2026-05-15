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
          <el-button type="primary" @click="handleCreateInspection">
            <Icon icon="ep:checked" class="mr-4px" />
            发起巡检
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="10" animated class="mt-20px" />

    <template v-else-if="battery">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="12" :lg="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-card__label">健康分</div>
            <div
              class="summary-card__value"
              :class="`summary-card__value--${profile.healthScoreTone}`"
            >
              {{ profile.healthScoreLabel }}
            </div>
            <div class="summary-card__desc"
              >SOH {{ battery.soh ?? '-' }}% / {{ battery.healthLabel }}</div
            >
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12" :lg="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-card__label">备案归属</div>
            <div class="summary-card__headline">{{ profile.standardDeviceCode || '-' }}</div>
            <div class="summary-card__desc"
              >当前挂载：{{ profile.actualMountedDeviceCode || '-' }}</div
            >
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12" :lg="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-card__label">巡检状态</div>
            <div class="summary-card__headline">{{ profile.inspectionStatus }}</div>
            <div class="summary-card__desc">{{ profile.inspectionDueText }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="12" :lg="6">
          <el-card shadow="hover" class="summary-card">
            <div class="summary-card__label">纠偏提示</div>
            <div class="summary-card__headline">{{ profile.correctionHints.length }} 条</div>
            <div class="summary-card__desc">系统只提示差异，不直接修改主档</div>
          </el-card>
        </el-col>
      </el-row>

      <el-descriptions :column="3" border class="mt-20px">
        <el-descriptions-item label="电池编号">{{ battery.batteryCode }}</el-descriptions-item>
        <el-descriptions-item label="序列号">{{
          battery.serialNumber || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ battery.model || '-' }}</el-descriptions-item>
        <el-descriptions-item label="所属站点">{{
          battery.workshopName || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="当前负责人">{{
          profile.currentOwnerName
        }}</el-descriptions-item>
        <el-descriptions-item label="循环次数">{{
          battery.cycleCount ?? '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="最近巡检">{{
          battery.lastCheckAt || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="巡检来源">{{
          battery.checkSource || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="资产状态">{{ profile.inspectionStatus }}</el-descriptions-item>
        <el-descriptions-item label="建议动作" :span="3">
          {{ battery.recommendation || '待补录' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="full-height">
            <template #header>
              <div class="card-header">健康分口径</div>
            </template>
            <div class="score-explain">
              <div
                v-for="item in profile.scoreBreakdown"
                :key="item.label"
                class="score-explain__item"
              >
                <div class="score-explain__label">{{ item.label }}</div>
                <div
                  class="score-explain__value"
                  :class="item.tone ? `score-explain__value--${item.tone}` : ''"
                >
                  {{ item.value }}
                </div>
              </div>
            </div>
            <el-alert
              title="健康分统一作为前台展示口径，SOH 仅作为来源指标之一。"
              type="info"
              :closable="false"
              show-icon
              class="mt-16px"
            />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="full-height">
            <template #header>
              <div class="card-header">日志纠偏提示</div>
            </template>
            <el-empty
              v-if="!profile.correctionHints.length"
              description="当前没有新的日志纠偏提示"
            />
            <template v-else>
              <el-alert
                v-for="item in profile.correctionHints"
                :key="item.id"
                :title="item.summary"
                :type="item.tone === 'danger' ? 'error' : item.tone"
                :description="`${item.detail} ${item.actionHint}`"
                :closable="false"
                show-icon
                class="mb-12px"
              />
            </template>
            <el-alert
              title="如日志与主档不一致，请人工进入主档编辑页维护备案归属、标配关系或挂载信息。"
              type="warning"
              :closable="false"
              show-icon
            />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="full-height">
            <template #header>
              <div class="card-header">附件与日志</div>
            </template>
            <el-empty v-if="!profile.attachments.length" description="当前没有附件或日志" />
            <el-table v-else :data="profile.attachments" stripe>
              <el-table-column label="文件名称" prop="fileName" min-width="200" />
              <el-table-column label="类型" prop="category" width="120" />
              <el-table-column label="摘要" prop="summary" min-width="220" />
              <el-table-column label="上传时间" prop="uploadedAt" width="180" />
              <el-table-column label="上传人" prop="uploadedBy" width="120" />
            </el-table>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-card shadow="never" class="full-height">
            <template #header>
              <div class="card-header">补充说明</div>
            </template>
            <el-empty v-if="!profile.remarks.length" description="当前没有补充说明" />
            <div v-else class="remark-list">
              <div v-for="(item, index) in profile.remarks" :key="index" class="remark-list__item">
                {{ item }}
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">巡检记录</div>
        </template>
        <el-empty v-if="!profile.inspectionRecords.length" description="当前没有巡检记录" />
        <el-table v-else :data="profile.inspectionRecords" stripe>
          <el-table-column label="巡检时间" prop="inspectedAt" width="180" />
          <el-table-column label="巡检人" prop="inspector" width="140" />
          <el-table-column label="来源" prop="source" width="120" />
          <el-table-column label="结论" prop="conclusion" width="140" />
          <el-table-column label="摘要" prop="summary" min-width="240" />
          <el-table-column label="依据附件" prop="evidence" min-width="200" />
        </el-table>
      </el-card>

      <el-card v-if="battery.linkedDeviceId" shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">关联主机</div>
        </template>
        <div class="linked-device">
          <div>
            <div class="linked-device__code">{{ battery.linkedDeviceCode || '-' }}</div>
            <div class="linked-device__name">{{ battery.linkedDeviceName || '-' }}</div>
          </div>
          <el-button type="primary" link @click="viewLinkedDevice"> 查看主机详情 </el-button>
        </div>
      </el-card>
    </template>

    <el-empty v-else description="未找到对应电池数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import { resolveAssetBatteryProfile } from '@/api/yian/asset'

defineOptions({ name: 'AssetBatteryDetail' })

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const battery = ref<AssetBatteryVO | null>(null)

const profile = computed(() => resolveAssetBatteryProfile(battery.value))

const getBatteryId = () => String(route.params.id || '')

const getDetail = async () => {
  const id = getBatteryId()
  if (!id) {
    battery.value = null
    return
  }
  loading.value = true
  try {
    const list = await YianAssetApi.getBatteryList()
    battery.value = list.find((item) => String(item.id) === id) || null
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/asset/battery')
}

const handleEditMaster = () => {
  message.info('MVP 当前先保留主档编辑入口，日志纠偏确认后请人工维护主档关系。')
}

const handleCreateInspection = () => {
  message.success('已为该电池创建巡检待办，请在工单中心继续编排执行。')
}

const viewLinkedDevice = () => {
  if (!battery.value?.linkedDeviceId) return
  router.push(`/asset/device/detail/${battery.value.linkedDeviceId}`)
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
.summary-card {
  min-height: 170px;
}

.summary-card__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-card__value,
.summary-card__headline {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
}

.summary-card__value--success {
  color: #15803d;
}

.summary-card__value--warning {
  color: #d97706;
}

.summary-card__value--danger {
  color: #dc2626;
}

.summary-card__value--info {
  color: #2563eb;
}

.summary-card__desc {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.card-header {
  font-weight: 600;
}

.full-height {
  height: 100%;
}

.score-explain {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.score-explain__item {
  border-radius: 10px;
  background: #f8fafc;
  padding: 14px;
}

.score-explain__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.score-explain__value {
  margin-top: 8px;
  line-height: 1.8;
}

.score-explain__value--warning {
  color: #d97706;
}

.score-explain__value--danger {
  color: #dc2626;
}

.remark-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.remark-list__item {
  border-left: 3px solid var(--el-color-primary);
  background: #f8fafc;
  padding: 12px 14px;
  line-height: 1.7;
}

.linked-device {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.linked-device__code {
  font-size: 18px;
  font-weight: 700;
}

.linked-device__name {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
}
</style>
