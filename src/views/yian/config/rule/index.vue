<template>
  <ContentWrap>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="资产准入规则" name="asset">
        <el-table :data="assetRules" stripe>
          <el-table-column label="规则名称" prop="name" width="200" />
          <el-table-column label="触发条件" prop="condition" min-width="300" />
          <el-table-column label="动作" prop="action" width="140" />
          <el-table-column label="状态" prop="status" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === '启用' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="工单过程规则" name="workorder">
        <div class="text-gray-400 py-40px text-center">工单过程规则列表（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="放行审核规则" name="release">
        <div class="text-gray-400 py-40px text-center">放行审核规则列表（待开发）</div>
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'ConfigRule' })

const activeTab = ref('asset')

const assetRules = ref([
  { name: '校准过期强停飞', condition: '设备校准有效期 < 当前日期', action: '标记停飞', status: '启用' },
  { name: '电池 SOH 低于阈值', condition: 'SOH < 60%', action: '标记停飞', status: '启用' },
  { name: '关键部件超寿', condition: '桨叶使用次数 > 500 或 电机运行时长 > 2000h', action: '标记停飞', status: '启用' },
  { name: '校准临期预警', condition: '校准有效期 <= 当前日期 + 30天', action: '标记待检', status: '启用' },
  { name: '保养临期预警', condition: '下次保养日期 <= 当前日期 + 7天', action: '标记待检', status: '启用' }
])
</script>
