<template>
  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="mb-16px" @submit.prevent="handleQuery">
      <el-form-item label="搜索">
        <el-input v-model="queryParams.keyword" placeholder="备件名称 / 料号" clearable class="!w-200px" />
      </el-form-item>
      <el-form-item label="库存状态">
        <el-select v-model="stockStatus" placeholder="全部" clearable class="!w-120px">
          <el-option label="正常" value="normal" />
          <el-option label="低库存" value="low" />
          <el-option label="缺货" value="empty" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button v-if="canManageParts" type="primary" @click="$router.push('/inventory/inbound')">
        入库登记
      </el-button>
      <el-button v-if="canManageParts" @click="$router.push('/inventory/import')">批量导入</el-button>
    </div>

    <el-table v-loading="loading" :data="filteredList" stripe>
      <el-table-column label="料号" prop="itemCode" width="140" />
      <el-table-column label="备件名称" prop="itemName" width="180" />
      <el-table-column label="分类" prop="itemTypeName" width="100" />
      <el-table-column label="规格型号" prop="specification" width="140" />
      <el-table-column label="当前库存" prop="quantity" width="100">
        <template #default="{ row }">
          <span :class="row.minStock && row.quantity <= row.minStock ? 'text-red-500 font-bold' : ''">
            {{ row.quantity }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="安全库存" prop="minStock" width="100">
        <template #default="{ row }">
          {{ row.minStock ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="仓库" prop="warehouseName" width="120" />
      <el-table-column label="供应商" prop="vendorName" min-width="140">
        <template #default="{ row }">
          {{ row.vendorName ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

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
import { getMaterialStockPage, type MaterialStockVO } from '@/api/yian/inventory'
import { getCurrentYianAccess, hasYianPermission } from '@/utils/yian/access'

defineOptions({ name: 'InventoryStock' })

const { push } = useRouter()

const loading = ref(false)
const canManageParts = ref(false)
const stockList = ref<MaterialStockVO[]>([])
const total = ref(0)
const stockStatus = ref<string>()

const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  keyword: undefined as string | undefined,
  virtualFilter: 'exclude' as string | undefined
})

const filteredList = computed(() => {
  if (!stockStatus.value) return stockList.value
  return stockList.value.filter((row) => {
    if (stockStatus.value === 'empty') return row.quantity <= 0
    if (stockStatus.value === 'low') return row.minStock && row.quantity > 0 && row.quantity <= row.minStock
    if (stockStatus.value === 'normal') return !row.minStock || row.quantity > row.minStock
    return true
  })
})

const getList = async () => {
  loading.value = true
  try {
    const data = await getMaterialStockPage(queryParams)
    stockList.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const handleReset = () => {
  queryParams.keyword = undefined
  stockStatus.value = undefined
  queryParams.pageNo = 1
  getList()
}

const handleDetail = (id: number) => {
  push({ path: '/inventory/stock/detail', query: { id } })
}

onMounted(async () => {
  const access = await getCurrentYianAccess()
  canManageParts.value = hasYianPermission(access, 'parts', 'exec')
  await getList()
})

onActivated(() => {
  getList()
})
</script>
