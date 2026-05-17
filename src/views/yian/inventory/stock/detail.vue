<template>
  <ContentWrap v-loading="loading">
    <el-page-header @back="$router.push('/inventory/stock')" title="返回库存台账" content="库存详情" />

    <el-descriptions :column="2" border class="mt-20px" title="备件信息">
      <el-descriptions-item label="料号">{{ detail.itemCode }}</el-descriptions-item>
      <el-descriptions-item label="备件名称">{{ detail.itemName }}</el-descriptions-item>
      <el-descriptions-item label="分类">{{ detail.itemTypeName }}</el-descriptions-item>
      <el-descriptions-item label="规格型号">{{ detail.specification }}</el-descriptions-item>
      <el-descriptions-item label="计量单位">{{ detail.unitMeasureName }}</el-descriptions-item>
      <el-descriptions-item label="供应商">{{ detail.vendorName ?? '-' }}</el-descriptions-item>
    </el-descriptions>

    <el-descriptions :column="2" border class="mt-20px" title="库存信息">
      <el-descriptions-item label="当前库存">
        <span :class="detail.minStock && detail.quantity <= detail.minStock ? 'text-red-500 font-bold' : ''">
          {{ detail.quantity }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="安全库存">{{ detail.minStock ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="仓库">{{ detail.warehouseName }}</el-descriptions-item>
      <el-descriptions-item label="库区">{{ detail.locationName }}</el-descriptions-item>
      <el-descriptions-item label="库位">{{ detail.areaName }}</el-descriptions-item>
      <el-descriptions-item label="批次号">{{ detail.batchCode ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="入库时间">{{ formatDate(detail.receiptTime) }}</el-descriptions-item>
      <el-descriptions-item label="是否冻结">{{ detail.frozen ? '是' : '否' }}</el-descriptions-item>
    </el-descriptions>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getMaterialStock, type MaterialStockVO } from '@/api/yian/inventory'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'InventoryStockDetail' })

const { currentRoute } = useRouter()
const loading = ref(false)
const detail = ref<Partial<MaterialStockVO>>({})

const getDetail = async () => {
  const id = currentRoute.value.query.id as string
  if (!id) return
  loading.value = true
  try {
    detail.value = await getMaterialStock(Number(id))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getDetail()
})
</script>
