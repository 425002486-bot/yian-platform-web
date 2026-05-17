<template>
  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="mb-16px" @submit.prevent="handleQuery">
      <el-form-item label="操作对象">
        <el-select v-model="queryParams.objectType" placeholder="全部" clearable class="!w-120px">
          <el-option label="设备" value="device" />
          <el-option label="工单" value="workorder" />
          <el-option label="备件" value="spare" />
          <el-option label="放行" value="release" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人">
        <el-input v-model="queryParams.operatorName" placeholder="操作人" clearable class="!w-140px" />
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="queryParams.createTime"
          type="daterange"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DD HH:mm:ss"
          :default-time="[new Date('1970-1-1 00:00:00'), new Date('1970-1-1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="logList" stripe>
      <el-table-column label="操作时间" prop="createTime" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作人" prop="userName" width="100" />
      <el-table-column label="操作对象" prop="objectType" width="100" />
      <el-table-column label="对象标识" prop="bizId" width="160" />
      <el-table-column label="操作内容" prop="action" min-width="250" />
      <el-table-column label="来源页面" prop="sourcePage" width="140" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      v-model:current-page="queryParams.pageNo"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="mt-16px justify-end"
      @size-change="getList"
      @current-change="getList"
    />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getAuditLogPage, type AuditLogVO } from '@/api/yian/audit'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'AuditLog' })

const { push } = useRouter()

const loading = ref(false)
const logList = ref<AuditLogVO[]>([])
const total = ref(0)

const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  objectType: undefined as string | undefined,
  operatorName: undefined as string | undefined,
  createTime: undefined as string[] | undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await getAuditLogPage(queryParams)
    logList.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const handleDetail = (id: number) => {
  push({ path: '/audit/detail', query: { id } })
}

onMounted(() => {
  getList()
})
</script>
