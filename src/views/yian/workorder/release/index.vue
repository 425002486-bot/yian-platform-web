<template>
  <ContentWrap>
    <div class="yian-prototype-page yian-workorder-release-page">
    <el-page-header @back="router.push('/workorder/list')" title="返回工单列表" content="放行审核" />

    <el-form :inline="true" class="mt-20px mb-16px">
      <el-form-item label="放行状态">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="!w-160px">
          <el-option
            v-for="item in WORKORDER_RELEASE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="风险等级">
        <el-select v-model="queryParams.riskLevel" placeholder="全部风险" clearable class="!w-160px">
          <el-option
            v-for="item in WORKORDER_RISK_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="搜索">
        <el-input
          v-model="queryParams.keyword"
          placeholder="审核单号 / 工单号 / 设备编号"
          clearable
          class="!w-260px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="releaseList" stripe>
      <el-table-column label="工单编号" min-width="180">
        <template #default="{ row }">
          <div class="font-600">{{ row.orderNo }}</div>
          <div class="text-secondary">{{ row.deviceCode }} / {{ row.siteName }}</div>
        </template>
      </el-table-column>
      <el-table-column label="当前状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.tagType">{{ row.statusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="风险等级" width="120">
        <template #default="{ row }">
          <el-tag :type="riskTagType(row.riskLevel)">{{ row.riskLevelLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="复检结果" min-width="220">
        <template #default="{ row }">
          {{ row.inspection?.conclusion || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="放行状态" width="130">
        <template #default="{ row }">
          <el-tag :type="releaseTagType(row.releaseStatus)">{{ row.releaseStatusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核人" width="110">
        <template #default="{ row }">{{ row.release?.reviewer || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReview(row)">
            {{ row.status === 'releasing' ? '查看审核详情' : '查看审核结果' }}
          </el-button>
          <el-button link type="primary" @click="router.push(`/workorder/detail/${row.id}`)">
            工单详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!releaseList.length"
      description="当前没有符合条件的放行审核工单"
      class="mt-20px"
    />

    <template v-if="currentOrder">
      <el-card class="mt-20px release-hero" shadow="never">
        <div class="release-hero__head">
          <div>
            <div class="release-hero__title">
              放行审核 / {{ currentOrder.orderNo }}
            </div>
            <div class="release-hero__meta">
              关联设备 {{ currentOrder.deviceCode }} / {{ currentOrder.siteName }} / 当前状态：{{ currentOrder.statusLabel }}
            </div>
          </div>
          <el-tag :type="releaseTagType(currentOrder.releaseStatus)">{{ currentOrder.releaseStatusLabel }}</el-tag>
        </div>
        <div class="release-hero__grid">
          <div class="field-item"><strong>复检结果</strong><span>{{ inspectionResultText }}</span></div>
          <div class="field-item"><strong>风险等级</strong><span>{{ currentOrder.riskLevelLabel }}</span></div>
          <div class="field-item"><strong>规则结论</strong><span>{{ releaseRuleText }}</span></div>
          <div class="field-item"><strong>当前限制</strong><span>{{ currentRestrictionText }}</span></div>
        </div>
      </el-card>

      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :xl="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>审核依据</span>
              </div>
            </template>
            <div class="evidence-list">
              <div class="evidence-item">
                <div class="evidence-item__head">
                  <strong>维修记录</strong>
                  <el-tag :type="currentOrder.repair ? 'success' : 'warning'">
                    {{ currentOrder.repair ? '齐全' : '待补充' }}
                  </el-tag>
                </div>
                <p>{{ currentOrder.repair?.result || '尚未形成维修结论。' }}</p>
              </div>
              <div class="evidence-item">
                <div class="evidence-item__head">
                  <strong>复检记录</strong>
                  <el-tag :type="currentOrder.inspection?.result === 'passed' ? 'success' : 'warning'">
                    {{ inspectionStatusLabel }}
                  </el-tag>
                </div>
                <p>{{ currentOrder.inspection?.conclusion || '尚未提交复检意见。' }}</p>
              </div>
              <div class="evidence-item">
                <div class="evidence-item__head">
                  <strong>风险规则</strong>
                  <el-tag :type="riskTagType(currentOrder.riskLevel)">
                    {{ currentOrder.riskLevelLabel }}
                  </el-tag>
                </div>
                <p>{{ riskRuleHint }}</p>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :xl="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>证据资料</span>
              </div>
            </template>
            <div class="evidence-list">
              <div class="evidence-item">
                <div class="evidence-item__head">
                  <strong>维修附件</strong>
                  <el-tag type="info">{{ currentOrder.repair ? '已录入' : '待录入' }}</el-tag>
                </div>
                <p>当前以维修结论、领料记录和流转记录作为放行审核依据。</p>
              </div>
              <div class="evidence-item">
                <div class="evidence-item__head">
                  <strong>复检附件</strong>
                  <el-tag type="info">{{ currentOrder.inspection ? '已录入' : '待录入' }}</el-tag>
                </div>
                <p>当前以复检结论、电池核验和试飞验证作为最终放行依据。</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">
            <span>挂载电池核验</span>
          </div>
        </template>
        <div v-if="batteryRiskAlerts.length" class="mb-16px">
          <el-alert
            v-for="(alert, index) in batteryRiskAlerts"
            :key="`battery-risk-${index}`"
            :title="alert"
            type="warning"
            :closable="false"
            show-icon
            class="mb-12px"
          />
        </div>
        <el-table :data="batteryRows" stripe>
          <el-table-column label="电池编号" min-width="150">
            <template #default="{ row }">
              <div class="font-600">{{ row.batteryCode }}</div>
              <div class="text-secondary">SOH {{ row.soh }}%</div>
            </template>
          </el-table-column>
          <el-table-column label="备案归属 / 实际挂载" min-width="240">
            <template #default="{ row }">
              <div>备案：{{ row.linkedDeviceCode || currentOrder.deviceCode }}</div>
              <div class="text-secondary">实际：{{ row.linkedDeviceCode || currentOrder.deviceCode }}</div>
            </template>
          </el-table-column>
          <el-table-column label="循环次数" width="120">
            <template #default="{ row }">{{ row.cycleCount }} 次</template>
          </el-table-column>
          <el-table-column label="最近巡检" min-width="180">
            <template #default="{ row }">{{ row.lastCheckAt }} / {{ row.checkSource }}</template>
          </el-table-column>
          <el-table-column label="核验结论" width="140">
            <template #default="{ row }">
              <el-tag :type="batteryTagType(row.healthStatus)">{{ row.healthLabel }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!batteryRows.length" description="当前设备暂无挂载电池记录" class="mt-12px" />
      </el-card>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">
            <span>审核结论</span>
          </div>
        </template>

        <el-form
          v-if="currentOrder.status === 'releasing'"
          :model="reviewForm"
          label-width="110px"
        >
          <el-form-item label="审核人">
            <el-input v-model="reviewForm.reviewer" disabled />
          </el-form-item>
          <el-form-item label="放行结论">
            <el-radio-group v-model="reviewForm.result">
              <el-radio label="approved">正常放行</el-radio>
              <el-radio label="limited">限飞放行</el-radio>
              <el-radio label="rejected">驳回并返修</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="风险等级">
            <el-select v-model="reviewForm.riskLevel" class="!w-100%">
              <el-option
                v-for="item in WORKORDER_RISK_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="限制条件">
            <el-input
              v-model="reviewForm.restrictions"
              placeholder="限飞放行时填写，例如：24 小时内仅允许白天巡检"
            />
          </el-form-item>
          <el-form-item label="审核备注">
            <el-input v-model="reviewForm.conclusion" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item>
            <el-button @click="router.push(`/workorder/detail/${currentOrder.id}`)">取消</el-button>
            <el-button type="warning" @click="quickReject">驳回并退回维修</el-button>
            <el-button type="primary" @click="submitReview">提交审核结论</el-button>
          </el-form-item>
        </el-form>

        <el-descriptions v-else-if="currentOrder.release" :column="2" border>
          <el-descriptions-item label="审核人">{{ currentOrder.release.reviewer }}</el-descriptions-item>
          <el-descriptions-item label="放行结果">
            <el-tag :type="releaseTagType(currentOrder.release.result)">
              {{ releaseLabel(currentOrder.release.result) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="限制条件">{{ currentOrder.release.restrictions || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ currentOrder.release.reviewedAt }}</el-descriptions-item>
          <el-descriptions-item label="审核说明" :span="2">
            {{ currentOrder.release.conclusion }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </template>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { useUserStoreWithOut } from '@/store/modules/user'
import { DvMachineryApi } from '@/api/mes/dv/machinery'
import { listAssetBattery, type AssetBatteryVO } from '@/api/yian/asset'
import { resolveAssetDeviceMasterRecord } from '@/api/yian/asset/deviceMaster'
import {
  RELEASE_META,
  WORKORDER_RELEASE_OPTIONS,
  WORKORDER_RISK_OPTIONS,
  YianWorkorderApi,
  type WorkorderReleaseResult,
  type WorkorderRiskLevel,
  type WorkorderVO
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderRelease' })

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const queryParams = reactive({
  status: '' as WorkorderReleaseResult | '',
  riskLevel: '',
  keyword: ''
})

const releaseList = ref<WorkorderVO[]>([])
const currentOrder = ref<WorkorderVO>()
const batteryRows = ref<AssetBatteryVO[]>([])
const reviewForm = reactive({
  reviewer: currentOperatorName.value,
  result: 'approved' as WorkorderReleaseResult,
  riskLevel: 'medium' as WorkorderRiskLevel,
  restrictions: '',
  conclusion: ''
})

const releaseTagType = (status: WorkorderReleaseResult) => RELEASE_META[status].tagType
const releaseLabel = (status: WorkorderReleaseResult) => RELEASE_META[status].label
const riskTagType = (value: WorkorderVO['riskLevel']) =>
  value === 'high' ? 'danger' : value === 'medium' ? 'warning' : value === 'low' ? 'success' : 'info'
const batteryTagType = (value: string) =>
  value === 'danger' ? 'danger' : value === 'warning' ? 'warning' : 'success'

const inspectionResultText = computed(() =>
  currentOrder.value?.inspection?.result === 'passed'
    ? '通过'
    : currentOrder.value?.inspection?.result === 'failed'
      ? '退回维修'
      : '待复检'
)

const inspectionStatusLabel = computed(() =>
  currentOrder.value?.inspection?.result === 'passed'
    ? '通过'
    : currentOrder.value?.inspection?.result === 'failed'
      ? '未通过'
      : '待补充'
)

const releaseRuleText = computed(() => {
  if (!currentOrder.value) return '-'
  if (currentOrder.value.riskLevel === 'high') return '当前风险较高，原则上不建议直接放行。'
  if (currentOrder.value.riskLevel === 'medium') return '允许放行，但建议补充限制条件后执行。'
  if (currentOrder.value.riskLevel === 'low') return '当前风险较低，可按标准流程放行。'
  return '当前仍待初诊定级，建议先补齐诊断依据。'
})

const currentRestrictionText = computed(() => {
  if (!currentOrder.value) return '-'
  return currentOrder.value.release?.restrictions || reviewForm.restrictions || '当前无额外限制条件'
})

const batteryRiskAlerts = computed(() => {
  if (!currentOrder.value) return []
  const alerts = new Set<string>()
  batteryRows.value.forEach((row) => {
    if (row.healthStatus === 'danger') {
      alerts.add(`${row.batteryCode} 已命中禁止放行规则，需先更换或解绑后再提交放行结论。`)
    } else if (row.healthStatus === 'warning') {
      alerts.add(`${row.batteryCode} 当前处于观察状态，放行时需结合复检结果补充限制条件。`)
    }

    if (!row.cycleCount || !row.lastCheckAt || !row.checkSource || !row.soh) {
      alerts.add(`${row.batteryCode} 缺少循环次数、SOH 或最近巡检来源，当前不得作为正常放行依据。`)
    }

    if (row.linkedDeviceCode && row.linkedDeviceCode !== currentOrder.value?.deviceCode) {
      alerts.add(
        `${row.batteryCode} 的备案归属为 ${row.linkedDeviceCode}，与当前工单设备 ${currentOrder.value.deviceCode} 不一致，请先核对挂载关系。`
      )
    }
  })
  return Array.from(alerts)
})

const riskRuleHint = computed(() => {
  if (!currentOrder.value) return '-'
  if (currentOrder.value.riskLevel === 'high') return '建议维持停飞或驳回返修，避免直接恢复作业。'
  if (currentOrder.value.riskLevel === 'medium') return '建议限飞放行，并补充时段或任务限制。'
  if (currentOrder.value.riskLevel === 'low') return '风险较低，可结合复检结果正常放行。'
  return '请先完成初诊定级，再进行放行判断。'
})

const ensureCurrentOperator = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  reviewForm.reviewer = currentOperatorName.value
}

const loadData = () => {
  releaseList.value = YianWorkorderApi.getReleaseList(queryParams.status).filter((item) => {
    if (queryParams.riskLevel && item.riskLevel !== queryParams.riskLevel) {
      return false
    }
    if (queryParams.keyword) {
      const keyword = queryParams.keyword.toLowerCase()
      return `${item.orderNo} ${item.deviceCode}`.toLowerCase().includes(keyword)
    }
    return true
  })
}

const loadBatteryRows = async (order: WorkorderVO) => {
  try {
    const device = await DvMachineryApi.getMachinery(order.deviceId)
    const record = resolveAssetDeviceMasterRecord(device)
    const allBatteries = listAssetBattery()
    batteryRows.value = allBatteries.filter(
      (item) =>
        item.linkedDeviceId === order.deviceId || record.standardBatteryCodes.includes(item.batteryCode)
    )
  } catch {
    batteryRows.value = listAssetBattery().filter((item) => item.linkedDeviceId === order.deviceId)
  }
}

const openReview = async (row: WorkorderVO) => {
  currentOrder.value = YianWorkorderApi.getDetail(row.id)
  await ensureCurrentOperator()
  reviewForm.reviewer =
    currentOrder.value.status === 'releasing'
      ? currentOperatorName.value
      : currentOrder.value.release?.reviewer || currentOperatorName.value
  reviewForm.result = currentOrder.value.release?.result || 'approved'
  reviewForm.riskLevel =
    currentOrder.value.release?.riskLevel ||
    (currentOrder.value.riskLevel === 'unrated' ? 'medium' : currentOrder.value.riskLevel)
  reviewForm.restrictions = currentOrder.value.release?.restrictions || ''
  reviewForm.conclusion = currentOrder.value.release?.conclusion || ''
  await loadBatteryRows(currentOrder.value)
}

const quickReject = () => {
  reviewForm.result = 'rejected'
  if (!reviewForm.conclusion) {
    reviewForm.conclusion = '当前证据或复检依据不足，退回维修后补充处理。'
  }
  submitReview()
}

const submitReview = () => {
  if (!currentOrder.value || !reviewForm.reviewer || !reviewForm.conclusion) {
    message.warning('请完整填写放行审核信息')
    return
  }
  reviewForm.reviewer = currentOperatorName.value
  if (reviewForm.result === 'limited' && !reviewForm.restrictions) {
    message.warning('限飞放行时请填写限制条件')
    return
  }
  YianWorkorderApi.submitRelease(currentOrder.value.id, reviewForm)
  currentOrder.value = YianWorkorderApi.getDetail(currentOrder.value.id)
  loadData()
  message.success(reviewForm.result === 'rejected' ? '已驳回并退回维修' : '放行结论已生效')
}

onMounted(async () => {
  const orderId = Number(route.query.orderId)
  await ensureCurrentOperator()
  loadData()
  if (orderId) {
    const target = releaseList.value.find((item) => item.id === orderId)
    if (target) {
      openReview(target)
    }
  }
})
</script>

<style lang="scss" scoped>
.release-hero__head,
.card-header,
.evidence-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.release-hero__title {
  font-size: 20px;
  font-weight: 700;
}

.release-hero__meta,
.text-secondary,
.field-item span,
.evidence-item p {
  color: var(--el-text-color-secondary);
}

.release-hero__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.field-item {
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 10px;
}

.field-item strong {
  display: block;
  margin-bottom: 6px;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evidence-item {
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 10px;
}

.evidence-item p {
  margin: 8px 0 0;
  line-height: 1.7;
}
</style>
