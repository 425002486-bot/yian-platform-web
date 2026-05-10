<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="搜索">
        <el-input placeholder="电池编号 / SN" clearable class="!w-200px" />
      </el-form-item>
      <el-form-item label="健康状态">
        <el-select placeholder="全部" clearable class="!w-120px">
          <el-option label="正常" value="normal" />
          <el-option label="预警" value="warning" />
          <el-option label="异常" value="danger" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
        <el-button>重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="batteryList" stripe>
      <el-table-column label="电池编号" prop="batteryNo" width="160" />
      <el-table-column label="适配机型" prop="model" width="140" />
      <el-table-column label="循环次数" prop="cycles" width="100" />
      <el-table-column label="SOH" prop="soh" width="100">
        <template #default="{ row }">
          <el-tag :type="row.soh > 80 ? 'success' : row.soh > 60 ? 'warning' : 'danger'">{{ row.soh }}%</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近检测" prop="lastCheck" width="160" />
      <el-table-column label="检测来源" prop="checkSource" width="120" />
      <el-table-column label="状态" prop="statusLabel" width="100" />
      <el-table-column label="操作" width="120">
        <template #default>
          <el-button link type="primary">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'AssetBattery' })

const batteryList = ref([
  { batteryNo: 'BAT-M350-001', model: 'M350 RTK', cycles: 156, soh: 92, lastCheck: '2026-05-01', checkSource: 'BMS', statusLabel: '正常' },
  { batteryNo: 'BAT-M350-002', model: 'M350 RTK', cycles: 320, soh: 71, lastCheck: '2026-04-28', checkSource: '检测工装', statusLabel: '预警' },
  { batteryNo: 'BAT-M300-003', model: 'M300 RTK', cycles: 485, soh: 55, lastCheck: '2026-04-15', checkSource: '人工导入', statusLabel: '异常' }
])
</script>
