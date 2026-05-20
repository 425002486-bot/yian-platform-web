<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1080px">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
      :disabled="isDetail"
    >
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="设备编号" prop="code">
            <el-input
              v-model="formData.code"
              placeholder="请输入设备编号"
              :disabled="formType !== 'create'"
            >
              <template v-if="formType === 'create'" #append>
                <el-button @click="generateCode">生成</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="序列号" prop="serialNumber">
            <el-input v-model="formData.serialNumber" placeholder="请输入设备序列号 SN" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="设备名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入设备名称" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="设备类型" prop="machineryTypeId">
            <DvMachineryTypeSelect
              v-model="formData.machineryTypeId"
              @change="handleMachineryTypeChange"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="所属站点" prop="workshopId">
            <el-select v-model="formData.workshopId" placeholder="请选择所属站点" class="!w-1/1">
              <el-option
                v-for="item in workshopOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="责任人" prop="ownerName">
            <el-input v-model="formData.ownerName" placeholder="请输入责任人" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="启用状态" prop="enableStatus">
            <el-select v-model="formData.enableStatus" placeholder="请选择启用状态" class="!w-1/1">
              <el-option
                v-for="item in ASSET_DEVICE_ENABLE_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="品牌" prop="brand">
            <el-input v-model="formData.brand" placeholder="请输入品牌" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="规格型号" prop="specification">
            <el-input v-model="formData.specification" placeholder="请输入规格型号" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row v-if="showStandardBatteryField" :gutter="16">
        <el-col :span="24">
          <el-form-item label="标配电池 SN" prop="standardBatteryCodes">
            <el-select
              v-model="formData.standardBatteryCodes"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="录入或选择标配电池 SN"
              class="!w-1/1"
            >
              <el-option
                v-for="item in batteryOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col v-if="isDetail" :span="8">
          <el-form-item label="最近点检时间">
            <el-date-picker
              v-model="formData.lastCheckTime"
              type="datetime"
              value-format="x"
              class="!w-1/1"
              disabled
            />
          </el-form-item>
        </el-col>
        <el-col v-if="isDetail" :span="8">
          <el-form-item label="最近保养时间">
            <el-date-picker
              v-model="formData.lastMaintenTime"
              type="datetime"
              value-format="x"
              class="!w-1/1"
              disabled
            />
          </el-form-item>
        </el-col>
        <el-col v-if="isDetail" :span="8">
          <el-form-item label="建档附件数">
            <el-input :model-value="String(documentCount)" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input type="textarea" v-model="formData.remark" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button v-if="!isDetail" @click="submitForm" type="primary" :disabled="formLoading">
        确定
      </el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import type { DvMachineryTypeVO } from '@/api/mes/dv/machinery/type'
import { MdWorkshopApi, type MdWorkshopVO } from '@/api/mes/md/workstation/workshop'
import {
  ASSET_DEVICE_ENABLE_STATUS_OPTIONS,
  getMachineryStatusByEnableStatus,
  listDeviceBatteryOptions,
  resolveAssetDeviceMasterRecord,
  saveAssetDeviceMasterRecord,
  type AssetDeviceEnableStatus
} from '@/api/yian/asset/deviceMaster'
import DvMachineryTypeSelect from '@/views/mes/dv/machinery/type/components/DvMachineryTypeSelect.vue'
import { MesAutoCodeRuleCode } from '@/views/mes/utils/constants'
import { AutoCodeRecordApi } from '@/api/mes/md/autocode/record'

defineOptions({ name: 'MachineryForm' })

const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'

type MachineryFormData = {
  id?: number
  code?: string
  serialNumber: string
  name?: string
  brand?: string
  specification?: string
  machineryTypeId?: number
  machineryTypeName?: string
  workshopId?: number
  workshopName?: string
  ownerName: string
  enableStatus: AssetDeviceEnableStatus
  standardBatteryCodes: string[]
  lastCheckTime?: string | number
  lastMaintenTime?: string | number
  remark?: string
}

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const formLoading = ref(false)
const formType = ref<'create' | 'update' | 'detail'>('create')
const isDetail = computed(() => formType.value === 'detail')
const dialogTitle = computed(() => {
  const titles = {
    create: '新增设备',
    update: '编辑设备',
    detail: '查看设备'
  }
  return titles[formType.value]
})

const formRef = ref()
const workshopOptions = ref<MdWorkshopVO[]>([])
const batteryOptions = computed(() => listDeviceBatteryOptions())
const previousCode = ref('')
const documentCount = ref(0)

const createDefaultFormData = (): MachineryFormData => ({
  id: undefined,
  code: '',
  serialNumber: '',
  name: '',
  brand: '',
  specification: '',
  machineryTypeId: undefined,
  machineryTypeName: '',
  workshopId: undefined,
  workshopName: '',
  ownerName: '',
  enableStatus: 'enabled',
  standardBatteryCodes: [],
  lastCheckTime: undefined,
  lastMaintenTime: undefined,
  remark: ''
})

const formData = ref<MachineryFormData>(createDefaultFormData())
const showStandardBatteryField = computed(
  () => formData.value.machineryTypeName === AIRCRAFT_MACHINERY_TYPE_NAME
)

const normalizeIdentityValue = (value?: string) => String(value || '').trim().toUpperCase()

