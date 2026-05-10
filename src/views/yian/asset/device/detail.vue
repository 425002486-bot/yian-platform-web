<template>
  <ContentWrap>
    <el-page-header @back="goBack" title="返回设备台账" :content="'设备详情 - ' + device.deviceNo" />

    <el-descriptions :column="3" border class="mt-20px">
      <el-descriptions-item label="设备编号">{{ device.deviceNo }}</el-descriptions-item>
      <el-descriptions-item label="序列号">{{ device.serialNo }}</el-descriptions-item>
      <el-descriptions-item label="机型">{{ device.model }}</el-descriptions-item>
      <el-descriptions-item label="所属站点">{{ device.siteName }}</el-descriptions-item>
      <el-descriptions-item label="责任人">{{ device.ownerName }}</el-descriptions-item>
      <el-descriptions-item label="当前状态">
        <el-tag :type="device.status === 'grounded' ? 'danger' : 'success'">{{ device.statusLabel }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="状态原因" :span="2">{{ device.statusReason }}</el-descriptions-item>
      <el-descriptions-item label="当前在途工单">{{ device.activeWorkorder || '无' }}</el-descriptions-item>
    </el-descriptions>

    <el-tabs v-model="activeTab" class="mt-20px">
      <el-tab-pane label="建档附件" name="attachments">
        <div class="text-gray-400 py-40px text-center">建档附件列表（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="设备履历" name="history">
        <div class="text-gray-400 py-40px text-center">设备履历时间轴（待开发）</div>
      </el-tab-pane>
      <el-tab-pane label="关联工单" name="workorders">
        <div class="text-gray-400 py-40px text-center">关联工单列表（待开发）</div>
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'

defineOptions({ name: 'AssetDeviceDetail' })

const router = useRouter()
const activeTab = ref('attachments')

const device = reactive({
  deviceNo: 'DJI-M350-0027',
  serialNo: '1ZNBJ8K00C00YK',
  model: 'M350 RTK',
  siteName: '华东运营中心',
  ownerName: '张工',
  status: 'grounded',
  statusLabel: '停飞',
  statusReason: '飞控异常，待放行审核',
  activeWorkorder: 'WO-20260502-018 / 待放行'
})

const goBack = () => router.push('/asset/device')
</script>
