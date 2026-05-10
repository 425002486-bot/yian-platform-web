<template>
  <ContentWrap>
    <el-alert type="info" :closable="false" class="mb-16px" title="SLA 规则为系统预置，定义工单各阶段的默认处理时限。" />

    <el-table :data="slaRules" stripe>
      <el-table-column label="阶段" prop="stage" width="140" />
      <el-table-column label="默认时限" prop="deadline" width="140" />
      <el-table-column label="超时动作" prop="action" min-width="250" />
      <el-table-column label="是否允许人工调整" prop="adjustable" width="160">
        <template #default="{ row }">
          <el-tag :type="row.adjustable ? 'success' : 'info'" size="small">{{ row.adjustable ? '允许' : '不允许' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'ConfigSla' })

const slaRules = ref([
  { stage: '受理', deadline: '4 小时', action: '超时提醒站点负责人', adjustable: false },
  { stage: '初始诊断', deadline: '8 小时', action: '超时提醒机务负责人和站点负责人', adjustable: true },
  { stage: '领料', deadline: '24 小时', action: '超时标记工单为阻塞状态', adjustable: false },
  { stage: '维修执行', deadline: '48 小时', action: '超时提醒维修责任人', adjustable: true },
  { stage: '复检', deadline: '8 小时', action: '超时提醒复检人', adjustable: false },
  { stage: '放行审核', deadline: '24 小时', action: '超时提醒放行审核人和站点负责人', adjustable: false }
])
</script>
