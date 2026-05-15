<template>
  <ContentWrap>
    <el-page-header @back="goBack" title="返回设备台账" content="统一资产导入" />

    <el-alert
      title="设备导入字段已按主档需求对齐：设备编号、序列号、设备名称、设备类型、所属站点、责任人、启用状态、品牌、规格型号、标配电池 SN 列表。"
      type="info"
      :closable="false"
      show-icon
      class="mt-16px"
    />

    <el-card class="mt-20px">
      <template #header>
        <div class="card-header">模板字段说明</div>
      </template>
      <el-table :data="templateColumns" stripe>
        <el-table-column label="字段名" prop="field" width="180" />
        <el-table-column label="是否必填" prop="required" width="100" />
        <el-table-column label="示例值" prop="example" min-width="180" />
        <el-table-column label="说明" prop="description" min-width="260" />
      </el-table>
    </el-card>

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
            当前导入仍使用统一资产导入接口，文件格式请参考上方模板字段说明。
          </div>
        </template>
      </el-upload>

      <div class="mt-16px">
        <el-checkbox v-model="updateSupport">允许更新已存在资产</el-checkbox>
      </div>

      <div class="mt-16px flex flex-wrap gap-12px">
        <el-button type="primary" :loading="submitLoading" @click="handleImport">开始导入</el-button>
        <el-button :loading="templateLoading" @click="handleDownloadTemplate">下载导入模板</el-button>
      </div>
    </el-card>

    <el-card v-if="importSummary" class="mt-20px">
      <template #header>导入结果</template>
      <el-descriptions :column="5" border>
        <el-descriptions-item label="新增主机">{{ importSummary.machineryCreateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="更新主机">{{ importSummary.machineryUpdateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="新增电池">{{ importSummary.batteryCreateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="更新电池">{{ importSummary.batteryUpdateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="失败数量">{{ failureCount }}</el-descriptions-item>
      </el-descriptions>

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

const templateColumns = [
  { field: '资产类型', required: '是', example: '主机', description: '当前设备台账导入请填写“主机”。' },
  { field: '设备编号', required: '是', example: 'UAV-MVP-001', description: '设备主键之一，导入时强查重。' },
  { field: '序列号', required: '是', example: 'AC24HZ92031', description: '设备 SN，导入时强查重。' },
  { field: '设备名称', required: '是', example: 'Inspection UAV 01', description: '设备主档名称。' },
  { field: '设备类型', required: '是', example: 'Multirotor UAV', description: '用于主档分类与页面展示。' },
  { field: '所属站点', required: '是', example: '杭州余杭站', description: '从站点主档选择或维护。' },
  { field: '责任人', required: '是', example: '周启明', description: '默认责任归属人与追责入口。' },
  { field: '启用状态', required: '是', example: '启用', description: '仅保留“启用 / 停用”两种口径。' },
  { field: '品牌', required: '否', example: 'DJI', description: '设备品牌。' },
  { field: '规格型号', required: '否', example: 'Matrice 350 RTK', description: '设备规格型号。' },
  { field: '标配电池SN列表', required: '否', example: 'YA-BT-00891,YA-BT-00912', description: '多个 SN 用英文逗号分隔。' },
  { field: '备注', required: '否', example: '首批建档', description: '补充说明。' }
]

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
    const header = templateColumns.map((item) => item.field).join('\t')
    const sample = templateColumns.map((item) => item.example).join('\t')
    const blob = new Blob([`\ufeff${header}\n${sample}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '设备导入模板.xls'
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    templateLoading.value = false
  }
}

const goBack = () => {
  router.push('/asset/device')
}
</script>

<style lang="scss" scoped>
.card-header {
  font-weight: 600;
}
</style>
