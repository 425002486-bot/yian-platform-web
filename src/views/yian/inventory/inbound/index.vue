<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/inventory/stock')" title="返回库存列表" content="入库登记" />

    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      class="mt-20px max-w-800px"
    >
      <el-form-item label="入库类型" prop="inboundType">
        <el-select v-model="formData.inboundType" placeholder="选择类型" class="!w-100%">
          <el-option label="采购到货" value="purchase" />
          <el-option label="返修回库" value="repair_return" />
          <el-option label="退料入库" value="pick_return" />
        </el-select>
      </el-form-item>

      <el-form-item label="备件" prop="itemId">
        <el-select
          v-model="formData.itemId"
          placeholder="搜索备件名称或料号"
          filterable
          remote
          :remote-method="handleItemSearch"
          :loading="itemLoading"
          class="!w-100%"
          @change="handleItemChange"
        >
          <el-option
            v-for="item in itemOptions"
            :key="item.id"
            :label="`${item.code} ${item.name}`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="料号">
        <el-input :model-value="selectedItemCode" disabled placeholder="选择备件后自动填充" />
      </el-form-item>

      <el-form-item label="规格型号">
        <el-input :model-value="selectedItemSpec" disabled placeholder="选择备件后自动填充" />
      </el-form-item>

      <el-form-item label="供应商" prop="vendorId">
        <el-select v-model="formData.vendorId" placeholder="选择供应商" clearable class="!w-100%">
          <el-option
            v-for="vendor in vendorOptions"
            :key="vendor.id"
            :label="vendor.name"
            :value="vendor.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="入库数量" prop="quantity">
        <el-input-number v-model="formData.quantity" :min="1" :precision="0" class="!w-200px" />
      </el-form-item>

      <el-form-item label="批次号" prop="batchCode">
        <el-input v-model="formData.batchCode" placeholder="输入批次号（建议填写，用于追溯）" />
      </el-form-item>

      <el-form-item label="入库备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="入库备注说明"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认入库</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { submitInbound, getItemSimpleList, getVendorSimpleList } from '@/api/yian/inventory'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'InventoryInbound' })

const { push } = useRouter()
const message = useMessage()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const formData = reactive({
  inboundType: undefined as string | undefined,
  itemId: undefined as number | undefined,
  quantity: 1,
  vendorId: undefined as number | undefined,
  batchCode: undefined as string | undefined,
  remark: undefined as string | undefined
})

const formRules: FormRules = {
  inboundType: [{ required: true, message: '请选择入库类型', trigger: 'change' }],
  itemId: [{ required: true, message: '请选择备件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入入库数量', trigger: 'blur' }]
}

// 备件下拉
const itemOptions = ref<any[]>([])
const itemLoading = ref(false)
const selectedItemCode = ref('')
const selectedItemSpec = ref('')

const handleItemSearch = async (keyword: string) => {
  itemLoading.value = true
  try {
    itemOptions.value = await getItemSimpleList(keyword)
  } finally {
    itemLoading.value = false
  }
}

const handleItemChange = (itemId: number) => {
  const item = itemOptions.value.find((i) => i.id === itemId)
  if (item) {
    selectedItemCode.value = item.code
    selectedItemSpec.value = item.specification || ''
  } else {
    selectedItemCode.value = ''
    selectedItemSpec.value = ''
  }
}

// 供应商下拉
const vendorOptions = ref<any[]>([])

const loadVendors = async () => {
  vendorOptions.value = await getVendorSimpleList()
}

// 初始加载备件和供应商
const loadInitialData = async () => {
  await Promise.all([handleItemSearch(''), loadVendors()])
}

// 提交入库
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await submitInbound({
      inboundType: formData.inboundType!,
      itemId: formData.itemId!,
      quantity: formData.quantity,
      vendorId: formData.vendorId,
      batchCode: formData.batchCode,
      remark: formData.remark
    })
    message.success('入库成功')
    push('/inventory/stock')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadInitialData()
})
</script>
