<template>
  <ContentWrap>
    <el-page-header @back="goBack" :title="backTitle" content="统一资产导入" />

    <el-alert :title="pageAlert" type="info" :closable="false" show-icon class="mt-16px" />

    <el-card class="mt-20px">
      <template #header>
        <div class="card-header">导入文件</div>
      </template>

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
            请先下载模板，按下方字段说明准备数据后再上传。当前设备、电池仍共用统一导入接口。
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

    <el-card class="mt-20px">
      <template #header>
        <div class="card-header">模板字段说明</div>
      </template>
      <el-table :data="templateColumns" stripe>
        <el-table-column label="字段名" prop="field" width="180" />
        <el-table-column label="是否必填" prop="required" width="100" />
        <el-table-column label="示例值" prop="example" min-width="180" />
        <el-table-column label="说明" prop="description" min-width="320" />
      </el-table>
    </el-card>

    <el-card v-if="importSummary" class="mt-20px">
      <template #header>导入结果</template>
      <el-descriptions :column="5" border>
        <el-descriptions-item label="新增设备">{{ importSummary.machineryCreateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="更新设备">{{ importSummary.machineryUpdateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="新增电池">{{ importSummary.batteryCreateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="更新电池">{{ importSummary.batteryUpdateCodes.length }}</el-descriptions-item>
        <el-descriptions-item label="失败数量">{{ failureCount }}</el-descriptions-item>
      </el-descriptions>

      <el-table v-if="failureRows.length" :data="failureRows" stripe class="mt-16px">
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

type AssetImportMode = 'device' | 'battery'
type TemplateColumn = {
  field: string
  required: string
  example: string
  description: string
}

const message = useMessage()
const router = useRouter()
const route = useRoute()

const uploadRef = ref()
const fileList = ref<UploadUserFile[]>([])
const selectedFile = ref<File | null>(null)
const updateSupport = ref(false)
const submitLoading = ref(false)
const templateLoading = ref(false)
const importSummary = ref<AssetImportRespVO | null>(null)

const mode = computed<AssetImportMode>(() =>
  route.query.assetType === 'battery' ? 'battery' : 'device'
)

const backTitle = computed(() => (mode.value === 'battery' ? '返回电池台账' : '返回设备台账'))

const pageAlert = computed(() =>
  mode.value === 'battery'
    ? '电池导入字段按当前建档口径收敛为基础主档字段：电池编号、序列号、型号、所属站点、关联主机、SOH、循环次数、健康状态和备注。检测来源、来源依据、建议动作等动态字段不在导入模板中维护。'
    : '设备导入字段按当前主档口径维护：设备编号、序列号、设备名称、设备类型、所属站点、责任人、启用状态、品牌、规格型号、标配电池 SN 列表和备注。'
)

const deviceTemplateColumns: TemplateColumn[] = [
  { field: '资产类型', required: '是', example: '设备', description: '设备台账导入时固定填写“设备”。' },
  { field: '设备编号', required: '是', example: 'UAV-MVP-001', description: '设备编号，导入时强校验唯一。' },
  { field: '序列号', required: '是', example: 'AC24HZ92031', description: '设备 SN，导入时强校验唯一。' },
  { field: '设备名称', required: '是', example: 'Inspection UAV 01', description: '设备主档名称。' },
  { field: '设备类型', required: '是', example: '无人机整机', description: '使用预置设备类型字典。' },
  { field: '所属站点编码', required: '是', example: 'YUHANG', description: '填写基础配置中已维护的站点编码。' },
  { field: '责任人', required: '是', example: '周启明', description: '当前主责人。' },
  { field: '启用状态', required: '是', example: '启用', description: '仅支持“启用 / 停用”。' },
  { field: '品牌', required: '否', example: 'DJI', description: '设备品牌。' },
  { field: '规格型号', required: '否', example: 'Matrice 350 RTK', description: '设备规格型号。' },
  { field: '标配电池SN列表', required: '否', example: 'YA-BT-00891,YA-BT-00912', description: '仅整机设备填写，多个 SN 用英文逗号分隔。' },
  { field: '备注', required: '否', example: '首批建档', description: '补充说明。' }
]

const batteryTemplateColumns: TemplateColumn[] = [
  { field: '资产类型', required: '是', example: '电池', description: '电池台账导入时固定填写“电池”。' },
  { field: '电池编号', required: '是', example: 'YA-BT-01003', description: '电池编号，导入时强校验唯一。' },
  { field: '序列号', required: '是', example: 'BT24SU22731', description: '电池 SN，导入时强校验唯一。' },
  { field: '型号', required: '是', example: 'TB65', description: '电池型号。' },
  { field: '品牌', required: '否', example: 'DJI', description: '电池品牌。' },
  { field: '所属站点编码', required: '是', example: 'YUHANG', description: '填写基础配置中已维护的站点编码。' },
  { field: '关联主机编码', required: '否', example: 'UAV-MVP-002', description: '可填写当前关联主机编号。' },
  { field: 'SOH', required: '否', example: '87', description: '0-100 的健康度数值。' },
  { field: '循环次数', required: '否', example: '123', description: '电池当前循环次数。' },
  { field: '健康状态', required: '否', example: 'warning', description: '支持 normal / warning / danger。' },
  { field: '备注', required: '否', example: '首批建档', description: '补充说明。' }
]

const templateColumns = computed(() =>
  mode.value === 'battery' ? batteryTemplateColumns : deviceTemplateColumns
)

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
    message.success(mode.value === 'battery' ? '电池导入完成' : '设备导入完成')
  } finally {
    submitLoading.value = false
  }
}

const handleDownloadTemplate = async () => {
  templateLoading.value = true
  try {
    const header = templateColumns.value.map((item) => item.field).join('\t')
    const sample = templateColumns.value.map((item) => item.example).join('\t')
    const blob = new Blob([`\ufeff${header}\n${sample}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = mode.value === 'battery' ? '电池导入模板.xls' : '设备导入模板.xls'
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    templateLoading.value = false
  }
}

const goBack = () => {
  router.push(mode.value === 'battery' ? '/asset/battery' : '/asset/device')
}
</script>

<style lang="scss" scoped>
.card-header {
  font-weight: 600;
}
</style>
