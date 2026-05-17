<template>
  <ContentWrap v-loading="loading">
    <el-page-header @back="$router.push('/audit/log')" title="返回审计日志" content="日志详情" />

    <el-descriptions :column="2" border class="mt-20px" title="操作上下文">
      <el-descriptions-item label="操作时间">{{ formatDate(logDetail.createTime) }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ logDetail.userName }}</el-descriptions-item>
      <el-descriptions-item label="操作对象">{{ logDetail.objectType }}</el-descriptions-item>
      <el-descriptions-item label="对象标识">{{ logDetail.bizId }}</el-descriptions-item>
      <el-descriptions-item label="来源页面">{{ logDetail.sourcePage }}</el-descriptions-item>
      <el-descriptions-item label="IP地址">{{ logDetail.userIp }}</el-descriptions-item>
      <el-descriptions-item label="操作内容" :span="2">{{ logDetail.action }}</el-descriptions-item>
    </el-descriptions>

    <el-card class="mt-20px" header="变更前后对比">
      <div v-if="logDetail.extra" class="py-10px">
        <pre class="text-sm">{{ logDetail.extra }}</pre>
      </div>
      <div v-else class="text-gray-400 py-20px text-center">暂无变更记录</div>
    </el-card>

    <el-card class="mt-20px" header="责任链">
      <div class="text-gray-400 py-20px text-center">责任链追溯（待开发）</div>
    </el-card>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getAuditLog, type AuditLogVO } from '@/api/yian/audit'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'AuditLogDetail' })

const { currentRoute } = useRouter()
const loading = ref(false)
const logDetail = ref<Partial<AuditLogVO>>({})

const getDetail = async () => {
  const id = currentRoute.value.query.id as string
  if (!id) return
  loading.value = true
  try {
    logDetail.value = await getAuditLog(Number(id))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getDetail()
})
</script>
