<template>
  <ContentWrap>
    <el-alert
      type="info"
      :closable="false"
      class="mb-16px"
      title="SLA 规则定义工单各阶段的默认处理时限，超时将自动触发提醒或标记。"
    />

    <el-table v-loading="loading" :data="slaRules" stripe>
      <el-table-column label="工单阶段" prop="stage" width="140" />
      <el-table-column label="默认时限" width="160">
        <template #default="{ row }">
          <span v-if="editingId !== row.id">{{ row.deadlineHours }} 小时</span>
          <el-input-number
            v-else
            v-model="editForm.deadlineHours"
            :min="1"
            :max="720"
            size="small"
            class="!w-120px"
          />
        </template>
      </el-table-column>
      <el-table-column label="超时动作" min-width="280">
        <template #default="{ row }">
          <span v-if="editingId !== row.id">{{ row.timeoutAction }}</span>
          <el-input v-else v-model="editForm.timeoutAction" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="允许调整" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.adjustable ? 'success' : 'info'" size="small">
            {{ row.adjustable ? '允许' : '不允许' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <template v-if="editingId === row.id">
            <el-button link type="primary" @click="handleSave">保存</el-button>
            <el-button link @click="editingId = null">取消</el-button>
          </template>
          <el-button v-else-if="row.adjustable" link type="primary" @click="startEdit(row)">
            编辑
          </el-button>
          <span v-else class="text-gray-300 text-sm">不可调整</span>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import { getSlaRuleList, syncRuleRuntimeConfig, updateSlaRule, type SlaRuleVO } from '@/api/yian/config/rule'

defineOptions({ name: 'ConfigSla' })

const message = useMessage()
const loading = ref(false)
const slaRules = ref<SlaRuleVO[]>([])
const editingId = ref<number | null>(null)
const editForm = reactive({ id: 0, deadlineHours: 0, timeoutAction: '' })

const loadData = async () => {
  loading.value = true
  try {
    slaRules.value = await getSlaRuleList()
  } finally {
    loading.value = false
  }
}

const startEdit = (row: SlaRuleVO) => {
  editingId.value = row.id
  editForm.id = row.id
  editForm.deadlineHours = row.deadlineHours
  editForm.timeoutAction = row.timeoutAction
}

const handleSave = async () => {
  await updateSlaRule(editForm)
  await syncRuleRuntimeConfig(true)
  message.success('保存成功')
  editingId.value = null
  loadData()
}

onMounted(() => { loadData() })
</script>
