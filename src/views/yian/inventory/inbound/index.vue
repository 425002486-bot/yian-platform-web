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
        <el-select v-model="formData.inboundType" placeholder="选择入库类型" class="!w-100%">
          <el-option label="采购到货" value="purchase" />
          <el-option label="返修回库" value="repair_return" />
          <el-option label="退料入库" value="pick_return" />
        </el-select>
      </el-form-item>

      <el-form-item label="备件" prop="itemId">
        <div class="!w-100%">
          <el-select
            v-model="formData.itemId"
            placeholder="搜索备件名称或料号"
            filterable
            remote
            clearable
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
          <div
            class="mt-8px flex items-center justify-between text-12px text-[var(--el-text-color-secondary)]"
          >
            <span>找不到备件时，可先新建主数据，再继续完成本次入库。</span>
            <el-button link type="primary" @click="openCreateItemDialog">新增备件</el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="料号">
        <el-input :model-value="selectedItemCode" disabled placeholder="选择备件后自动带出料号" />
      </el-form-item>

      <el-form-item label="规格型号">
        <el-input :model-value="selectedItemSpec" disabled placeholder="选择备件后自动带出规格型号" />
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
        <el-input v-model="formData.batchCode" placeholder="输入批次号，便于后续追溯" />
      </el-form-item>

      <el-form-item label="入库备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="补充本次入库说明"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认入库</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>

    <el-dialog
      v-model="createItemDialogVisible"
      title="新增备件"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="createItemFormRef"
        :model="createItemForm"
        :rules="createItemRules"
        label-width="100px"
      >
        <el-form-item label="备件编码" prop="code">
          <el-input v-model="createItemForm.code" placeholder="自动生成，也可手动调整">
            <template #append>
              <el-button @click="generateItemCode">生成</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="备件名称" prop="name">
          <el-input v-model="createItemForm.name" placeholder="请输入备件名称" />
        </el-form-item>

        <el-form-item label="规格型号" prop="specification">
          <el-input v-model="createItemForm.specification" placeholder="请输入规格型号" />
        </el-form-item>

        <el-form-item label="备件分类" prop="itemTypeId">
          <el-select
            v-model="createItemForm.itemTypeId"
            placeholder="请选择备件分类"
            filterable
            class="!w-100%"
          >
            <el-option
              v-for="itemType in itemTypeOptions"
              :key="itemType.id"
              :label="itemType.name"
              :value="itemType.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="计量单位" prop="unitMeasureId">
          <el-select
            v-model="createItemForm.unitMeasureId"
            placeholder="请选择计量单位"
            filterable
            class="!w-100%"
          >
            <el-option
              v-for="unit in unitMeasureOptions"
              :key="unit.id"
              :label="unit.name"
              :value="unit.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="createItemForm.remark"
            type="textarea"
            :rows="3"
            placeholder="补充备件主数据说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCreateItemDialog">取消</el-button>
        <el-button type="primary" :loading="createItemSubmitting" @click="handleCreateItem">
          保存并带回
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { submitInbound, getItemSimpleList, getVendorSimpleList } from '@/api/yian/inventory'
import { MdItemApi, type MdItemVO } from '@/api/mes/md/item'
import { MdItemTypeApi } from '@/api/mes/md/item/type'
import { MdUnitMeasureApi } from '@/api/mes/md/unitmeasure'
import { config } from '@/config/axios/config'
import { getAccessToken, getTenantId, getVisitTenantId } from '@/utils/auth'
import { CommonStatusEnum } from '@/utils/constants'
import { MesAutoCodeRuleCode, MesItemOrProductEnum } from '@/views/mes/utils/constants'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'InventoryInbound' })

type ItemSimpleOption = {
  id: number
  code: string
  name: string
  specification?: string
}

type ItemTypeSimpleOption = {
  id: number
  name: string
  itemOrProduct?: string
}

type UnitMeasureSimpleOption = {
  id: number
  name: string
}

const { push } = useRouter()
const message = useMessage()

const formRef = ref<FormInstance>()
const createItemFormRef = ref<FormInstance>()
const submitting = ref(false)
const createItemSubmitting = ref(false)
const createItemDialogVisible = ref(false)

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

const itemOptions = ref<ItemSimpleOption[]>([])
const itemLoading = ref(false)
const itemSearchKeyword = ref('')
const selectedItemCode = ref('')
const selectedItemSpec = ref('')

const createItemForm = reactive({
  code: '',
  name: '',
  specification: '',
  itemTypeId: undefined as number | undefined,
  unitMeasureId: undefined as number | undefined,
  remark: ''
})

const createItemRules: FormRules = {
  code: [{ required: true, message: '请输入备件编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入备件名称', trigger: 'blur' }],
  itemTypeId: [{ required: true, message: '请选择备件分类', trigger: 'change' }],
  unitMeasureId: [{ required: true, message: '请选择计量单位', trigger: 'change' }]
}

