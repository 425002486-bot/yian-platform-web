<template>
  <ContentWrap>
    <el-alert
      title="角色说明"
      type="info"
      :closable="false"
      class="mb-16px"
      description="以下为系统预定义的业务角色及权限矩阵。MVP 阶段角色不可自定义，如需调整请联系管理员。"
    />

    <el-table :data="roleList" stripe border>
      <el-table-column label="角色名称" prop="name" width="130" fixed="left" />
      <el-table-column label="说明" prop="description" min-width="200" />
      <el-table-column label="设备台账" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.asset" /></template>
      </el-table-column>
      <el-table-column label="工单受理" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.intake" /></template>
      </el-table-column>
      <el-table-column label="初诊维修" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.repair" /></template>
      </el-table-column>
      <el-table-column label="备件领料" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.parts" /></template>
      </el-table-column>
      <el-table-column label="复检" width="80" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.inspect" /></template>
      </el-table-column>
      <el-table-column label="放行审核" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.release" /></template>
      </el-table-column>
      <el-table-column label="审计日志" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.audit" /></template>
      </el-table-column>
      <el-table-column label="基础配置" width="90" align="center">
        <template #default="{ row }"><PermTag :level="row.perms.config" /></template>
      </el-table-column>
    </el-table>

    <div class="mt-16px text-gray-400 text-sm">
      <span class="mr-16px"><el-tag type="success" size="small">可执行</el-tag> 可发起和操作</span>
      <span class="mr-16px"><el-tag type="info" size="small">查看</el-tag> 只能查看</span>
      <span><el-tag type="danger" size="small">无</el-tag> 不可见</span>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'

defineOptions({ name: 'ConfigRole' })

// 权限标签组件
const PermTag = defineComponent({
  props: { level: { type: String, default: 'none' } },
  setup(props) {
    const map: Record<string, { label: string; type: string }> = {
      exec: { label: '可执行', type: 'success' },
      view: { label: '查看', type: 'info' },
      none: { label: '无', type: 'danger' }
    }
    return () => {
      const cfg = map[props.level] || map.none
      return h(resolveComponent('el-tag'), { type: cfg.type, size: 'small' }, () => cfg.label)
    }
  }
})

const roleList = ref([
  {
    name: '站点负责人', description: '查看设备与工单，派工调度，推动审批节点',
    perms: { asset: 'view', intake: 'exec', repair: 'view', parts: 'view', inspect: 'view', release: 'view', audit: 'view', config: 'exec' }
  },
  {
    name: '机务人员', description: '执行受理、初诊、领料、维修等一线作业',
    perms: { asset: 'view', intake: 'exec', repair: 'exec', parts: 'exec', inspect: 'view', release: 'view', audit: 'view', config: 'none' }
  },
  {
    name: '复检人员', description: '确认或驳回复检结果',
    perms: { asset: 'view', intake: 'view', repair: 'view', parts: 'view', inspect: 'exec', release: 'view', audit: 'view', config: 'none' }
  },
  {
    name: '放行审核人', description: '完成放行审核，形成放行结论',
    perms: { asset: 'view', intake: 'view', repair: 'view', parts: 'view', inspect: 'view', release: 'exec', audit: 'view', config: 'none' }
  },
  {
    name: '备件管理员', description: '库存管理、入库登记、领退料处理',
    perms: { asset: 'view', intake: 'view', repair: 'view', parts: 'exec', inspect: 'view', release: 'view', audit: 'view', config: 'none' }
  },
  {
    name: '审计人员', description: '查看日志、履历和责任链，完整追溯关键操作',
    perms: { asset: 'view', intake: 'view', repair: 'view', parts: 'view', inspect: 'view', release: 'view', audit: 'exec', config: 'none' }
  }
])
</script>
