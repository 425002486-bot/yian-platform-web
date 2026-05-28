<template>
  <ContentWrap>
    <el-alert
      title="角色说明"
      type="info"
      :closable="false"
      class="mb-16px"
      description="以下为系统预定义的业务角色和权限矩阵。人员角色请在“人员管理”中分配，业务菜单与页面操作会按这里的权限联动控制。"
    />

    <div class="grid grid-cols-3 gap-12px mb-20px">
      <el-card v-for="role in roleList" :key="role.code" shadow="hover" class="role-card">
        <div class="flex justify-between items-center mb-8px">
          <span class="font-bold text-base">{{ role.name }}</span>
          <el-tag size="small">{{ role.userCount }} 人</el-tag>
        </div>
        <div class="text-gray-500 text-sm">{{ role.description }}</div>
      </el-card>
    </div>

    <h3 class="mb-12px">权限矩阵</h3>
    <el-table v-loading="loading" :data="roleList" stripe border>
      <el-table-column label="角色" prop="name" width="130" fixed="left" />
      <el-table-column label="人数" prop="userCount" width="70" align="center" />
      <el-table-column label="设备台账" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.asset" /></template>
      </el-table-column>
      <el-table-column label="工单受理" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.intake" /></template>
      </el-table-column>
      <el-table-column label="初诊维修" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.repair" /></template>
      </el-table-column>
      <el-table-column label="备件领料" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.parts" /></template>
      </el-table-column>
      <el-table-column label="复检" width="80" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.inspect" /></template>
      </el-table-column>
      <el-table-column label="放行审核" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.release" /></template>
      </el-table-column>
      <el-table-column label="审计日志" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.audit" /></template>
      </el-table-column>
      <el-table-column label="基础配置" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms?.config" /></template>
      </el-table-column>
    </el-table>

    <div class="mt-16px text-gray-400 text-sm">
      <span class="mr-16px"><el-tag type="success" size="small">可执行</el-tag> 可发起和操作</span>
      <span class="mr-16px"><el-tag type="info" size="small">查看</el-tag> 仅可查看</span>
      <span><el-tag type="danger" size="small">无</el-tag> 不可访问</span>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getRoleSummary } from '@/api/yian/config/personnel'

defineOptions({ name: 'ConfigRole' })

const PermTag = defineComponent({
  props: {
    level: {
      type: String,
      default: 'none'
    }
  },
  setup(props) {
    const map: Record<string, { label: string; type: string }> = {
      exec: { label: '可执行', type: 'success' },
      view: { label: '查看', type: 'info' },
      none: { label: '无', type: 'danger' }
    }
    return () => {
      const config = map[props.level] || map.none
      return h(resolveComponent('el-tag'), { type: config.type, size: 'small' }, () => config.label)
    }
  }
})

const loading = ref(false)
const roleList = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    roleList.value = await getRoleSummary()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.role-card:hover {
  border-color: var(--el-color-primary);
}
</style>
