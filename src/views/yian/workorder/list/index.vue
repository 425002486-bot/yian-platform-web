<template>
  <ContentWrap>
    <el-form :model="queryParams" :inline="true" class="mb-16px">
      <el-form-item label="搜索">
        <el-input
          v-model="queryParams.keyword"
          placeholder="工单编号 / 设备编号 / 提交人 / 责任人"
          clearable
          class="!w-260px"
          @keyup.enter="loadData"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="queryParams.status"
          placeholder="全部状态"
          clearable
          class="!w-150px"
        >
          <el-option
            v-for="item in WORKORDER_STAGE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="来源">
        <el-select
          v-model="queryParams.source"
          placeholder="全部来源"
          clearable
          class="!w-150px"
        >
          <el-option
            v-for="item in WORKORDER_SOURCE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="风险等级">
        <el-select
          v-model="queryParams.riskLevel"
          placeholder="全部风险"
          clearable
          class="!w-150px"
        >
          <el-option
            v-for="item in WORKORDER_RISK_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px flex flex-wrap gap-12px">
      <el-button @click="router.push('/workorder/board')">工单看板</el-button>
      <el-button type="primary" @click="router.push('/workorder/create')">新建工单</el-button>
    </div>

    <el-tabs v-model="activeTab" class="mb-12px">
      <el-tab-pane :label="`执行中 ${tabCounts.running}`" name="running" />
      <el-tab-pane :label="`已完成 ${tabCounts.completed}`" name="completed" />
      <el-tab-pane :label="`已关闭 ${tabCounts.closed}`" name="closed" />
    </el-tabs>

    <el-table :data="workorderList" stripe>
      <el-table-column label="工单编号" min-width="170">
        <template #default="{ row }">
          <div class="font-600">{{ row.orderNo }}</div>
          <div class="text-secondary">{{ row.createTime }}</div>
        </template>
      </el-table-column>
      <el-table-column label="设备" min-width="200">
        <template #default="{ row }">
          <div>{{ row.deviceCode }}</div>
          <div class="text-secondary">{{ row.deviceName }} / {{ row.siteName }}</div>
        </template>
      </el-table-column>
      <el-table-column label="当前状态" width="130">
        <template #default="{ row }">
          <el-tag :type="row.tagType">{{ row.statusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="异常类型" min-width="260">
        <template #default="{ row }">
          <div>{{ row.sourceLabel }}</div>
          <div class="text-secondary">{{ row.symptom }}</div>
        </template>
      </el-table-column>
      <el-table-column label="责任人" prop="owner" width="120" />
      <el-table-column label="节点截止时间" min-width="190">
        <template #default="{ row }">
          <div :class="row.overdue ? 'text-danger' : ''">{{ row.slaDeadline }}</div>
          <div class="text-secondary">
            {{ row.pendingActionLabel }} / {{ row.riskLevelLabel }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/workorder/detail/${row.id}`)">
            工单详情
          </el-button>
          <el-button
            v-if="getCurrentNodeActionLabel(row)"
            link
            type="primary"
            @click="handleCurrentNodeAction(row)"
          >
            {{ getCurrentNodeActionLabel(row) }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import {
  WORKORDER_RISK_OPTIONS,
  WORKORDER_SOURCE_OPTIONS,
  WORKORDER_STAGE_OPTIONS,
  YianWorkorderApi,
  type WorkorderListQuery,
  type WorkorderVO
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderList' })

const router = useRouter()
const route = useRoute()

const activeTab = ref<'running' | 'completed' | 'closed'>('running')
const queryParams = reactive({
  keyword: '',
  status: '' as WorkorderVO['status'] | '',
  source: '' as WorkorderVO['source'] | '',
  riskLevel: '' as WorkorderVO['riskLevel'] | ''
})

const workorderList = ref<WorkorderVO[]>([])

const baseQuery = computed<WorkorderListQuery>(() => ({
  keyword: queryParams.keyword || undefined,
  status: queryParams.status || undefined,
  source: queryParams.source || undefined,
  riskLevel: queryParams.riskLevel || undefined
}))

const tabCounts = computed(() => {
  const filtered = YianWorkorderApi.getList(baseQuery.value)
  return {
    running: filtered.filter((item) => !['completed', 'closed'].includes(item.status)).length,
    completed: filtered.filter((item) => item.status === 'completed').length,
    closed: filtered.filter((item) => item.status === 'closed').length
  }
})

const loadData = () => {
  workorderList.value = YianWorkorderApi.getList({
    ...baseQuery.value,
    viewTab: activeTab.value
  })
}

const getCurrentNodeActionLabel = (row: WorkorderVO) => {
  const actionMap: Partial<Record<WorkorderVO['status'], string>> = {
    pending: '去受理',
    diagnosing: '去初诊',
    picking: '去领料',
    repairing: '去维修',
    inspecting: '去复检',
    releasing: '去放行'
  }
  return actionMap[row.status] || ''
}

const handleCurrentNodeAction = (row: WorkorderVO) => {
  if (row.status === 'releasing') {
    router.push(`/workorder/release?orderId=${row.id}`)
    return
  }
  router.push(`/workorder/detail/${row.id}`)
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = ''
  queryParams.source = ''
  queryParams.riskLevel = ''
  activeTab.value = 'running'
  loadData()
}

const syncQueryFromRoute = () => {
  const deviceCode = route.query.deviceCode
  queryParams.keyword = typeof deviceCode === 'string' ? deviceCode : ''
}

watch(activeTab, () => {
  loadData()
})

watch(
  () => route.query.deviceCode,
  () => {
    syncQueryFromRoute()
    loadData()
  }
)

onMounted(() => {
  syncQueryFromRoute()
  loadData()
})
</script>

<style lang="scss" scoped>
.text-secondary {
  color: var(--el-text-color-secondary);
}

.text-danger {
  color: var(--el-color-danger);
}
</style>
