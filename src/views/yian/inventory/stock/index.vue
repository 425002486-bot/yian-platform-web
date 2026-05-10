<template>
  <ContentWrap>
    <el-form :inline="true" class="mb-16px">
      <el-form-item label="搜索">
        <el-input placeholder="备件名称 / 料号" clearable class="!w-200px" />
      </el-form-item>
      <el-form-item label="库存状态">
        <el-select placeholder="全部" clearable class="!w-120px">
          <el-option label="正常" value="normal" />
          <el-option label="低库存" value="low" />
          <el-option label="缺货" value="empty" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">查询</el-button>
        <el-button>重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button type="primary" @click="$router.push('/inventory/inbound')">入库登记</el-button>
      <el-button @click="$router.push('/inventory/import')">批量导入</el-button>
    </div>

    <el-table :data="stockList" stripe>
      <el-table-column label="料号" prop="partNo" width="140" />
      <el-table-column label="备件名称" prop="name" width="180" />
      <el-table-column label="分类" prop="category" width="100" />
      <el-table-column label="适配机型" prop="models" width="140" />
      <el-table-column label="当前库存" prop="stock" width="100">
        <template #default="{ row }">
          <span :class="row.stock <= row.safetyStock ? 'text-red-500 font-bold' : ''">{{ row.stock }}</span>
        </template>
      </el-table-column>
      <el-table-column label="安全库存" prop="safetyStock" width="100" />
      <el-table-column label="供应商" prop="supplier" min-width="140" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default>
          <el-button link type="primary">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'InventoryStock' })

const stockList = ref([
  { partNo: 'SP-BLD-001', name: '标准桨叶套装', category: '桨叶', models: 'M350 RTK', stock: 4, safetyStock: 10, supplier: 'DJI官方' },
  { partNo: 'SP-MTR-002', name: '电机总成', category: '动力', models: 'M300/M350', stock: 6, safetyStock: 4, supplier: 'DJI官方' },
  { partNo: 'SP-DMP-003', name: '减震球', category: '结构', models: '通用', stock: 22, safetyStock: 20, supplier: '第三方' },
  { partNo: 'SP-GPS-004', name: 'GPS模块', category: '导航', models: 'M350 RTK', stock: 2, safetyStock: 3, supplier: 'DJI官方' }
])
</script>