const formRules = reactive({
  code: [{ required: true, message: '设备编号不能为空', trigger: 'blur' }],
  serialNumber: [{ required: true, message: '序列号不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '设备名称不能为空', trigger: 'blur' }],
  machineryTypeId: [{ required: true, message: '设备类型不能为空', trigger: 'change' }],
  workshopId: [{ required: true, message: '所属站点不能为空', trigger: 'change' }],
  ownerName: [{ required: true, message: '责任人不能为空', trigger: 'blur' }],
  enableStatus: [{ required: true, message: '启用状态不能为空', trigger: 'change' }]
})

const loadWorkshopOptions = async () => {
  workshopOptions.value = await MdWorkshopApi.getWorkshopSimpleList()
}

const syncWorkshopMeta = () => {
  const current = workshopOptions.value.find((item) => item.id === formData.value.workshopId)
  formData.value.workshopName = current?.name || ''
  if (!formData.value.ownerName && current?.chargeUserName) {
    formData.value.ownerName = current.chargeUserName
  }
}

const handleMachineryTypeChange = (item?: DvMachineryTypeVO) => {
  formData.value.machineryTypeName = item?.name || ''
}

watch(
  () => formData.value.workshopId,
  () => {
    syncWorkshopMeta()
  }
)

watch(
  () => showStandardBatteryField.value,
  (visible) => {
    if (!visible && formData.value.standardBatteryCodes.length > 0) {
      formData.value.standardBatteryCodes = []
    }
  }
)

const generateCode = async () => {
  formData.value.code = await AutoCodeRecordApi.generateAutoCode(
    MesAutoCodeRuleCode.DV_MACHINERY_CODE
  )
}

const fetchAllMachineryList = async () => {
  const pageSize = 200
  let pageNo = 1
  let total = 0
  const allList: DvMachineryVO[] = []

  do {
    const data = await DvMachineryApi.getMachineryPage({ pageNo, pageSize })
    const list = data.list || []
    total = Number(data.total || list.length || 0)
    allList.push(...list)
    if (list.length < pageSize) break
    pageNo += 1
  } while (allList.length < total)

  return allList
}

const assertUniqueIdentity = async () => {
  const currentId = formData.value.id
  const nextCode = normalizeIdentityValue(formData.value.code)
  const nextSerialNumber = normalizeIdentityValue(formData.value.serialNumber)
  const list = await fetchAllMachineryList()

  const duplicatedCode = list.find(
    (item) => item.id !== currentId && normalizeIdentityValue(item.code) === nextCode
  )
  if (duplicatedCode) {
    throw new Error(`设备编号已存在：${formData.value.code}`)
  }

  const duplicatedSerialNumber = list.find((item) => {
    if (item.id === currentId) return false
    const assetRecord = resolveAssetDeviceMasterRecord(item)
    return normalizeIdentityValue(assetRecord.serialNumber) === nextSerialNumber
  })
  if (duplicatedSerialNumber) {
    throw new Error(`设备 SN 已存在：${formData.value.serialNumber}`)
  }
}

const open = async (type: 'create' | 'update' | 'detail', id?: number) => {
  dialogVisible.value = true
  formType.value = type
  resetForm()
  await loadWorkshopOptions()
  if (!id) return
  formLoading.value = true
  try {
    const machinery = await DvMachineryApi.getMachinery(id)
    const assetRecord = resolveAssetDeviceMasterRecord(machinery)
    previousCode.value = machinery.code || ''
    documentCount.value = assetRecord.documents.length
    formData.value = {
      id: machinery.id,
      code: machinery.code,
      serialNumber: assetRecord.serialNumber,
      name: machinery.name,
      brand: machinery.brand,
      specification: machinery.specification,
      machineryTypeId: machinery.machineryTypeId,
      machineryTypeName: machinery.machineryTypeName,
      workshopId: machinery.workshopId,
      workshopName: assetRecord.siteName,
      ownerName: assetRecord.ownerName,
      enableStatus: assetRecord.enableStatus,
      standardBatteryCodes: [...assetRecord.standardBatteryCodes],
      lastCheckTime: machinery.lastCheckTime,
      lastMaintenTime: machinery.lastMaintenTime,
      remark: machinery.remark
    }
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  await formRef.value.validate()
  formLoading.value = true
  try {
    await assertUniqueIdentity()
    const standardBatteryCodes = showStandardBatteryField.value
      ? [...formData.value.standardBatteryCodes]
      : []

    const payload: DvMachineryVO = {
      id: formData.value.id as number,
      code: formData.value.code || '',
      name: formData.value.name || '',
      brand: formData.value.brand || '',
      specification: formData.value.specification || '',
      machineryTypeId: formData.value.machineryTypeId as number,
      machineryTypeName: formData.value.machineryTypeName || '',
      workshopId: formData.value.workshopId as number,
      workshopName:
        workshopOptions.value.find((item) => item.id === formData.value.workshopId)?.name ||
        formData.value.workshopName ||
        '',
      status: getMachineryStatusByEnableStatus(formData.value.enableStatus),
      lastMaintenTime: formData.value.lastMaintenTime as Date,
      lastCheckTime: formData.value.lastCheckTime as Date,
      remark: formData.value.remark || ''
    }

    if (formType.value === 'create') {
      await DvMachineryApi.createMachinery(payload)
      message.success(t('common.createSuccess'))
    } else {
      await DvMachineryApi.updateMachinery(payload)
      message.success(t('common.updateSuccess'))
    }

    saveAssetDeviceMasterRecord(payload, {
      previousCode: previousCode.value || undefined,
      code: formData.value.code || '',
      serialNumber: formData.value.serialNumber,
      siteName: payload.workshopName || '待补录',
      ownerName: formData.value.ownerName,
      enableStatus: formData.value.enableStatus,
      standardBatteryCodes
    })

    dialogVisible.value = false
    emit('success')
  } catch (error: any) {
    message.error(error?.message || '设备保存失败')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  previousCode.value = ''
  documentCount.value = 0
  formData.value = createDefaultFormData()
  formRef.value?.resetFields()
}
</script>
