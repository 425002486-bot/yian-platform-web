<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备详情"
      :content="device?.code ? `建档附件 - ${device.code}` : '建档附件'"
    >
      <template #extra>
        <el-space wrap>
          <el-button @click="handleUpload">
            <Icon icon="ep:upload" class="mr-4px" />
            上传附件
          </el-button>
          <el-button type="primary" :disabled="!record.documents.length" @click="handleReparse">
            <Icon icon="ep:refresh-right" class="mr-4px" />
            重新解析
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="6" animated class="mt-20px" />

    <template v-else-if="device">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="16">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">建档附件列表</div>
            </template>
            <el-table :data="record.documents" stripe>
              <el-table-column label="附件名称" prop="fileName" min-width="220" />
              <el-table-column label="资料类型" prop="documentType" width="140" />
              <el-table-column label="解析结果" prop="parseResult" min-width="240" />
              <el-table-column label="解析来源" prop="parseSource" width="140" />
              <el-table-column label="上传人" prop="uploadedBy" width="120" />
              <el-table-column label="上传时间" prop="uploadedAt" width="180" />
            </el-table>
            <el-empty v-if="!record.documents.length" description="当前没有建档附件" class="mt-20px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">附件解析摘要</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="解析摘要">{{ record.parseSummary }}</el-descriptions-item>
              <el-descriptions-item label="解析来源">{{ record.parseSource }}</el-descriptions-item>
              <el-descriptions-item label="最近解析时间">
                {{ record.parseUpdatedAt }}
              </el-descriptions-item>
            </el-descriptions>
            <div class="mt-16px">
              <el-alert
                v-for="(warning, index) in record.warnings"
                :key="`warning-${index}`"
                :title="warning"
                type="warning"
                :closable="false"
                show-icon
                class="mb-12px"
              />
              <el-alert
                v-for="(item, index) in record.missingItems"
                :key="`missing-${index}`"
                :title="item"
                type="error"
                :closable="false"
                show-icon
                class="mb-12px"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />

    <el-dialog v-model="uploadDialogVisible" title="上传建档附件" width="640px">
      <el-upload
        drag
        :auto-upload="false"
        :multiple="true"
        :limit="10"
        :file-list="uploadList"
        @change="handleUploadChange"
        @remove="handleUploadRemove"
      >
        <Icon icon="ep:upload-filled" class="mb-12px text-28px" />
        <div class="el-upload__text">将建档附件拖到此处，或 <em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">支持图片、PDF、Word、Excel、日志压缩包等建档附件</div>
        </template>
      </el-upload>

      <template #footer>
        <el-space wrap>
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :disabled="!uploadList.length" @click="submitUploads">
            确认上传
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadUserFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import {
  reparseAssetDeviceDocuments,
  refreshAssetDeviceRuleRecord,
  resolveAssetDeviceMasterRecord,
  uploadAssetDeviceDocument,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'
import { useUserStoreWithOut } from '@/store/modules/user'

defineOptions({ name: 'AssetDeviceDocs' })

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const loading = ref(false)
const device = ref<DvMachineryVO | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))
const uploadDialogVisible = ref(false)
const uploadList = ref<UploadUserFile[]>([])
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const getDeviceId = () => Number(route.params.id)

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    const machinery = await DvMachineryApi.getMachinery(id)
    device.value = machinery
    record.value = resolveAssetDeviceMasterRecord(machinery)
    record.value = await refreshAssetDeviceRuleRecord(machinery)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/device/detail/${getDeviceId()}`)
}

const handleUpload = () => {
  uploadDialogVisible.value = true
}

const handleReparse = () => {
  if (!device.value?.code) return
  if (!record.value.documents.length) {
    message.warning('当前没有建档附件，无法触发重新解析')
    return
  }
  record.value = reparseAssetDeviceDocuments(device.value, device.value.code, currentOperatorName.value)
  message.success('已按当前建档附件重新解析，页面摘要已刷新')
}

const mapUploadFiles = (files: UploadFiles) =>
  files.map((item) => ({
    name: item.name,
    status: item.status,
    url: item.url
  }))

const handleUploadChange = (_file: UploadFile, files: UploadFiles) => {
  uploadList.value = mapUploadFiles(files)
}

const handleUploadRemove = (_file: UploadFile, files: UploadFiles) => {
  uploadList.value = mapUploadFiles(files)
}

const submitUploads = async () => {
  if (!device.value?.code || !uploadList.value.length) {
    message.warning('请先选择要上传的建档附件')
    return
  }
  for (const file of uploadList.value) {
    record.value = uploadAssetDeviceDocument(device.value, {
      code: device.value.code,
      fileName: file.name,
      uploadedBy: currentOperatorName.value
    })
  }
  const uploadedCount = uploadList.value.length
  uploadDialogVisible.value = false
  uploadList.value = []
  message.success(`已补录 ${uploadedCount} 份建档附件`)
}

watch(
  () => route.query.action,
  (action) => {
    if (action === 'upload') {
      uploadDialogVisible.value = true
    }
  },
  { immediate: true }
)

watch(
  () => route.params.id,
  () => {
    getDetail()
  },
  { immediate: true }
)

onMounted(async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
})
</script>

<style lang="scss" scoped>
.card-header {
  font-weight: 600;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
