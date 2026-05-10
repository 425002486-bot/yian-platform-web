<template>
  <div class="p-20px">
    <!-- 概览卡片 -->
    <el-row :gutter="16" class="mb-16px">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header><span>在册设备</span></template>
          <div class="text-30px font-bold text-center">128</div>
          <div class="text-center text-gray-400 mt-8px">启用 102 / 停飞 8 / 维修中 12 / 待检 6</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header><span>待处理工单</span></template>
          <div class="text-30px font-bold text-center text-orange-500">17</div>
          <div class="text-center text-gray-400 mt-8px">3 单已超时</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header><span>待放行</span></template>
          <div class="text-30px font-bold text-center text-blue-500">5</div>
          <div class="text-center text-gray-400 mt-8px">2 单限飞待确认</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header><span>低库存备件</span></template>
          <div class="text-30px font-bold text-center text-red-500">3</div>
          <div class="text-center text-gray-400 mt-8px">影响 2 单待修工单</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 风险预警 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>风险预警</span></template>
          <el-alert title="B-2403 电池批次命中强停飞规则" type="error" :closable="false" class="mb-12px" description="涉及 2 张放行单已被拦截，需进入放行详情查看规则命中原因。" />
          <el-alert title="DJI-M350-0027 重复报修" type="warning" :closable="false" class="mb-12px" description="同设备 14 日内重复报修，需从工单中心进入初始诊断复核风险等级。" />
          <el-alert title="桨叶套装备件待补货" type="warning" :closable="false" description="当前库存 4 套，已影响两单待修任务的正常推进。" />
        </el-card>
      </el-col>

      <!-- 待办任务 -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>我的待办</span></template>
          <div class="todo-item" v-for="item in todoList" :key="item.title">
            <div class="flex justify-between items-center py-12px border-b border-gray-100">
              <div>
                <el-tag :type="item.tagType" size="small" class="mr-8px">{{ item.stage }}</el-tag>
                <span>{{ item.title }}</span>
              </div>
              <span class="text-gray-400 text-12px">{{ item.count }} 项</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'YianDashboard' })

const todoList = [
  { stage: '待受理', title: '待受理工单', count: 4, tagType: 'danger' as const },
  { stage: '待初诊', title: '待初始诊断工单', count: 3, tagType: 'warning' as const },
  { stage: '待放行', title: '待放行审核', count: 5, tagType: 'primary' as const },
  { stage: '待复检', title: '待复检工单', count: 2, tagType: 'info' as const }
]
</script>
