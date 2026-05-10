<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/audit/log')" title="返回审计日志" content="日志详情" />

    <el-descriptions :column="2" border class="mt-20px" title="操作上下文">
      <el-descriptions-item label="操作时间">2026-05-02 09:26:14</el-descriptions-item>
      <el-descriptions-item label="操作人">李站长</el-descriptions-item>
      <el-descriptions-item label="操作对象">工单</el-descriptions-item>
      <el-descriptions-item label="对象标识">WO-20260502-018</el-descriptions-item>
      <el-descriptions-item label="来源页面">工单受理</el-descriptions-item>
      <el-descriptions-item label="IP地址">192.168.1.100</el-descriptions-item>
      <el-descriptions-item label="操作内容" :span="2">受理工单，设备标记停飞</el-descriptions-item>
    </el-descriptions>

    <el-card class="mt-20px" header="变更前后对比">
      <div class="text-gray-400 py-20px text-center">变更前后 JSON Diff（待开发）</div>
    </el-card>

    <el-card class="mt-20px" header="责任链">
      <div class="text-gray-400 py-20px text-center">责任链追溯（待开发）</div>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'AuditLogDetail' })
</script>
