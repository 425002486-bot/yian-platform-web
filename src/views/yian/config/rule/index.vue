<template>
  <ContentWrap>
    <div class="flex justify-between items-center mb-16px">
      <div>
        <el-button type="primary" @click="openRuleForm('create')">新增规则</el-button>
        <el-button @click="showHistory = true">查看变更记录</el-button>
      </div>
      <el-tag>{{ allRules.length }} 条活跃规则</el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 资产准入规则 -->
      <el-tab-pane label="资产准入规则" name="asset">
        <RuleTable :rules="assetRules" @edit="openRuleForm('update', $event)" @delete="handleDelete" />
      </el-tab-pane>
      <!-- 工单过程规则 -->
      <el-tab-pane label="工单过程规则" name="workorder">
        <RuleTable :rules="workorderRules" @edit="openRuleForm('update', $event)" @delete="handleDelete" />
      </el-tab-pane>
      <!-- 放行审核规则 -->
      <el-tab-pane label="放行审核规则" name="release">
        <RuleTable :rules="releaseRules" @edit="openRuleForm('update', $event)" @delete="handleDelete" />
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formType === 'create' ? '新增规则' : '编辑规则'" width="650px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="formData.name" />
        </el-form-item>
        <el-form-item label="规则类型" prop="category">
          <el-select v-model="formData.category" class="!w-100%">
            <el-option label="资产准入" value="asset" />
            <el-option label="工单过程" value="workorder" />
            <el-option label="放行审核" value="release" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发对象" prop="triggerObject">
          <el-input v-model="formData.triggerObject" placeholder="如：设备证照 / 飞控系统" />
        </el-form-item>
        <el-form-item label="触发条件" prop="triggerCondition">
          <el-input v-model="formData.triggerCondition" type="textarea" :rows="2" placeholder="如：SOH < 80%" />
        </el-form-item>
        <el-form-item label="影响范围">
          <el-input v-model="formData.scope" placeholder="如：适航证 / 校准证书" />
        </el-form-item>
        <el-form-item label="触发动作" prop="action">
          <el-select v-model="formData.action" class="!w-100%">
            <el-option label="拦截" value="intercept" />
            <el-option label="限制" value="restrict" />
            <el-option label="提醒" value="alert" />
            <el-option label="人工复核" value="review" />
            <el-option label="限飞" value="restricted_flight" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行节点">
          <el-input v-model="formData.execNode" placeholder="如：资产准入 / 初始诊断 / 放行审核" />
        </el-form-item>
        <el-form-item label="生效站点">
          <el-input v-model="formData.stationScope" placeholder="全部站点" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" class="!w-100%">
            <el-option label="启用" :value="0" />
            <el-option label="停用" :value="1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitRule">
          {{ formType === 'create' ? '创建并启用' : '提交修改' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 变更记录弹窗 -->
    <el-dialog v-model="showHistory" title="规则变更记录" width="750px">
      <el-table :data="changeLogs" stripe max-height="400">
        <el-table-column label="时间" prop="createTime" width="160">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="规则" prop="ruleName" width="160" />
        <el-table-column label="变更" prop="changeType" width="80">
          <template #default="{ row }">
            <el-tag :type="changeTypeTag(row.changeType)" size="small">{{ changeTypeLabel(row.changeType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更前" prop="beforeValue" min-width="140" />
        <el-table-column label="变更后" prop="afterValue" min-width="140" />
        <el-table-column label="操作人" prop="operatorName" width="90" />
      </el-table>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import {
  getRuleList, getRule, createRule, updateRule, deleteRule,
  getRuleChangeLogList, type RuleVO, type RuleChangeLogVO
} from '@/api/yian/config/rule'
import { formatDate } from '@/utils/formatTime'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'ConfigRule' })

const message = useMessage()

// 动作标签映射
const ACTION_MAP: Record<string, { label: string; type: string }> = {
  intercept: { label: '拦截', type: 'danger' },
  restrict: { label: '限制', type: 'warning' },
  alert: { label: '提醒', type: '' },
  review: { label: '复核', type: 'warning' },
  restricted_flight: { label: '限飞', type: 'warning' }
}

const changeTypeLabel = (t: string) => ({ create: '新建', update: '修改', delete: '删除', disable: '停用', enable: '启用' }[t] ?? t)
const changeTypeTag = (t: string) => ({ create: 'success', update: 'warning', delete: 'danger', disable: 'info', enable: 'success' }[t] ?? 'info')

// 规则子表格组件
const RuleTable = defineComponent({
  props: { rules: { type: Array as () => RuleVO[], default: () => [] } },
  emits: ['edit', 'delete'],
  setup(props, { emit }) {
    return () => h(resolveComponent('el-table'), { data: props.rules, stripe: true }, {
      default: () => [
        h(resolveComponent('el-table-column'), { label: '规则名称', prop: 'name', width: 180 }),
        h(resolveComponent('el-table-column'), { label: '触发条件', prop: 'triggerCondition', minWidth: 220 }),
        h(resolveComponent('el-table-column'), { label: '动作', width: 90, align: 'center' }, {
          default: ({ row }: any) => {
            const cfg = ACTION_MAP[row.action] || { label: row.action, type: 'info' }
            return h(resolveComponent('el-tag'), { type: cfg.type, size: 'small' }, () => cfg.label)
          }
        }),
        h(resolveComponent('el-table-column'), { label: '影响数', prop: 'impactCount', width: 80, align: 'center' }),
        h(resolveComponent('el-table-column'), { label: '状态', width: 80, align: 'center' }, {
          default: ({ row }: any) => h(resolveComponent('el-tag'),
            { type: row.status === 0 ? 'success' : 'info', size: 'small' },
            () => row.status === 0 ? '启用' : '停用')
        }),
        h(resolveComponent('el-table-column'), { label: '操作', width: 120, fixed: 'right' }, {
          default: ({ row }: any) => [
            h(resolveComponent('el-button'), { link: true, type: 'primary', onClick: () => emit('edit', row.id) }, () => '编辑'),
            h(resolveComponent('el-button'), { link: true, type: 'danger', onClick: () => emit('delete', row.id) }, () => '删除')
          ]
        })
      ]
    })
  }
})

// 数据
const activeTab = ref('asset')
const allRules = ref<RuleVO[]>([])
const changeLogs = ref<RuleChangeLogVO[]>([])
const showHistory = ref(false)

const assetRules = computed(() => allRules.value.filter(r => r.category === 'asset'))
const workorderRules = computed(() => allRules.value.filter(r => r.category === 'workorder'))
const releaseRules = computed(() => allRules.value.filter(r => r.category === 'release'))

const loadRules = async () => {
  allRules.value = await getRuleList()
}

watch(showHistory, async (val) => {
  if (val) changeLogs.value = await getRuleChangeLogList()
})

// 表单
const formVisible = ref(false)
const formType = ref<'create' | 'update'>('create')
const formRef = ref<FormInstance>()
const submitting = ref(false)

const formData = reactive({
  id: undefined as number | undefined,
  name: '', category: 'asset', triggerCondition: '', triggerObject: '',
  scope: '', action: 'alert', execNode: '', stationScope: '全部站点',
  impactCount: 0, status: 0
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类型', trigger: 'change' }],
  triggerCondition: [{ required: true, message: '请输入触发条件', trigger: 'blur' }],
  action: [{ required: true, message: '请选择动作', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const resetForm = () => {
  formData.id = undefined; formData.name = ''; formData.category = activeTab.value
  formData.triggerCondition = ''; formData.triggerObject = ''; formData.scope = ''
  formData.action = 'alert'; formData.execNode = ''; formData.stationScope = '全部站点'
  formData.impactCount = 0; formData.status = 0
}

const openRuleForm = async (type: 'create' | 'update', id?: number) => {
  formType.value = type
  resetForm()
  if (type === 'update' && id) {
    const data = await getRule(id)
    Object.assign(formData, data)
  }
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const handleSubmitRule = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (formType.value === 'create') {
      await createRule(formData)
      message.success('创建成功')
    } else {
      await updateRule(formData)
      message.success('修改成功')
    }
    formVisible.value = false
    loadRules()
  } finally { submitting.value = false }
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await deleteRule(id)
    message.success('删除成功')
    loadRules()
  } catch {}
}

onMounted(() => { loadRules() })
</script>
