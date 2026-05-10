<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/inventory/stock')" title="返回库存列表" content="备件批量导入" />
    <el-card class="mt-20px">
      <el-upload drag action="#" :auto-upload="false" accept=".xlsx,.xls">
        <el-icon class="el-icon--upload" :size="40"><Icon icon="ep:upload-filled" /></el-icon>
        <div class="el-upload__text">将备件数据 Excel 拖到此处，或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">支持导入备件主数据、期初库存和供应商批次信息</div>
        </template>
      </el-upload>
      <div class="mt-16px flex gap-12px">
        <el-button type="primary">开始导入</el-button>
        <el-button>下载导入模板</el-button>
      </div>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'InventoryImport' })
</script>
