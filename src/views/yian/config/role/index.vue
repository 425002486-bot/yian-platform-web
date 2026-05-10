<template>
  <ContentWrap>
    <div class="mb-16px">
      <el-button type="primary">新增角色</el-button>
    </div>

    <el-table :data="roleList" stripe>
      <el-table-column label="角色名称" prop="name" width="140" />
      <el-table-column label="角色标识" prop="code" width="140" />
      <el-table-column label="可见页面" prop="pages" min-width="300" />
      <el-table-column label="人数" prop="userCount" width="80" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default>
          <el-button link type="primary">编辑</el-button>
          <el-button link type="primary">权限</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'ConfigRole' })

const roleList = ref([
  { name: '站点负责人', code: 'site_manager', pages: '工作台、资产中心、工单中心、备件库存、审计日志、基础配置', userCount: 4 },
  { name: '维修工程师', code: 'engineer', pages: '工作台、资产中心(查看)、工单中心(受理/初诊/维修)、备件库存(查看)', userCount: 12 },
  { name: '放行审核人', code: 'reviewer', pages: '工作台、资产中心(查看)、工单中心(放行审核)、审计日志(查看)', userCount: 3 },
  { name: '仓库管理员', code: 'warehouse', pages: '备件库存(全部)、工单中心(领料)', userCount: 2 },
  { name: '审计人员', code: 'auditor', pages: '审计日志(全部)、资产中心(查看)、工单中心(查看)', userCount: 1 }
])
</script>
