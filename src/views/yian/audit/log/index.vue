<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="操作对象">
        <el-select placeholder="全部" clearable class="!w-120px">
          <el-option label="设备" value="device" />
          <el-option label="工单" value="workorder" />
          <el-option label="备件" value="part" />
          <el-option label="放行" value="release" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人">
        <el-input placeholder="操作人" clearable class="!w-140px" />
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker type="daterange" start-placeholder="开始" end-placeholder="结束" class="!w-240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="logList" stripe>
      <el-table-column label="操作时间" prop="time" width="160" />
      <el-table-column label="操作人" prop="operator" width="100" />
      <el-table-column label="操作对象" prop="objectType" width="100" />
      <el-table-column label="对象标识" prop="objectId" width="160" />
      <el-table-column label="操作内容" prop="content" min-width="250" />
      <el-table-column label="来源页面" prop="sourcePage" width="140" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default>
          <el-button link type="primary">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'AuditLog' })

const logList = ref([
  { time: '2026-05-07 16:30', operator: '陈工', objectType: '放行', objectId: 'WO-20260502-018', content: '提交放行审核，结论：正常放行', sourcePage: '放行审核详情' },
  { time: '2026-05-02 15:46', operator: '王工', objectType: '工单', objectId: 'WO-20260502-018', content: '提交复检，结论：通过', sourcePage: '复检页' },
  { time: '2026-05-02 12:35', operator: '张工', objectType: '备件', objectId: 'SP-DMP-003', content: '退料 1 个（减震球）', sourcePage: '领料页' },
  { time: '2026-05-02 09:26', operator: '李站长', objectType: '工单', objectId: 'WO-20260502-018', content: '受理工单，设备标记停飞', sourcePage: '工单受理' },
  { time: '2026-05-02 08:20', operator: '张工', objectType: '设备', objectId: 'DJI-M350-0027', content: '新建工单 WO-20260502-018', sourcePage: '新建工单' }
])
</script>
