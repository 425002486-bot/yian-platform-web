<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1080px">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
    >
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="电池编号" prop="batteryCode">
            <el-input
              v-model="formData.batteryCode"
              placeholder="请输入电池编号"
              :disabled="formType !== 'create'"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="序列号" prop="serialNumber">
            <el-input v-model="formData.serialNumber" placeholder="请输入电池序列号 SN" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="型号" prop="model">
            <el-input v-model="formData.model" placeholder="请输入电池型号" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
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
          <el-form-item label="关联主机" prop="linkedDeviceId">
            <el-select
              v-model="formData.linkedDeviceId"
              placeholder="请选择关联主机"
              clearable
              filterable
              class="!w-1/1"
            >
              <el-option
                v-for="item in linkedDeviceOptions"
                :key="item.id"
                :label="`${item.code} / ${item.name}`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="健康状态" prop="healthStatus">
            <el-select v-model="formData.healthStatus" placeholder="请选择健康状态" class="!w-1/1">
              <el-option label="状态正常" value="normal" />
              <el-option label="寿命预警" value="warning" />
              <el-option label="禁止放行" value="danger" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="SOH" prop="soh">
            <el-input-number v-model="formData.soh" :min="0" :max="100" class="!w-1/1" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="循环次数" prop="cycleCount">
            <el-input-number v-model="formData.cycleCount" :min="0" class="!w-1/1" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="formData.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="submitForm">确定</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { MdWorkshopApi, type MdWorkshopVO } from '@/api/mes/md/workstation/workshop'
import {
  YianAssetApi,
  type AssetBatterySaveReqVO,
  type AssetBatteryVO
} from '@/api/yian/asset/backend'

defineOptions({ name: 'BatteryForm' })

type FormType = 'create' | 'update'

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = computed(() => (formType.value === 'create' ? '新增电池' : '编辑电池'))
const formLoading = ref(false)
const formType = ref<FormType>('create')

const formRef = ref()
const workshopOptions = ref<MdWorkshopVO[]>([])
const linkedDeviceOptions = ref<DvMachineryVO[]>([])

const createDefaultFormData = (): AssetBatterySaveReqVO => ({
  batteryCode: '',
  serialNumber: '',
  model: '',
  workshopId: undefined as unknown as number,
  linkedDeviceId: undefined,
  soh: 100,
  cycleCount: 0,
  healthStatus: 'normal',
  remark: ''
})

const formData = ref<AssetBatterySaveReqVO>(createDefaultFormData())

const normalizeIdentityValue = (value?: string) => String(value || '').trim().toUpperCase()

const formRules = reactive({
  batteryCode: [{ required: true, message: '电池编号不能为空', trigger: 'blur' }],
  serialNumber: [{ required: true, message: '序列号不能为空', trigger: 'blur' }],
  model: [{ required: true, message: '型号不能为空', trigger: 'blur' }],
  workshopId: [{ required: true, message: '所属站点不能为空', trigger: 'change' }],
  healthStatus: [{ required: true, message: '健康状态不能为空', trigger: 'change' }]
})

const fetchAllMachineryOptions = async () => {
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

const loadOptions = async () => {
  const [workshops, machineryList] = await Promise.all([
    MdWorkshopApi.getWorkshopSimpleList(),
    fetchAllMachineryOptions()
  ])
  workshopOptions.value = workshops
  linkedDeviceOptions.value = machineryList
}

const assertUniqueIdentity = async () => {
  const currentId = formData.value.id
  const nextCode = normalizeIdentityValue(formData.value.batteryCode)
  const nextSerialNumber = normalizeIdentityValue(formData.value.serialNumber)
  const batteryList = await YianAssetApi.getBatteryList()

  const duplicatedCode = batteryList.find(
    (item) => item.id !== currentId && normalizeIdentityValue(item.batteryCode) === nextCode
  )
  if (duplicatedCode) {
    throw new Error(`电池编号已存在：${formData.value.batteryCode}`)
  }

  const duplicatedSerialNumber = batteryList.find(
    (item) => item.id !== currentId && normalizeIdentityValue(item.serialNumber) === nextSerialNumber
  )
  if (duplicatedSerialNumber) {
    throw new Error(`电池 SN 已存在：${formData.value.serialNumber}`)
  }
}

const open = async (type: FormType, id?: number) => {
  dialogVisible.value = true
  formType.value = type
  resetForm()
  await loadOptions()
  if (!id) return
  formLoading.value = true
  try {
    const battery = (await YianAssetApi.getBattery(id)) as AssetBatteryVO
    formData.value = {
      id: battery.id,
      batteryCode: battery.batteryCode,
      serialNumber: battery.serialNumber,
      model: battery.model,
      workshopId: battery.workshopId,
      linkedDeviceId: battery.linkedDeviceId,
      soh: battery.soh,
      cycleCount: battery.cycleCount,
      healthStatus: battery.healthStatus || 'normal',
      remark: battery.remark || ''
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
    const payload: AssetBatterySaveReqVO = {
      ...formData.value,
      linkedDeviceId: formData.value.linkedDeviceId || undefined,
      remark: formData.value.remark?.trim() || undefined
    }

    if (formType.value === 'create') {
      await YianAssetApi.createBattery(payload)
      message.success(t('common.createSuccess'))
    } else {
      await YianAssetApi.updateBattery(payload)
      message.success(t('common.updateSuccess'))
    }

    dialogVisible.value = false
    emit('success')
  } catch (error: any) {
    message.error(error?.message || '电池保存失败')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = createDefaultFormData()
  formRef.value?.resetFields()
}
</script>
