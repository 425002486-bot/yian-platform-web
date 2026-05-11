<template>
  <ContentWrap>
    <el-page-header @back="goBack" title="返回设备台账" content="统一资产导入" />

    <el-alert
      title="同一批 Excel 允许同时导入主机和电池；系统会先按资产类型识别，再分别写入设备台账和电池台账。"
      type="info"
      :closable="false"
      show-icon
      class="mt-16px"
    />

    <el-card class="mt-20px">
      <el-upload
        ref="uploadRef"
        v-model:file-list="fileList"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
        :before-upload="beforeUpload"
      >
        <el-icon class="el-icon--upload" :size="40">
          <Icon icon="ep:upload-filled" />
        </el-icon>
        <div class="el-upload__text">将 Excel 文件拖到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            模板必须包含“资产类型”字段，当前支持“主机”和“电池”两类。
          </div>
        </template>
      </el-upload>

      <div class="mt-16px">
        <el-checkbox v-model="updateSupport">允许更新已存在资产</el-checkbox>
      </div>

      <div class="mt-16px flex flex-wrap gap-12px">
        <el-button type="primary" :loading="submitLoading" @click="handleImport">
          开始导入
        </el-button>
        <el-button :loading="templateLoading" @click="handleDownloadTemplate">
          下载导入模板
        </el-button>
      </div>
    </el-card>

    <el-card v-if="importSummary" class="mt-20px">
      <template #header>导入结果</template>
      <el-descriptions :column="5" border>
        <el-descriptions-item label="新增主机">
          {{ importSummary.machineryCreateCodes.length }}
        </el-descriptions-item>
        <el-descriptions-item label="更新主机">
          {{ importSummary.machineryUpdateCodes.length }}
        </el-descriptions-item>
        <el-descriptions-item label="新增电池">
          {{ importSummary.batteryCreateCodes.length }}
        </el-descriptions-item>
        <el-descriptions-item label="更新电池">
          {{ importSummary.batteryUpdateCodes.length }}
        </el-descriptions-item>
        <el-descriptions-item label="失败数量">
          {{ failureCount }}
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="importSummary.machineryCreateCodes.length"
        type="success"
        :closable="false"
        show-icon
        class="mt-16px"
        :title="`新增主机编码：${importSummary.machineryCreateCodes.join('、')}`"
      />
      <el-alert
        v-if="importSummary.machineryUpdateCodes.length"
        type="success"
        :closable="false"
        show-icon
        class="mt-16px"
        :title="`更新主机编码：${importSummary.machineryUpdateCodes.join('、')}`"
      />
      <el-alert
        v-if="importSummary.batteryCreateCodes.length"
        type="success"
        :closable="false"
        show-icon
        class="mt-16px"
        :title="`新增电池编码：${importSummary.batteryCreateCodes.join('、')}`"
      />
      <el-alert
        v-if="importSummary.batteryUpdateCodes.length"
        type="success"
        :closable="false"
        show-icon
        class="mt-16px"
        :title="`更新电池编码：${importSummary.batteryUpdateCodes.join('、')}`"
      />

      <el-table
        v-if="failureRows.length"
        :data="failureRows"
        stripe
        class="mt-16px"
        :show-overflow-tooltip="true"
      >
        <el-table-column label="失败对象" prop="code" min-width="180" />
        <el-table-column label="失败原因" prop="reason" min-width="320" />
      </el-table>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadRawFile, UploadUserFile } from 'element-plus'

import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetImportRespVO } from '@/api/yian/asset/backend'
import download from '@/utils/download'

defineOptions({ name: 'AssetImport' })

const message = useMessage()
const router = useRouter()

const uploadRef = ref()
const fileList = ref<UploadUserFile[]>([])
const selectedFile = ref<File | null>(null)
const updateSupport = ref(false)
const submitLoading = ref(false)
const templateLoading = ref(false)
const importSummary = ref<AssetImportRespVO | null>(null)

const failureRows = computed(() =>
  Object.entries(importSummary.value?.failureCodes || {}).map(([code, reason]) => ({
    code,
    reason
  }))
)

const failureCount = computed(() => failureRows.value.length)

const beforeUpload = () => false

const handleFileChange = (file: UploadFile, files: UploadFiles) => {
  fileList.value = files.slice(-1)
  selectedFile.value = (file.raw as UploadRawFile | undefined) || null
}

const handleExceed = (files: File[]) => {
  const file = files[0]
  uploadRef.value?.clearFiles()
  uploadRef.value?.handleStart(file as UploadRawFile)
}

const handleImport = async () => {
  if (!selectedFile.value) {
    message.warning('请先选择导入文件')
    return
  }
  submitLoading.value = true
  try {
    importSummary.value = await YianAssetApi.importAssets(selectedFile.value, updateSupport.value)
    message.success('资产导入完成')
  } finally {
    submitLoading.value = false
  }
}

const handleDownloadTemplate = async () => {
  templateLoading.value = true
  try {
    const data = await YianAssetApi.importTemplate()
    download.excel(data, '资产导入模板.xls')
  } finally {
    templateLoading.value = false
  }
}

const goBack = () => {
  router.push('/asset/device')
}
</script>
