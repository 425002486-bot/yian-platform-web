<template>
  <ContentWrap>
    <el-page-header @back="$router.push('/workorder/list')" title="返回工单列表" content="新建工单" />

    <el-form :model="form" label-width="120px" class="mt-20px max-w-800px">
      <el-form-item label="关联设备" required>
        <el-select v-model="form.deviceId" placeholder="选择设备" filterable class="!w-100%">
          <el-option label="DJI-M350-0027 (M350 RTK)" :value="1" />
          <el-option label="DJI-M300-0015 (M300 RTK)" :value="2" />
          <el-option label="DJI-M30T-0042 (M30T)" :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item label="报修来源" required>
        <el-select v-model="form.source" placeholder="选择来源" class="!w-100%">
          <el-option label="飞手上报" value="pilot" />
          <el-option label="站点巡检" value="inspection" />
          <el-option label="系统告警" value="alert" />
          <el-option label="售后返场" value="aftersale" />
          <el-option label="定保发现" value="maintenance" />
          <el-option label="客服代录" value="service" />
          <el-option label="人工补录" value="manual" />
        </el-select>
      </el-form-item>
      <el-form-item label="异常时间" required>
        <el-date-picker v-model="form.faultTime" type="datetime" placeholder="选择异常发生时间" class="!w-100%" />
      </el-form-item>
      <el-form-item label="异常现象" required>
        <el-input v-model="form.symptom" placeholder="简要描述异常现象" />
      </el-form-item>
      <el-form-item label="现场描述">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="补充现场情况" />
      </el-form-item>
      <el-form-item label="飞行日志">
        <el-upload action="#" :auto-upload="false" accept=".log,.csv,.txt">
          <el-button type="primary" plain>上传日志文件</el-button>
        </el-upload>
      </el-form-item>
      <el-form-item label="异常截图">
        <el-upload action="#" :auto-upload="false" accept="image/*" list-type="picture-card" :limit="5">
          <el-icon><Icon icon="ep:plus" /></el-icon>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">提交工单</el-button>
        <el-button @click="$router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
defineOptions({ name: 'WorkorderCreate' })

const form = reactive({
  deviceId: undefined,
  source: '',
  faultTime: '',
  symptom: '',
  description: ''
})
</script>
