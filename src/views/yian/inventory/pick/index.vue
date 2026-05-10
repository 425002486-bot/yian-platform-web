<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="工单编号">
        <el-input placeholder="工单编号" clearable class="!w-180px" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select placeholder="全部" clearable class="!w-120px">
          <el-option label="领料" value="pick" />
          <el-option label="退料" value="return" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="records" stripe>
      <el-table-column label="记录编号" prop="recordNo" width="160" />
      <el-table-column label="工单编号" prop="orderNo" width="160" />
      <el-table-column label="备件名称" prop="partName" width="160" />
      <el-table-column label="料号" prop="partNo" width="120" />
      <el-table-column label="类型" prop="type" width="80">
        <template #default="{ row }">
          <el-tag :type="row.type === '领料' ? 'primary' : 'success'" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" prop="qty" width="80" />
      <el-table-column label="操作人" prop="operator" width="100" />
      <el-table-column label="操作时间" prop="time" width="160" />
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'InventoryPick' })

const records = ref([
  { recordNo: 'PK-0502-001', orderNo: 'WO-20260502-018', partName: '标准桨叶套装', partNo: 'SP-BLD-001', type: '领料', qty: 1, operator: '张工', time: '2026-05-02 11:08' },
  { recordNo: 'PK-0502-002', orderNo: 'WO-20260502-018', partName: '减震球', partNo: 'SP-DMP-003', type: '领料', qty: 4, operator: '张工', time: '2026-05-02 11:08' },
  { recordNo: 'RT-0502-001', orderNo: 'WO-20260502-018', partName: '减震球', partNo: 'SP-DMP-003', type: '退料', qty: 1, operator: '张工', time: '2026-05-02 12:35' }
])
</script>
