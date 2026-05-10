<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" placeholder="全部" clearable class="!w-140px">
          <el-option label="待审核" value="pending" />
          <el-option label="正常放行" value="approved" />
          <el-option label="限飞放行" value="limited" />
          <el-option label="驳回" value="rejected" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="releaseList" stripe>
      <el-table-column label="工单编号" prop="orderNo" width="160" />
      <el-table-column label="设备编号" prop="deviceNo" width="160" />
      <el-table-column label="维修结论" prop="repairResult" min-width="200" />
      <el-table-column label="复检结论" prop="inspectResult" width="120" />
      <el-table-column label="放行状态" prop="releaseStatus" width="120">
        <template #default="{ row }">
          <el-tag :type="releaseTagType(row.releaseStatus)">{{ row.releaseStatusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核人" prop="reviewer" width="100" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary">审核详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'WorkorderRelease' })

const queryParams = reactive({ status: '' })

const releaseTagType = (s: string) => ({ pending: 'warning', approved: 'success', limited: 'primary', rejected: 'danger' }[s] || 'info')

const releaseList = ref([
  { orderNo: 'WO-20260502-018', deviceNo: 'DJI-M350-0027', repairResult: '更换桨叶 + 飞控复位', inspectResult: '通过', releaseStatus: 'pending', releaseStatusLabel: '待审核', reviewer: '-' },
  { orderNo: 'WO-20260426-012', deviceNo: 'DJI-M300-0015', repairResult: '更换电机', inspectResult: '通过', releaseStatus: 'approved', releaseStatusLabel: '正常放行', reviewer: '陈工' },
  { orderNo: 'WO-20260325-008', deviceNo: 'DJI-M30T-0042', repairResult: '传感器校准', inspectResult: '通过', releaseStatus: 'limited', releaseStatusLabel: '限飞放行', reviewer: '陈工' }
])
</script>
