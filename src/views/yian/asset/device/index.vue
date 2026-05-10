<template>
  <ContentWrap>
    <!-- 搜索栏 -->
    <el-form :model="queryParams" ref="queryFormRef" :inline="true" class="mb-16px">
      <el-form-item label="设备编号/SN" prop="keyword">
        <el-input v-model="queryParams.keyword" placeholder="搜索设备编号 / SN / 机型" clearable class="!w-240px" />
      </el-form-item>
      <el-form-item label="站点" prop="siteId">
        <el-select v-model="queryParams.siteId" placeholder="全部站点" clearable class="!w-160px">
          <el-option label="华东运营中心" :value="1" />
          <el-option label="苏州工业园站" :value="2" />
          <el-option label="嘉兴南湖站" :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="!w-120px">
          <el-option label="启用" value="active" />
          <el-option label="待检" value="pending" />
          <el-option label="维修中" value="repairing" />
          <el-option label="停飞" value="grounded" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery"><Icon icon="ep:search" class="mr-4px" />查询</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-4px" />重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="mb-16px flex justify-between">
      <div>
        <el-button type="primary" @click="handleCreate"><Icon icon="ep:plus" class="mr-4px" />单个录入</el-button>
        <el-button @click="handleImport"><Icon icon="ep:upload" class="mr-4px" />批量导入</el-button>
      </div>
      <el-button @click="handleExport"><Icon icon="ep:download" class="mr-4px" />导出</el-button>
    </div>

    <!-- 设备列表 -->
    <el-table :data="deviceList" stripe>
      <el-table-column label="设备编号" prop="deviceNo" width="160" />
      <el-table-column label="序列号" prop="serialNo" width="180" />
      <el-table-column label="机型" prop="model" width="140" />
      <el-table-column label="站点" prop="siteName" width="140" />
      <el-table-column label="责任人" prop="ownerName" width="100" />
      <el-table-column label="状态" prop="status" width="160">
        <template #default="{ row }">
          <el-tooltip :content="row.statusReason" placement="top">
            <el-tag :type="statusTagType(row.status)">{{ row.statusLabel }}</el-tag>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="资料解析" prop="parseSummary" min-width="200" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
          <el-button link type="primary" @click="handleHistory(row)">履历</el-button>
          <el-button link type="primary" v-if="row.hasActiveWorkorder" @click="handleWorkorders(row)">关联工单</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="mt-16px"
      :total="total"
      v-model:current-page="queryParams.pageNo"
      v-model:page-size="queryParams.pageSize"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
    />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'

defineOptions({ name: 'AssetDevice' })

const queryParams = reactive({
  keyword: '',
  siteId: undefined,
  status: undefined,
  pageNo: 1,
  pageSize: 20
})

const total = ref(0)

// Mock 数据 - 后续替换为 API 调用
const deviceList = ref([
  { deviceNo: 'DJI-M350-0027', serialNo: '1ZNBJ8K00C00YK', model: 'M350 RTK', siteName: '华东运营中心', ownerName: '张工', status: 'grounded', statusLabel: '停飞', statusReason: '飞控异常，待放行审核', parseSummary: '适航证 有效 | 校准 临期', hasActiveWorkorder: true },
  { deviceNo: 'DJI-M300-0015', serialNo: '1ZNBJ7H00B00XM', model: 'M300 RTK', siteName: '苏州工业园站', ownerName: '李工', status: 'repairing', statusLabel: '维修中', statusReason: '工单 WO-0502-012 待领料', parseSummary: '适航证 有效 | 校准 正常', hasActiveWorkorder: true },
  { deviceNo: 'DJI-M30T-0042', serialNo: '1ZNBJ9M00D00ZP', model: 'M30T', siteName: '嘉兴南湖站', ownerName: '王工', status: 'active', statusLabel: '启用', statusReason: '正常运行', parseSummary: '适航证 有效 | 校准 正常', hasActiveWorkorder: false },
  { deviceNo: 'DJI-M350-0033', serialNo: '1ZNBJ8K00C00YR', model: 'M350 RTK', siteName: '华东运营中心', ownerName: '赵工', status: 'pending', statusLabel: '待检', statusReason: '保养临期，7日内到期', parseSummary: '适航证 有效 | 校准 临期', hasActiveWorkorder: false }
])

const statusTagType = (status: string) => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', repairing: 'primary', grounded: 'danger' }
  return map[status] || 'info'
}

const handleQuery = () => { /* TODO */ }
const resetQuery = () => { queryParams.keyword = ''; queryParams.siteId = undefined; queryParams.status = undefined }
const handleCreate = () => { /* TODO: router push */ }
const handleImport = () => { /* TODO: router push */ }
const handleExport = () => { /* TODO */ }
const handleDetail = (row: any) => { /* TODO: router push */ }
const handleHistory = (row: any) => { /* TODO: router push */ }
const handleWorkorders = (row: any) => { /* TODO: router push */ }
</script>
