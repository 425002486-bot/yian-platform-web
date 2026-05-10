<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/workorder/list')" title="返回工单列表" :content="'工单详情 - ' + order.orderNo" />

    <!-- 工单基础信息 -->
    <el-descriptions :column="3" border class="mt-20px" title="基本信息">
      <el-descriptions-item label="工单编号">{{ order.orderNo }}</el-descriptions-item>
      <el-descriptions-item label="关联设备">{{ order.deviceNo }}</el-descriptions-item>
      <el-descriptions-item label="报修来源">{{ order.source }}</el-descriptions-item>
      <el-descriptions-item label="异常现象" :span="2">{{ order.symptom }}</el-descriptions-item>
      <el-descriptions-item label="当前状态">
        <el-tag type="primary">{{ order.statusLabel }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="创建人">{{ order.creator }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ order.createTime }}</el-descriptions-item>
      <el-descriptions-item label="SLA截止">
        <span :class="order.isOverdue ? 'text-red-500' : ''">{{ order.slaDeadline }}</span>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 流转进度 -->
    <el-card class="mt-20px" header="流转进度">
      <el-steps :active="order.currentStep" finish-status="success" align-center>
        <el-step title="新建" />
        <el-step title="受理" />
        <el-step title="初诊" />
        <el-step title="领料" />
        <el-step title="维修" />
        <el-step title="复检" />
        <el-step title="放行" />
        <el-step title="完成" />
      </el-steps>
    </el-card>

    <!-- 各阶段结果 -->
    <el-tabs v-model="activeTab" class="mt-20px">
      <el-tab-pane label="受理信息" name="accept">
        <div class="text-gray-400 py-40px text-center">受理信息（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="初诊结果" name="diagnose">
        <div class="text-gray-400 py-40px text-center">初诊结果（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="领料记录" name="pick">
        <div class="text-gray-400 py-40px text-center">领料记录（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="维修结果" name="repair">
        <div class="text-gray-400 py-40px text-center">维修结果（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="复检结果" name="inspect">
        <div class="text-gray-400 py-40px text-center">复检结果（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="放行结论" name="release">
        <div class="text-gray-400 py-40px text-center">放行结论（待开发）</div>
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'WorkorderDetail' })

const activeTab = ref('accept')

const order = reactive({
  orderNo: 'WO-20260502-018',
  deviceNo: 'DJI-M350-0027',
  source: '飞手上报',
  symptom: '飞控异常，返航失败',
  statusLabel: '待放行',
  currentStep: 5,
  creator: '张工',
  createTime: '2026-05-02 08:20',
  slaDeadline: '2026-05-09 08:20',
  isOverdue: false
})
</script>
