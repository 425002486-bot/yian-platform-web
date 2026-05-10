<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="工单编号">
        <el-input v-model="queryParams.orderNo" placeholder="工单编号" clearable class="!w-180px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="!w-120px">
          <el-option label="待受理" value="pending" />
          <el-option label="待初诊" value="diagnosing" />
          <el-option label="待领料" value="picking" />
          <el-option label="维修中" value="repairing" />
          <el-option label="待复检" value="inspecting" />
          <el-option label="待放行" value="releasing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已关闭" value="closed" />
        </el-select>
      </el-form-item>
      <el-form-item label="设备">
        <el-input placeholder="设备编号" clearable class="!w-160px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
        <el-button>重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button type="primary" @click="$router.push('/workorder/create')">新建工单</el-button>
      <el-button @click="$router.push('/workorder/board')">切换看板视图</el-button>
    </div>

    <el-table :data="workorderList" stripe>
      <el-table-column label="工单编号" prop="orderNo" width="160" />
      <el-table-column label="关联设备" prop="deviceNo" width="160" />
      <el-table-column label="来源" prop="source" width="100" />
      <el-table-column label="异常现象" prop="symptom" min-width="200" />
      <el-table-column label="当前节点" prop="statusLabel" width="100">
        <template #default="{ row }">
          <el-tag :type="row.tagType">{{ row.statusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="责任人" prop="owner" width="100" />
      <el-table-column label="创建时间" prop="createTime" width="160" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/workorder/detail/${row.id}`)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'WorkorderList' })

const queryParams = reactive({ orderNo: '', status: '' })

const workorderList = ref([
  { id: 1, orderNo: 'WO-20260508-001', deviceNo: 'DJI-M350-0027', source: '飞手上报', symptom: '返航过程中突然失去高度', statusLabel: '待受理', tagType: 'danger', owner: '张工', createTime: '2026-05-08 09:12' },
  { id: 2, orderNo: 'WO-20260507-003', deviceNo: 'DJI-M30T-0042', source: '巡检发现', symptom: '云台抖动异常', statusLabel: '待初诊', tagType: 'warning', owner: '王工', createTime: '2026-05-07 14:30' },
  { id: 3, orderNo: 'WO-20260506-004', deviceNo: 'DJI-M300-0015', source: '系统告警', symptom: '电机温度过高报警', statusLabel: '待领料', tagType: 'primary', owner: '李工', createTime: '2026-05-06 11:45' },
  { id: 4, orderNo: 'WO-20260502-018', deviceNo: 'DJI-M350-0027', source: '飞手上报', symptom: '飞控异常，返航失败', statusLabel: '待放行', tagType: 'primary', owner: '张工', createTime: '2026-05-02 08:20' }
])
</script>
