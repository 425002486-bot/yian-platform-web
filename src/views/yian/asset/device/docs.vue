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
            <el-table :data="documents" stripe>
              <el-table-column label="附件名称" prop="fileName" min-width="220" />
              <el-table-column label="资料类型" prop="documentType" width="140" />
              <el-table-column label="解析结果" prop="parseResult" min-width="260" />
              <el-table-column label="解析来源" prop="parseSource" width="120" />
              <el-table-column label="上传人" prop="uploadedBy" width="120" />
              <el-table-column label="上传时间" prop="uploadedAt" width="180" />
            </el-table>
            <el-empty v-if="!documents.length" description="当前没有建档附件" class="mt-20px" />
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">缺失与提醒</div>
            </template>
            <el-alert
              title="主档资料删除需逻辑删除并触发重新解析，当前页先按原型展示解析提示。"
              type="info"
              :closable="false"
              show-icon
              class="mb-12px"
            />
            <el-alert
              v-for="(warning, index) in profile.warnings"
              :key="`warning-${index}`"
              :title="warning"
              type="warning"
              :closable="false"
              show-icon
              class="mb-12px"
            />
            <el-alert
              v-for="(item, index) in profile.missingItems"
              :key="`missing-${index}`"
              :title="item"
              type="error"
              :closable="false"
              show-icon
              class="mb-12px"
            />
            <el-descriptions :column="1" border class="mt-16px">
              <el-descriptions-item label="解析摘要">
                {{ profile.parseSummary }}
              </el-descriptions-item>
              <el-descriptions-item label="解析来源">
                {{ profile.parseSource }}
              </el-descriptions-item>
              <el-descriptions-item label="最近更新时间">
                {{ profile.parseUpdatedAt }}
              </el-descriptions-item>
            </el-descriptions>
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
import { resolveAssetDeviceProfile } from '@/api/yian/asset'

defineOptions({ name: 'AssetDeviceDocs' })

const router = useRouter()
const route = useRoute()
const message = useMessage()

const loading = ref(false)
const device = ref<DvMachineryVO | null>(null)

const profile = computed(() => resolveAssetDeviceProfile(device.value))
const documents = computed(() => profile.value.documents)

const getDeviceId = () => Number(route.params.id)

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    device.value = await DvMachineryApi.getMachinery(id)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/device/detail/${getDeviceId()}`)
}

const handleUpload = () => {
  message.info('MVP 当前先复用建档附件台账展示，上传入口将在下一轮接入真实附件服务。')
}

const handleReparse = () => {
  message.success('已模拟触发重新解析，当前页会继续按最新主档摘要展示结果。')
}

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
