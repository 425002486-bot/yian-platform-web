<template>
  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="mb-16px" @submit.prevent="handleQuery">
      <el-form-item label="站点">
        <el-select v-model="queryParams.stationId" placeholder="全部站点" clearable class="!w-160px">
          <el-option v-for="s in stationOptions" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="queryParams.bizRole" placeholder="全部角色" clearable class="!w-140px">
          <el-option v-for="r in bizRoleOptions" :key="r.code" :label="r.label" :value="r.code" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button type="primary" @click="openForm('create')">新增人员</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="姓名" prop="userName" width="100" />
      <el-table-column label="岗位" prop="jobTitle" width="120" />
      <el-table-column label="业务角色" prop="bizRoleLabel" width="120" />
      <el-table-column label="所属站点" prop="stationName" width="140" />
      <el-table-column label="可参与环节" prop="stages" min-width="200" />
      <el-table-column label="手机" prop="mobile" width="130" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.userStatus === 0 ? 'success' : 'info'" size="small">
            {{ row.userStatus === 0 ? '在职' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openForm('update', row.id)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      v-model:current-page="queryParams.pageNo"
      v-model:page-size="queryParams.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="mt-16px justify-end"
      @size-change="getList"
      @current-change="getList"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="formType === 'create' ? '新增人员' : '编辑人员'" width="550px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="系统用户" prop="userId">
          <el-select
            v-model="formData.userId"
            placeholder="选择用户"
            filterable
            class="!w-100%"
            :disabled="formType === 'update'"
          >
            <el-option v-for="u in userOptions" :key="u.id" :label="u.nickname" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位名称" prop="jobTitle">
          <el-input v-model="formData.jobTitle" placeholder="如：维修工程师" />
        </el-form-item>
        <el-form-item label="业务角色" prop="bizRole">
          <el-select v-model="formData.bizRole" placeholder="选择角色" class="!w-100%" @change="onRoleChange">
            <el-option v-for="r in bizRoleOptions" :key="r.code" :label="r.label" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属站点" prop="stationId">
          <el-select v-model="formData.stationId" placeholder="选择站点" clearable class="!w-100%">
            <el-option v-for="s in stationOptions" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="可参与环节">
          <el-input v-model="formData.stages" placeholder="如：受理、初诊、维修" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import {
  getPersonnelPage, getPersonnel, createPersonnel, updatePersonnel, deletePersonnel, getBizRoles,
  type PersonnelVO
} from '@/api/yian/config/personnel'
import { getStationPage } from '@/api/yian/config/station'
import * as UserApi from '@/api/system/user'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'ConfigPeople' })

const message = useMessage()
const loading = ref(false)
const list = ref<PersonnelVO[]>([])
const total = ref(0)

const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  stationId: undefined as number | undefined,
  bizRole: undefined as string | undefined
})

// 下拉数据
const stationOptions = ref<any[]>([])
const bizRoleOptions = ref<any[]>([])
const userOptions = ref<any[]>([])

const ROLE_STAGES: Record<string, string> = {
  site_lead: '全流程',
  ops_staff: '受理、初诊、维修',
  inspector: '复检',
  release_approver: '放行',
  parts_manager: '领料、退料、入库',
  auditor: '审计日志查看'
}

const loadOptions = async () => {
  const [stationData, roles, users] = await Promise.all([
    getStationPage({ pageNo: 1, pageSize: 100 }),
    getBizRoles(),
    UserApi.getSimpleUserList()
  ])
  stationOptions.value = stationData.list
  bizRoleOptions.value = roles
  userOptions.value = users
}

const getList = async () => {
  loading.value = true
  try {
    const data = await getPersonnelPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => { queryParams.pageNo = 1; getList() }
const handleReset = () => {
  queryParams.stationId = undefined
  queryParams.bizRole = undefined
  queryParams.pageNo = 1
  getList()
}

// ====== 新增/编辑 ======
const dialogVisible = ref(false)
const formType = ref<'create' | 'update'>('create')
const formRef = ref<FormInstance>()
const submitting = ref(false)

const formData = reactive({
  id: undefined as number | undefined,
  userId: undefined as number | undefined,
  stationId: undefined as number | undefined,
  jobTitle: '',
  bizRole: undefined as string | undefined,
  stages: ''
})

const formRules: FormRules = {
  userId: [{ required: true, message: '请选择系统用户', trigger: 'change' }],
  bizRole: [{ required: true, message: '请选择业务角色', trigger: 'change' }]
}

const resetForm = () => {
  formData.id = undefined
  formData.userId = undefined
  formData.stationId = undefined
  formData.jobTitle = ''
  formData.bizRole = undefined
  formData.stages = ''
}

const openForm = async (type: 'create' | 'update', id?: number) => {
  formType.value = type
  resetForm()
  if (type === 'update' && id) {
    const data = await getPersonnel(id)
    Object.assign(formData, data)
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const onRoleChange = (role: string) => {
  formData.stages = ROLE_STAGES[role] || ''
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (formType.value === 'create') {
      await createPersonnel(formData)
      message.success('新增成功')
    } else {
      await updatePersonnel(formData)
      message.success('修改成功')
    }
    dialogVisible.value = false
    getList()
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await deletePersonnel(id)
    message.success('删除成功')
    getList()
  } catch {}
}

onMounted(() => {
  loadOptions()
  getList()
})
</script>
