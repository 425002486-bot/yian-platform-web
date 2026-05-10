<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="站点">
        <el-select placeholder="全部站点" clearable class="!w-160px">
          <el-option label="华东运营中心" :value="1" />
          <el-option label="苏州工业园站" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="角色">
        <el-select placeholder="全部角色" clearable class="!w-140px">
          <el-option label="站点负责人" value="site_manager" />
          <el-option label="维修工程师" value="engineer" />
          <el-option label="放行审核人" value="reviewer" />
          <el-option label="仓库管理员" value="warehouse" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button type="primary">新增人员</el-button>
    </div>

    <el-table :data="peopleList" stripe>
      <el-table-column label="姓名" prop="name" width="100" />
      <el-table-column label="工号" prop="empNo" width="120" />
      <el-table-column label="角色" prop="role" width="120" />
      <el-table-column label="所属站点" prop="station" width="140" />
      <el-table-column label="可参与环节" prop="stages" min-width="200" />
      <el-table-column label="手机" prop="phone" width="140" />
      <el-table-column label="状态" prop="status" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === '在职' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default>
          <el-button link type="primary">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'ConfigPeople' })

const peopleList = ref([
  { name: '张工', empNo: 'EMP-001', role: '维修工程师', station: '华东运营中心', stages: '受理、初诊、维修', phone: '138****1234', status: '在职' },
  { name: '李工', empNo: 'EMP-002', role: '维修工程师', station: '苏州工业园站', stages: '受理、初诊、维修', phone: '139****5678', status: '在职' },
  { name: '王工', empNo: 'EMP-003', role: '放行审核人', station: '华东运营中心', stages: '复检、放行', phone: '137****9012', status: '在职' },
  { name: '李站长', empNo: 'EMP-004', role: '站点负责人', station: '华东运营中心', stages: '全流程', phone: '136****3456', status: '在职' }
])
</script>
