<template>
  <ContentWrap>
    <el-page-header
      @back="router.push('/workorder/list')"
      title="返回工单列表"
      content="新建工单"
    />

    <el-card class="mt-20px max-w-900px" shadow="never">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="关联设备" prop="deviceId">
          <el-select
            v-model="form.deviceId"
            placeholder="选择设备"
            filterable
            class="!w-100%"
            :loading="deviceLoading"
            @change="handleDeviceChange"
          >
            <el-option
              v-for="item in deviceOptions"
              :key="item.id"
              :label="`${item.code} / ${item.name}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="报修来源" prop="source">
          <el-select v-model="form.source" placeholder="选择来源" class="!w-100%">
            <el-option
              v-for="item in WORKORDER_SOURCE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="异常时间" prop="faultTime">
          <el-date-picker
            v-model="form.faultTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择异常发生时间"
            class="!w-100%"
          />
        </el-form-item>
        <el-form-item label="联系电话" prop="reporterPhone">
          <el-input v-model="form.reporterPhone" placeholder="选填，补充提交人联系电话" />
        </el-form-item>
        <el-form-item label="任务场景" prop="taskScene">
          <el-input v-model="form.taskScene" placeholder="选填，例如：返航阶段 / 河道巡检阶段" />
        </el-form-item>
        <el-form-item label="异常现象" prop="symptom">
          <el-input v-model="form.symptom" placeholder="简要描述故障现象" />
        </el-form-item>
        <el-form-item label="现场描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="补充现场情况、风险提示、附件说明"
          />
        </el-form-item>
        <el-form-item label="提交人" prop="creator">
          <el-input v-model="form.creator" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            提交工单
          </el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { resolveAssetDeviceMasterRecord } from '@/api/yian/asset/deviceMaster'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  WORKORDER_SOURCE_OPTIONS,
  YianWorkorderApi,
  type WorkorderSource
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderCreate' })

type DeviceOption = Pick<DvMachineryVO, 'id' | 'code' | 'name'> & {
  siteName: string
}

const router = useRouter()
const message = useMessage()
const userStore = useUserStoreWithOut()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const deviceLoading = ref(false)
const deviceOptions = ref<DeviceOption[]>([])
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const form = reactive({
  deviceId: undefined as number | undefined,
  deviceCode: '',
  deviceName: '',
  siteName: '',
  source: '' as WorkorderSource | '',
  faultTime: '',
  reporterPhone: '',
  taskScene: '',
  symptom: '',
  description: '',
  creator: currentOperatorName.value
})

const rules: FormRules = {
  deviceId: [{ required: true, message: '请选择关联设备', trigger: 'change' }],
  source: [{ required: true, message: '请选择报修来源', trigger: 'change' }],
  faultTime: [{ required: true, message: '请选择异常时间', trigger: 'change' }],
  symptom: [{ required: true, message: '请填写异常现象', trigger: 'blur' }],
  creator: [{ required: true, message: '请填写创建人', trigger: 'blur' }]
}

const fallbackDevices: DeviceOption[] = [
  { id: 1203, code: 'UAV-IMPORT-101', name: 'DJI M350 RTK', siteName: '嘉兴南湖站' },
  { id: 1202, code: 'UAV-MVP-002', name: 'DJI M30T', siteName: '苏州工业园站' },
  { id: 1201, code: 'UAV-MVP-001', name: 'DJI M350 RTK', siteName: '杭州余杭站' }
]

const loadDevices = async () => {
  deviceLoading.value = true
  try {
    const data = await DvMachineryApi.getMachineryPage({ pageNo: 1, pageSize: 50 })
    deviceOptions.value = data.list.map((item: DvMachineryVO) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      siteName: resolveAssetDeviceMasterRecord(item).siteName
    }))
  } catch {
    deviceOptions.value = fallbackDevices
    message.warning('设备台账加载失败，已切换为演示设备列表')
  } finally {
    deviceLoading.value = false
  }
}

const handleDeviceChange = (deviceId?: number) => {
  const target = deviceOptions.value.find((item) => item.id === deviceId)
  form.deviceCode = target?.code || ''
  form.deviceName = target?.name || ''
  form.siteName = target?.siteName || ''
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    form.creator = currentOperatorName.value
    const order = YianWorkorderApi.create({
      deviceId: form.deviceId!,
      deviceCode: form.deviceCode,
      deviceName: form.deviceName,
      siteName: form.siteName,
      source: form.source as WorkorderSource,
      faultTime: form.faultTime,
      reporterPhone: form.reporterPhone,
      taskScene: form.taskScene,
      symptom: form.symptom,
      description: form.description,
      creator: form.creator
    })
    message.success('工单已创建，并进入待受理')
    router.push(`/workorder/detail/${order.id}`)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  form.creator = currentOperatorName.value
  loadDevices()
})
</script>
