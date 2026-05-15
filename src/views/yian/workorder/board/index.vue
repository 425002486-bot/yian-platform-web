<template>
  <ContentWrap>
    <div class="toolbar-card">
      <div class="toolbar-card__filters">
        <el-select
          v-model="queryParams.siteName"
          placeholder="全部站点"
          clearable
          class="!w-180px"
        >
          <el-option v-for="item in siteOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select
          v-model="queryParams.overdueOnly"
          placeholder="超时筛选"
          class="!w-160px"
        >
          <el-option label="全部工单" :value="false" />
          <el-option label="优先展示超时" :value="true" />
        </el-select>
        <el-select
          v-model="queryParams.riskLevel"
          placeholder="风险等级"
          clearable
          class="!w-160px"
        >
          <el-option
            v-for="item in WORKORDER_RISK_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="toolbar-card__actions">
        <el-button @click="router.push('/workorder/list')">查看工单列表</el-button>
        <el-button type="primary" @click="router.push('/workorder/create')">新建工单</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="mt-20px mb-20px">
      <el-col :xs="24" :sm="12" :lg="6" v-for="card in summaryCards" :key="card.label">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-card__label">{{ card.label }}</div>
          <div class="summary-card__value">{{ card.value }}</div>
          <div class="summary-card__desc">{{ card.desc }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-600">工单阶段看板</span>
          <el-button link type="primary" @click="loadData">刷新看板</el-button>
        </div>
      </template>

      <div class="board-grid">
        <el-card
          v-for="stage in stages"
          :key="stage.key"
          shadow="hover"
          :body-style="{ padding: '12px' }"
          class="board-stage"
        >
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-600">{{ stage.label }}</span>
              <el-badge :value="stage.count" :type="stage.count > 0 ? 'primary' : 'info'" />
            </div>
          </template>
          <div
            v-for="order in stage.orders"
            :key="order.id"
            class="board-card"
            @click="router.push(`/workorder/detail/${order.id}`)"
          >
            <div class="board-card__head">
              <span class="font-600">{{ order.orderNo }}</span>
              <el-tag v-if="order.overdue" size="small" type="danger">超时</el-tag>
            </div>
            <div class="text-secondary mt-6px">{{ order.deviceCode }} / {{ order.siteName }}</div>
            <div class="mt-8px">{{ order.symptom }}</div>
            <div class="board-card__foot">
              <span>{{ order.owner }}</span>
              <span>{{ order.riskLevelLabel }}</span>
            </div>
          </div>
          <div v-if="stage.orders.length === 0" class="empty-block">暂无工单</div>
        </el-card>
      </div>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import {
  WORKORDER_RISK_OPTIONS,
  YianWorkorderApi,
  type WorkorderBoardColumnVO
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderBoard' })

const router = useRouter()

const queryParams = reactive({
  siteName: '',
  overdueOnly: false,
  riskLevel: ''
})

const siteOptions = ref<string[]>([])
const stages = ref<WorkorderBoardColumnVO[]>([])
const summary = ref(YianWorkorderApi.getSummary())

const summaryCards = computed(() => [
  { label: '工单总量', value: `${summary.value.total}`, desc: '包含进行中、已完成和已关闭工单' },
  {
    label: '待受理 / 待初诊',
    value: `${summary.value.pending + summary.value.diagnosing}`,
    desc: '优先处理新报修与待诊断工单'
  },
  {
    label: '待放行',
    value: `${summary.value.releasing}`,
    desc: '复检通过后等待放行审核'
  },
  { label: '超时工单', value: `${summary.value.overdue}`, desc: '已超过 SLA 截止时间' }
])

const loadData = () => {
  siteOptions.value = YianWorkorderApi.getSiteOptions()
  stages.value = YianWorkorderApi.getBoard({
    siteName: queryParams.siteName || undefined,
    overdueOnly: queryParams.overdueOnly || undefined,
    riskLevel: queryParams.riskLevel || undefined
  })
  summary.value = YianWorkorderApi.getSummary()
}

watch(
  () => ({ ...queryParams }),
  () => loadData(),
  { deep: true }
)

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.toolbar-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
}

.toolbar-card__filters,
.toolbar-card__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.summary-card {
  min-height: 120px;
}

.summary-card__label,
.text-secondary,
.empty-block {
  color: var(--el-text-color-secondary);
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

.board-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(220px, 1fr));
  gap: 12px;
  overflow-x: auto;
}

.board-stage {
  min-height: 420px;
}

.board-card {
  margin-bottom: 8px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.board-card:hover {
  background: var(--el-color-primary-light-9);
}

.board-card__head,
.board-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.board-card__foot {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.empty-block {
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
}
</style>
