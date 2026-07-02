<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回电池详情"
      :content="battery?.batteryCode ? `建档附件 - ${battery.batteryCode}` : '建档附件'"
    >
      <template #extra>
        <el-space wrap>
          <el-button @click="handleUpload">
            <Icon icon="ep:upload" class="mr-4px" />
            上传附件
          </el-button>
        </el-space>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="6" animated class="mt-20px" />

    <template v-else-if="battery && profile">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :lg="16">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">建档附件列表</div>
            </template>
            <el-table :data="profile.attachments" stripe>
              <el-table-column label="附件名称" prop="fileName" min-width="240" />
              <el-table-column label="附件类型" prop="category" width="140" />
              <el-table-column label="摘要" prop="summary" min-width="220" />
              <el-table-column label="上传人" prop="uploadedBy" width="120" />
              <el-table-column label="上传时间" prop="uploadedAt" width="180" />
            </el-table>
            <el-empty v-if="!profile.attachments.length" description="当前没有建档附件" class="mt-20px" />
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">附件解析摘要</div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="建档摘要">{{ attachmentSummary }}</el-descriptions-item>
              <el-descriptions-item label="最近上传时间">{{ latestUploadedAt }}</el-descriptions-item>
              <el-descriptions-item label="相关提示">
                {{ correctionSummary }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="mt-16px">
              <el-alert
                v-for="item in profile.correctionHints"
                :key="item.id"
                :title="item.summary"
                :description="item.detail"
                :type="item.tone === 'danger' ? 'error' : 'warning'"
                :closable="false"
                show-icon
                class="mb-12px"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else description="未找到对应电池数据" class="mt-20px" />

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传建档附件"
      width="640px"
      :close-on-click-modal="!uploadSubmitting"
      :close-on-press-escape="!uploadSubmitting"
      :show-close="!uploadSubmitting"
      :before-close="handleUploadDialogClose"
    >
      <div v-loading="uploadSubmitting" element-loading-text="正在上传附件，请稍候...">
        <el-alert
          v-if="uploadSubmitting"
          type="info"
          :closable="false"
          show-icon
          class="mb-16px"
          title="系统正在处理附件"
          description="上传完成后会自动刷新当前附件列表和摘要。"
        />
        <el-upload
          drag
          :auto-upload="false"
          :multiple="true"
          :limit="10"
          :disabled="uploadSubmitting"
          :file-list="uploadList"
          @change="handleUploadChange"
          @remove="handleUploadRemove"
        >
          <Icon icon="ep:upload-filled" class="mb-12px text-28px" />
          <div class="el-upload__text">将建档附件拖到此处，或<em>点击选择文件</em></div>
          <template #tip>
            <div class="el-upload__tip">支持图片、PDF、Word、Excel、日志压缩包等建档附件。</div>
            <div v-if="uploadList.length" class="upload-selection-tip">
              已选择 {{ uploadList.length }} 份附件，可一次性上传多份文件
            </div>
          </template>
        </el-upload>
      </div>

      <template #footer>
        <el-space wrap>
          <el-button :disabled="uploadSubmitting" @click="uploadDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="uploadSubmitting"
            :disabled="!uploadList.length"
            @click="submitUploads"
          >
            {{ uploadSubmitting ? '正在上传...' : '确认上传' }}
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadUserFile } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import {
  resolveAssetBatteryProfile,
  uploadAssetBatteryDocument,
  type AssetBatteryProfileVO
} from '@/api/yian/asset'
import { useUserStoreWithOut } from '@/store/modules/user'

defineOptions({ name: 'AssetBatteryDocs' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const battery = ref<AssetBatteryVO | null>(null)
const uploadDialogVisible = ref(false)
const uploadList = ref<UploadUserFile[]>([])
const uploadSubmitting = ref(false)
const userStore = useUserStoreWithOut()

const profile = computed<AssetBatteryProfileVO | null>(() =>
  battery.value ? resolveAssetBatteryProfile(battery.value) : null
)

const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const attachmentSummary = computed(() => {
  const attachments = profile.value?.attachments || []
  if (!attachments.length) return '当前暂无建档附件'
  return `已登记 ${attachments.length} 份建档附件`
})

const latestUploadedAt = computed(() => profile.value?.attachments[0]?.uploadedAt || '-')

const correctionSummary = computed(() => {
  if (!profile.value?.correctionHints.length) return '当前暂无新的比对提醒'
  return profile.value.correctionHints.map((item) => item.summary).join('；')
})

const getBatteryId = () => Number(route.params.id || route.query.id || 0)

const getDetail = async () => {
  const id = getBatteryId()
  if (!id) {
    battery.value = null
    return
  }
  loading.value = true
  try {
    battery.value = await YianAssetApi.getBattery(id)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/battery/detail/${getBatteryId()}`)
}

const handleUpload = () => {
  uploadDialogVisible.value = true
}

const handleUploadDialogClose = (done: () => void) => {
  if (uploadSubmitting.value) {
    return
  }
  done()
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
  if (!battery.value?.batteryCode || !uploadList.value.length) return
  uploadSubmitting.value = true
  try {
    for (const file of uploadList.value) {
      uploadAssetBatteryDocument(battery.value, {
        fileName: file.name,
        uploadedBy: currentOperatorName.value
      })
    }
    uploadDialogVisible.value = false
    uploadList.value = []
    await getDetail()
  } finally {
    uploadSubmitting.value = false
  }
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
  () => [route.params.id, route.query.id],
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

.upload-selection-tip {
  margin-top: 8px;
  color: var(--el-color-primary);
}
</style>
