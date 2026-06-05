<template>
  <div class="yian-prototype-page yian-dashboard-page p-20px">
    <section class="yian-prototype-hero">
      <div class="yian-prototype-eyebrow">YIAN INTELLINK OPERATIONS</div>
      <h1 class="yian-prototype-hero__title">翼安智链运维驾驶舱</h1>
      <p class="yian-prototype-hero__desc">
        以风险发现、工单推进和资产健康为核心视角，优先呈现停飞风险、待放行压力、在途维修任务与备件保障状态。
      </p>
    </section>

    <section class="yian-prototype-summary">
      <article class="yian-prototype-stat">
        <strong class="yian-prototype-stat__label">在册设备</strong>
        <span class="yian-prototype-stat__value">{{ summaryCards.totalDevices }}</span>
        <p class="yian-prototype-stat__desc">
          启用 {{ summaryCards.enabledDevices }} / 停用 {{ summaryCards.disabledDevices }}
        </p>
      </article>
      <article class="yian-prototype-stat">
        <strong class="yian-prototype-stat__label">待处理工单</strong>
        <span class="yian-prototype-stat__value yian-prototype-stat__value--warning">
          {{ summaryCards.runningOrders }}
        </span>
        <p class="yian-prototype-stat__desc">
          超时 {{ summaryCards.overdueOrders }} / 待初诊 {{ summaryCards.diagnosingOrders }}
        </p>
      </article>
      <article class="yian-prototype-stat">
        <strong class="yian-prototype-stat__label">待放行审核</strong>
        <span class="yian-prototype-stat__value yian-prototype-stat__value--primary">
          {{ summaryCards.releasingOrders }}
        </span>
        <p class="yian-prototype-stat__desc">
          高风险 {{ summaryCards.highRiskOrders }} / 已完成 {{ summaryCards.completedOrders }}
        </p>
      </article>
      <article class="yian-prototype-stat">
        <strong class="yian-prototype-stat__label">低库存备件</strong>
        <span class="yian-prototype-stat__value yian-prototype-stat__value--danger">
          {{ summaryCards.lowStockItems }}
        </span>
        <p class="yian-prototype-stat__desc">
          缺货 {{ summaryCards.emptyStockItems }} / 强停飞电池 {{ summaryCards.dangerBatteries }}
        </p>
      </article>
    </section>

    <el-row :gutter="16">
      <el-col :xs="24" :xl="14">
        <section class="yian-prototype-section">
          <h2 class="yian-prototype-section__title">风险预警</h2>
          <p class="yian-prototype-section__desc">
            自动汇总电池强规则命中、超时工单和备件短缺，帮助值班人员先看风险，再看流程。
          </p>
          <div class="mt-20px">
            <el-alert
              v-for="alert in riskAlerts"
              :key="alert.title"
              :title="alert.title"
              :type="alert.type"
              :description="alert.description"
              :closable="false"
              show-icon
              class="mb-12px"
            />
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :xl="10">
        <section class="yian-prototype-section">
          <h2 class="yian-prototype-section__title">我的待办</h2>
          <p class="yian-prototype-section__desc">
            按工单阶段展示当前处理压力，方便快速定位要先推进的节点。
          </p>
          <div class="mt-20px">
            <div
              v-for="item in todoList"
              :key="item.stage"
              class="evidence-item mb-12px"
            >
              <div class="evidence-item__head">
                <div>
                  <el-tag :type="item.tagType" size="small" class="mr-8px">{{ item.stage }}</el-tag>
                  <span class="timeline-title">{{ item.title }}</span>
                </div>
                <span class="text-secondary">{{ item.count }} 项</span>
              </div>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </section>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { listAssetBattery } from '@/api/yian/asset'
import { resolveAssetDeviceMasterRecord } from '@/api/yian/asset/deviceMaster'
import { getMaterialStockPage, type MaterialStockVO } from '@/api/yian/inventory'
import { YianWorkorderApi } from '@/api/yian/workorder'
import { syncRuleRuntimeConfig } from '@/api/yian/config/rule'

defineOptions({ name: 'YianDashboard' })

const devices = ref<DvMachineryVO[]>([])
const stocks = ref<MaterialStockVO[]>([])

const workorderSummary = computed(() => YianWorkorderApi.getSummary())
const runningOrders = computed(() => YianWorkorderApi.getList({ viewTab: 'running' }))
const batteries = computed(() => listAssetBattery())

