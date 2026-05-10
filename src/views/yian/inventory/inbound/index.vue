<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/inventory/stock')" title="返回库存列表" content="入库登记" />
    <el-form label-width="120px" class="mt-20px max-w-800px">
      <el-form-item label="入库类型" required>
        <el-select placeholder="选择类型" class="!w-100%">
          <el-option label="采购到货" value="purchase" />
          <el-option label="返修回库" value="repair_return" />
          <el-option label="退料入库" value="pick_return" />
        </el-select>
      </el-form-item>
      <el-form-item label="备件" required>
        <el-select placeholder="选择备件" filterable class="!w-100%">
          <el-option label="SP-BLD-001 标准桨叶套装" value="1" />
          <el-option label="SP-MTR-002 电机总成" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="数量" required>
        <el-input-number :min="1" :value="1" />
      </el-form-item>
      <el-form-item label="批次号">
        <el-input placeholder="选填" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input type="textarea" :rows="3" placeholder="入库备注" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">确认入库</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'InventoryInbound' })
</script>
