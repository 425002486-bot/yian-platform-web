<template>
  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="mb-16px" @submit.prevent="handleQuery">
      <el-form-item label="单据编号">
        <el-input v-model="queryParams.issueCode" placeholder="领料单号/退料单号" clearable class="!w-180px" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="queryParams.actionType" placeholder="全部" clearable class="!w-120px">
          <el-option label="领料" value="pick" />
          <el-option label="退料" value="return" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="records" stripe>
      <el-table-column label="操作时间" prop="createTime" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="单据编号" prop="issueCode" width="160" />
      <el-table-column label="备件名称" prop="itemName" width="160" />
      <el-table-column label="料号" prop="itemCode" width="130" />
      <el-table-column label="动作" prop="actionType" width="80">
        <template #default="{ row }">
          <el-tag :type="row.actionType === '领料' ? 'danger' : 'success'" size="small">
            {{ row.actionType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" prop="quantity" width="80" />
      <el-table-column label="操作人" prop="operatorName" width="100" />
      <el-table-column label="结果" prop="resultStatus" width="100">
        <template #default="{ row }">
          <el-tag :type="row.resultStatus === '已出库' ? 'info' : 'success'" size="small">
            {{ row.resultStatus }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getPickReturnRecords, type PickReturnRecordVO } from '@/api/yian/inventory'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'InventoryPick' })

const loading = ref(false)
const records = ref<PickReturnRecordVO[]>([])

const queryParams = reactive({
  issueCode: undefined as string | undefined,
  actionType: undefined as string | undefined
})

const getList = async () => {
  loading.value = true
  try {
    records.value = await getPickReturnRecords(queryParams)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  getList()
}

const handleReset = () => {
  queryParams.issueCode = undefined
  queryParams.actionType = undefined
  getList()
}

onMounted(() => {
  getList()
})
</script>
