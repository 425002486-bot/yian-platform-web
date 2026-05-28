<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/inventory/stock')" title="返回库存列表" content="备件批量导入" />

    <el-card class="mt-20px">
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        class="mb-16px"
        description="支持一次导入备件主数据和期初库存。模板字段包括：料号、备件名称、规格型号、分类、计量单位、供应商、当前库存、安全库存。其中料号、备件名称、分类、计量单位为必填；规格型号和供应商可不填；当前库存、安全库存按需填写。"
      />

      <el-form label-width="120px">
        <el-form-item label="更新已有数据">
          <el-switch v-model="updateSupport" />
          <span class="ml-8px text-gray-400 text-sm">
            开启后，料号重复时会更新已有备件主数据和库存信息
          </span>
        </el-form-item>
      </el-form>

      <el-upload
        ref="uploadRef"
        drag
        action="#"
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-icon class="el-icon--upload" :size="40"><Icon icon="ep:upload-filled" /></el-icon>
        <div class="el-upload__text">将备件数据 Excel 拖到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx / .xls 格式</div>
        </template>
      </el-upload>

      <div class="mt-16px flex gap-12px">
        <el-button type="primary" :loading="importing" :disabled="!selectedFile" @click="handleImport">
          开始导入
        </el-button>
        <el-button @click="handleDownloadTemplate">下载导入模板</el-button>
      </div>
    </el-card>

    <el-card v-if="importResult" class="mt-16px" header="导入结果">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="新增成功">
          <span class="text-green-600 font-bold">{{ importResult.createCount }}</span> 条
        </el-descriptions-item>
        <el-descriptions-item label="更新成功">
          <span class="text-blue-600 font-bold">{{ importResult.updateCount }}</span> 条
        </el-descriptions-item>
        <el-descriptions-item label="失败">
          <span class="text-red-600 font-bold">{{ importResult.failCount }}</span> 条
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="importResult.failMessages && importResult.failMessages.length > 0" class="mt-12px">
        <el-alert title="失败详情" type="error" :closable="false">
          <div v-for="(msg, idx) in importResult.failMessages" :key="idx" class="text-sm">
            {{ msg }}
          </div>
        </el-alert>
      </div>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { downloadImportTemplate, importSparePartExcel } from '@/api/yian/inventory'
import download from '@/utils/download'
import type { UploadFile, UploadInstance } from 'element-plus'

defineOptions({ name: 'InventoryImport' })

const message = useMessage()

const uploadRef = ref<UploadInstance>()
const selectedFile = ref<File | null>(null)
const updateSupport = ref(false)
const importing = ref(false)

const importResult = ref<{
  createCount: number
  updateCount: number
  failCount: number
  failMessages: string[]
} | null>(null)

const handleFileChange = (uploadFile: UploadFile) => {
  selectedFile.value = uploadFile.raw || null
}

const handleFileRemove = () => {
  selectedFile.value = null
}

const handleDownloadTemplate = async () => {
  const data = await downloadImportTemplate()
  download.excel(data, '备件导入模板.xls')
}

const handleImport = async () => {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const res = await importSparePartExcel(selectedFile.value, updateSupport.value)
    importResult.value = res
    if (res.failCount === 0) {
      message.success(`导入成功：新增 ${res.createCount} 条，更新 ${res.updateCount} 条`)
    } else {
      message.warning(`导入完成：${res.failCount} 条失败，请查看失败详情`)
    }
  } catch (error: any) {
    message.error(`导入失败：${error?.message || '未知错误'}`)
  } finally {
    importing.value = false
  }
}
</script>
