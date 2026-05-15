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
          <el-button type="primary" @click="handleReparse">
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
              <el-table-column label="解析来源" prop="parseSource" width="120" />
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
              <el-descriptions-item label="最近解析时间">{{ record.parseUpdatedAt }}</el-descriptions-item>
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
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import { resolveAssetDeviceMasterRecord, type AssetDeviceMasterRecordVO } from '@/api/yian/asset/deviceMaster'

defineOptions({ name: 'AssetDeviceDocs' })

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const device = ref<DvMachineryVO | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))

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
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/device/detail/${getDeviceId()}`)
}

const handleUpload = () => {
  message.info('MVP 当前先展示建档附件台账，附件上传将在下一轮接入真实服务。')
}

const handleReparse = () => {
  message.success('已按当前建档附件触发重新解析，解析摘要会以最新结果为准。')
}

watch(
  () => route.query.action,
  (action) => {
    if (action === 'upload') {
      message.info('已进入建档附件页，你可以在这里发起附件上传和解析查看。')
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
</script>

<style lang="scss" scoped>
.card-header {
  font-weight: 600;
}
</style>
