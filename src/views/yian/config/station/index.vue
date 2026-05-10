<template>
  <ContentWrap>
    <div class="mb-16px">
      <el-button type="primary">新增站点</el-button>
    </div>

    <el-table :data="stationList" stripe>
      <el-table-column label="站点名称" prop="name" width="180" />
      <el-table-column label="站点编码" prop="code" width="140" />
      <el-table-column label="负责人" prop="manager" width="100" />
      <el-table-column label="服务区域" prop="area" min-width="200" />
      <el-table-column label="在册设备" prop="deviceCount" width="100" />
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === '启用' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default>
          <el-button link type="primary">编辑</el-button>
          <el-button link type="primary">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'ConfigStation' })

const stationList = ref([
  { name: '华东运营中心', code: 'ST-HD-001', manager: '李站长', area: '上海、苏州、嘉兴', deviceCount: 45, status: '启用' },
  { name: '苏州工业园站', code: 'ST-SZ-002', manager: '刘站长', area: '苏州工业园区', deviceCount: 32, status: '启用' },
  { name: '嘉兴南湖站', code: 'ST-JX-003', manager: '陈站长', area: '嘉兴南湖区', deviceCount: 28, status: '启用' },
  { name: '杭州余杭站', code: 'ST-HZ-004', manager: '周站长', area: '杭州余杭区', deviceCount: 23, status: '启用' }
])
</script>
