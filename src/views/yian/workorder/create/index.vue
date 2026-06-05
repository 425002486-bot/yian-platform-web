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

        <el-form-item label="上传图片">
          <el-upload
            class="workorder-upload"
            :auto-upload="false"
            :multiple="true"
            :limit="6"
            :file-list="imageUploadList"
            accept="image/*"
            @change="handleImageChange"
            @remove="handleImageRemove"
          >
            <el-button>上传图片</el-button>
          </el-upload>
          <div class="form-tip">支持上传故障现场图片，方便识别异常现象和位置。</div>
        </el-form-item>

        <el-form-item label="上传日志">
          <el-upload
            class="workorder-upload"
            :auto-upload="false"
            :multiple="true"
            :limit="5"
            :file-list="logUploadList"
            accept=".log,.txt,.csv,.json,.zip,.rar,.7z"
            @change="handleLogChange"
            @remove="handleLogRemove"
          >
            <el-button>上传日志</el-button>
          </el-upload>
          <div class="form-tip">支持上传飞控日志、检测报告、压缩包等附件。</div>
        </el-form-item>

        <el-form-item label="提交人" prop="creator">
          <el-select v-model="form.creator" filterable placeholder="请选择提交人" class="!w-100%">
            <el-option
              v-for="item in creatorOptions"
              :key="`${item.stationName}-${item.userId}`"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
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
import type { FormInstance, FormRules, UploadFile, UploadFiles, UploadUserFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { resolveAssetDeviceMasterRecord } from '@/api/yian/asset/deviceMaster'
import { getPersonnelPage, type PersonnelVO } from '@/api/yian/config/personnel'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  WORKORDER_SOURCE_OPTIONS,
  YianWorkorderApi,
  type WorkorderAttachmentItem,
  type WorkorderSource
} from '@/api/yian/workorder'
import { syncRuleRuntimeConfig } from '@/api/yian/config/rule'
import { buildPersonnelOptions } from '@/utils/yian/personnel'

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
const personnelOptions = ref<PersonnelVO[]>([])
const imageUploadList = ref<UploadUserFile[]>([])
const logUploadList = ref<UploadUserFile[]>([])
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const form = reactive({
  deviceId: undefined as number | undefined,
  deviceCode: '',
  deviceName: '',
  siteName: '',
  owner: '',
  source: '' as WorkorderSource | '',
  faultTime: '',
  reporterPhone: '',
  taskScene: '',
  symptom: '',
  description: '',
  imageAttachments: [] as WorkorderAttachmentItem[],
  logAttachments: [] as WorkorderAttachmentItem[],
  creator: currentOperatorName.value
})

const defaultOwnerOptions = computed(() =>
  buildPersonnelOptions(personnelOptions.value, form.siteName, ['site_lead'], ['ops_staff'])
)
const creatorOptions = computed(() =>
  buildPersonnelOptions(
    personnelOptions.value,
    form.siteName,
    ['site_lead', 'ops_staff', 'inspector', 'parts_manager', 'release_approver', 'auditor']
  )
)

const rules: FormRules = {
  deviceId: [{ required: true, message: '请选择关联设备', trigger: 'change' }],
  source: [{ required: true, message: '请选择报修来源', trigger: 'change' }],
  faultTime: [{ required: true, message: '请选择异常时间', trigger: 'change' }],
  symptom: [{ required: true, message: '请填写异常现象', trigger: 'blur' }],
  creator: [{ required: true, message: '请选择提交人', trigger: 'change' }]
}

const fallbackDevices: DeviceOption[] = [
  { id: 1203, code: 'UAV-IMPORT-101', name: 'DJI M350 RTK', siteName: '嘉兴南湖站' },
  { id: 1202, code: 'UAV-MVP-002', name: 'DJI M30T', siteName: '苏州工业园站' },
  { id: 1201, code: 'UAV-MVP-001', name: 'DJI M350 RTK', siteName: '杭州余杭站' }
]

const toAttachmentMeta = (
  file: UploadFile,
  type: WorkorderAttachmentItem['type']
): WorkorderAttachmentItem => ({
  name: file.name,
  type,
  size: file.raw?.size ?? 0,
  mimeType: file.raw?.type || ''
})

const toUploadUserFiles = (files: UploadFiles) =>
  files.map((item) => ({
    name: item.name,
    url: item.url,
    status: item.status
  }))

const syncAttachments = (files: UploadFiles, type: WorkorderAttachmentItem['type']) =>
  files.map((item) => toAttachmentMeta(item, type))

const loadPersonnelOptions = async () => {
  try {
    const data = await getPersonnelPage({ pageNo: 1, pageSize: 200 })
    personnelOptions.value = data.list || []
  } catch {
    personnelOptions.value = []
  }
}

const syncDefaultOwner = () => {
  form.owner = defaultOwnerOptions.value[0]?.value || ''
}

const syncDefaultCreator = () => {
  form.creator = creatorOptions.value[0]?.value || currentOperatorName.value
}

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
  syncDefaultOwner()
  syncDefaultCreator()
}

const handleImageChange = (_file: UploadFile, files: UploadFiles) => {
  imageUploadList.value = toUploadUserFiles(files)
  form.imageAttachments = syncAttachments(files, 'image')
}

const handleLogChange = (_file: UploadFile, files: UploadFiles) => {
  logUploadList.value = toUploadUserFiles(files)
  form.logAttachments = syncAttachments(files, 'log')
}

const handleImageRemove = (_file: UploadFile, files: UploadFiles) => {
  imageUploadList.value = toUploadUserFiles(files)
  form.imageAttachments = syncAttachments(files, 'image')
}

const handleLogRemove = (_file: UploadFile, files: UploadFiles) => {
  logUploadList.value = toUploadUserFiles(files)
  form.logAttachments = syncAttachments(files, 'log')
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (!form.creator) {
      syncDefaultCreator()
    }
    YianWorkorderApi.create({
      deviceId: form.deviceId!,
      deviceCode: form.deviceCode,
      deviceName: form.deviceName,
      siteName: form.siteName,
      owner: form.owner || undefined,
      source: form.source as WorkorderSource,
      faultTime: form.faultTime,
      reporterPhone: form.reporterPhone,
      taskScene: form.taskScene,
      symptom: form.symptom,
      description: form.description,
      imageAttachments: form.imageAttachments,
      logAttachments: form.logAttachments,
      creator: form.creator
    })
    message.success('工单已创建')
    router.push('/workorder/list')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  await syncRuleRuntimeConfig()
  await Promise.all([loadDevices(), loadPersonnelOptions()])
  syncDefaultCreator()
  syncDefaultOwner()
})
</script>

<style lang="scss" scoped>
.workorder-upload {
  width: 100%;
}

.form-tip {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}
</style>
