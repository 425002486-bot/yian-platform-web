<template>
  <ContentWrap>
    <div class="flex justify-between items-center mb-20px">
      <div class="flex gap-12px items-center">
        <el-select placeholder="站点" clearable class="!w-160px">
          <el-option label="华东运营中心" :value="1" />
          <el-option label="苏州工业园站" :value="2" />
        </el-select>
        <el-button type="primary" @click="$router.push('/workorder/create')">新建工单</el-button>
      </div>
      <el-button @click="$router.push('/workorder/list')">切换列表视图</el-button>
    </div>

    <!-- 看板 -->
    <el-row :gutter="12">
      <el-col :span="4" v-for="stage in stages" :key="stage.key">
        <el-card shadow="hover" :body-style="{ padding: '12px' }">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-bold">{{ stage.label }}</span>
              <el-badge :value="stage.count" :type="stage.count > 0 ? 'primary' : 'info'" />
            </div>
          </template>
          <div v-for="order in stage.orders" :key="order.id" class="mb-8px p-10px bg-gray-50 rounded-8px cursor-pointer hover:bg-blue-50 transition-colors" @click="handleDetail(order)">
            <div class="text-13px font-bold mb-4px">{{ order.orderNo }}</div>
            <div class="text-12px text-gray-500">{{ order.deviceNo }}</div>
            <div class="text-12px text-gray-400 mt-4px flex justify-between">
              <span>{{ order.owner }}</span>
              <el-tag v-if="order.overdue" size="small" type="danger">超时</el-tag>
            </div>
          </div>
          <div v-if="stage.orders.length === 0" class="text-center text-gray-300 py-20px text-12px">暂无工单</div>
        </el-card>
      </el-col>
    </el-row>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'

defineOptions({ name: 'WorkorderBoard' })

const router = useRouter()

const stages = ref([
  { key: 'pending', label: '待受理', count: 4, orders: [
    { id: 1, orderNo: 'WO-0508-001', deviceNo: 'DJI-M350-0027', owner: '张工', overdue: false },
    { id: 2, orderNo: 'WO-0508-002', deviceNo: 'DJI-M300-0015', owner: '李工', overdue: true }
  ]},
  { key: 'diagnosing', label: '待初诊', count: 3, orders: [
    { id: 3, orderNo: 'WO-0507-003', deviceNo: 'DJI-M30T-0042', owner: '王工', overdue: false }
  ]},
  { key: 'picking', label: '待领料', count: 2, orders: [
    { id: 4, orderNo: 'WO-0506-004', deviceNo: 'DJI-M300-0015', owner: '李工', overdue: true }
  ]},
  { key: 'repairing', label: '维修中', count: 3, orders: [
    { id: 5, orderNo: 'WO-0505-005', deviceNo: 'DJI-M350-0033', owner: '赵工', overdue: false }
  ]},
  { key: 'inspecting', label: '待复检', count: 2, orders: [] },
  { key: 'releasing', label: '待放行', count: 5, orders: [
    { id: 6, orderNo: 'WO-0502-018', deviceNo: 'DJI-M350-0027', owner: '张工', overdue: false }
  ]}
])

const handleDetail = (order: any) => router.push(`/workorder/detail/${order.id}`)
</script>