const summaryCards = computed(() => {
  const enabledDevices = devices.value.filter(
    (item) => resolveAssetDeviceMasterRecord(item).enableStatus === 'enabled'
  ).length
  const lowStockItems = stocks.value.filter(
    (item) => typeof item.minStock === 'number' && item.quantity > 0 && item.quantity <= item.minStock
  ).length
  const emptyStockItems = stocks.value.filter((item) => item.quantity <= 0).length
  const highRiskOrders = runningOrders.value.filter((item) => item.riskLevel === 'high').length
  const dangerBatteries = batteries.value.filter((item) => item.healthStatus === 'danger').length

  return {
    totalDevices: devices.value.length,
    enabledDevices,
    disabledDevices: Math.max(devices.value.length - enabledDevices, 0),
    runningOrders: runningOrders.value.length,
    overdueOrders: workorderSummary.value.overdue,
    diagnosingOrders: workorderSummary.value.diagnosing,
    releasingOrders: workorderSummary.value.releasing,
    highRiskOrders,
    completedOrders: workorderSummary.value.completed,
    lowStockItems,
    emptyStockItems,
    dangerBatteries
  }
})

const riskAlerts = computed(() => {
  const alerts: Array<{ title: string; description: string; type: 'error' | 'warning' }> = []

  const blockedBatteries = batteries.value.filter((item) => item.healthStatus === 'danger')
  if (blockedBatteries.length) {
    alerts.push({
      title: `${blockedBatteries[0].batteryCode} 命中强停飞规则`,
      description: `当前共有 ${blockedBatteries.length} 块电池处于禁止放行状态，需先更换或解绑后再提交放行结论。`,
      type: 'error'
    })
  }

  const overdueOrders = runningOrders.value.filter((item) => item.overdue)
  if (overdueOrders.length) {
    alerts.push({
      title: `${overdueOrders.length} 张工单已超出节点 SLA`,
      description: `优先处理 ${overdueOrders[0].orderNo} 等超时工单，避免继续占压受理、诊断或放行节点。`,
      type: 'warning'
    })
  }

  const lowStockItems = stocks.value.filter(
    (item) => typeof item.minStock === 'number' && item.quantity > 0 && item.quantity <= item.minStock
  )
  if (lowStockItems.length) {
    alerts.push({
      title: `${lowStockItems[0].itemName} 等备件库存偏低`,
      description: `当前共有 ${lowStockItems.length} 项备件低于安全库存，可能影响待修与复检任务推进。`,
      type: 'warning'
    })
  }

  if (!alerts.length) {
    alerts.push({
      title: '当前未发现新增高优先级风险',
      description: '系统已完成本轮工单、资产和备件状态扫描，可继续关注节点推进与证据补录。',
      type: 'warning'
    })
  }

  return alerts
})

const todoList = computed(() => [
  {
    stage: '待受理',
    title: '待受理工单',
    count: workorderSummary.value.pending,
    tagType: 'danger' as const,
    description: '新报修工单需要先完成受理分派与停飞结论确认。'
  },
  {
    stage: '待初诊',
    title: '待初始诊断工单',
    count: workorderSummary.value.diagnosing,
    tagType: 'warning' as const,
    description: '建议优先补齐故障分类、风险等级和备件建议，避免阻塞后续领料。'
  },
  {
    stage: '待放行',
    title: '待放行审核',
    count: workorderSummary.value.releasing,
    tagType: 'primary' as const,
    description: '请重点检查复检结论、电池核验结果和放行限制条件。'
  },
  {
    stage: '待复检',
    title: '待复检工单',
    count: workorderSummary.value.inspecting,
    tagType: 'info' as const,
    description: '维修完成后需补齐复检记录，才能继续进入放行审核。'
  }
])

const loadDashboard = async () => {
  const [deviceResp, stockResp] = await Promise.allSettled([
    DvMachineryApi.getMachineryPage({ pageNo: 1, pageSize: 100 }),
    getMaterialStockPage({ pageNo: 1, pageSize: 100, virtualFilter: 'exclude' })
  ])

  if (deviceResp.status === 'fulfilled') {
    devices.value = deviceResp.value.list || []
  } else {
    devices.value = []
  }

  if (stockResp.status === 'fulfilled') {
    stocks.value = stockResp.value.list || []
  } else {
    stocks.value = []
  }
}

onMounted(async () => {
  await syncRuleRuntimeConfig()
  loadDashboard()
})
</script>