const itemTypeOptions = ref<ItemTypeSimpleOption[]>([])
const unitMeasureOptions = ref<UnitMeasureSimpleOption[]>([])
const vendorOptions = ref<any[]>([])

const resetSelectedItem = () => {
  selectedItemCode.value = ''
  selectedItemSpec.value = ''
}

const handleItemSearch = async (keyword: string) => {
  itemSearchKeyword.value = keyword.trim()
  itemLoading.value = true
  try {
    itemOptions.value = await getItemSimpleList(itemSearchKeyword.value)
  } finally {
    itemLoading.value = false
  }
}

const handleItemChange = (itemId?: number) => {
  if (!itemId) {
    resetSelectedItem()
    return
  }
  const item = itemOptions.value.find((candidate) => candidate.id === itemId)
  if (!item) {
    resetSelectedItem()
    return
  }
  selectedItemCode.value = item.code
  selectedItemSpec.value = item.specification || ''
}

const loadVendors = async () => {
  vendorOptions.value = await getVendorSimpleList()
}

const loadItemTypes = async () => {
  itemTypeOptions.value = await MdItemTypeApi.getItemTypeSimpleList()
}

const loadUnitMeasures = async () => {
  unitMeasureOptions.value = await MdUnitMeasureApi.getUnitMeasureSimpleList()
}

const loadInitialData = async () => {
  await Promise.all([handleItemSearch(''), loadVendors(), loadItemTypes(), loadUnitMeasures()])
}

const buildFallbackItemCode = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `SP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const requestAutoCodeSilently = async (ruleCode: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const accessToken = getAccessToken()
  const tenantId = getTenantId()
  const visitTenantId = getVisitTenantId()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  if (tenantId !== undefined && tenantId !== null) {
    headers['tenant-id'] = String(tenantId)
  }
  if (visitTenantId !== undefined && visitTenantId !== null) {
    headers['visit-tenant-id'] = String(visitTenantId)
  }

  try {
    const response = await fetch(`${config.base_url}/mes/md/auto-code-record/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ruleCode })
    })
    if (!response.ok) {
      return null
    }
    const payload = await response.json()
    if (payload?.code !== 0 && payload?.code !== 200) {
      return null
    }
    return payload?.data ? String(payload.data) : null
  } catch {
    return null
  }
}

const generateItemCode = async () => {
  const generatedCode = await requestAutoCodeSilently(MesAutoCodeRuleCode.MD_ITEM_CODE)
  if (generatedCode) {
    createItemForm.code = generatedCode
    return
  }
  createItemForm.code = buildFallbackItemCode()
  message.warning('系统未配置备件自动编码规则，已为你生成临时编码，可直接保存或手动调整')
}

const resetCreateItemForm = () => {
  createItemForm.code = ''
  createItemForm.name = ''
  createItemForm.specification = ''
  createItemForm.itemTypeId = undefined
  createItemForm.unitMeasureId = undefined
  createItemForm.remark = ''
  createItemFormRef.value?.resetFields()
}

const openCreateItemDialog = async () => {
  resetCreateItemForm()
  createItemDialogVisible.value = true
  createItemForm.name = itemSearchKeyword.value
  await nextTick()
  await generateItemCode()
}

const closeCreateItemDialog = () => {
  createItemDialogVisible.value = false
  resetCreateItemForm()
}

const handleCreateItem = async () => {
  await createItemFormRef.value?.validate()
  const selectedType = itemTypeOptions.value.find((itemType) => itemType.id === createItemForm.itemTypeId)
  const payload: MdItemVO = {
    id: 0,
    code: createItemForm.code.trim(),
    name: createItemForm.name.trim(),
    specification: createItemForm.specification.trim(),
    unitMeasureId: createItemForm.unitMeasureId!,
    itemTypeId: createItemForm.itemTypeId!,
    itemOrProduct: selectedType?.itemOrProduct || MesItemOrProductEnum.ITEM.value,
    status: CommonStatusEnum.ENABLE,
    safeStockFlag: false,
    minStock: 0,
    maxStock: 0,
    highValue: false,
    batchFlag: true,
    remark: createItemForm.remark.trim()
  }

    createItemSubmitting.value = true
    try {
      const createdId = await MdItemApi.createItem(payload)
      await MdItemApi.updateItemStatus(createdId, CommonStatusEnum.ENABLE)
      const createdItem: ItemSimpleOption = {
        id: createdId,
        code: payload.code,
        name: payload.name,
      specification: payload.specification
    }
    itemOptions.value = [createdItem, ...itemOptions.value.filter((item) => item.id !== createdId)]
    formData.itemId = createdId
    handleItemChange(createdId)
    message.success('备件主数据已创建，可继续完成入库')
    createItemDialogVisible.value = false
    resetCreateItemForm()
  } finally {
    createItemSubmitting.value = false
  }
}

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
