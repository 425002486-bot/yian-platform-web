<template>
  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="mb-16px" @submit.prevent="handleQuery">
      <el-form-item label="站点名称">
        <el-input v-model="queryParams.name" placeholder="站点名称" clearable class="!w-160px" />
      </el-form-item>
      <el-form-item label="所属区域">
        <el-select v-model="queryParams.region" placeholder="全部" clearable class="!w-120px">
          <el-option label="华东" value="华东" />
          <el-option label="华北" value="华北" />
          <el-option label="华南" value="华南" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" placeholder="全部" clearable class="!w-120px">
          <el-option label="启用" :value="0" />
          <el-option label="受限运行" :value="1" />
          <el-option label="停用" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="mb-16px">
      <el-button type="primary" @click="openForm('create')">新增站点</el-button>
    </div>

    <el-table v-loading="loading" :data="stationList" stripe>
      <el-table-column label="站点编码" prop="code" width="130" />
      <el-table-column label="站点名称" prop="name" width="180" />
      <el-table-column label="所属区域" prop="region" width="100" />
      <el-table-column label="负责人" prop="principalUserName" width="100" />
      <el-table-column label="服务范围" prop="serviceScope" min-width="200" />
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
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
    <el-dialog v-model="dialogVisible" :title="formType === 'create' ? '新增站点' : '编辑站点'" width="600px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="站点编码" prop="code">
          <el-input v-model="formData.code" placeholder="如 ST-HD-001" />
        </el-form-item>
        <el-form-item label="站点名称" prop="name">
          <el-input v-model="formData.name" placeholder="站点名称" />
        </el-form-item>
        <el-form-item label="所属区域" prop="region">
          <el-select v-model="formData.region" placeholder="选择区域" class="!w-100%">
            <el-option label="华东" value="华东" />
            <el-option label="华北" value="华北" />
            <el-option label="华南" value="华南" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="principalUserId">
          <el-select v-model="formData.principalUserId" placeholder="选择负责人" filterable class="!w-100%">
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.nickname"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务范围" prop="serviceScope">
          <el-input v-model="formData.serviceScope" placeholder="如：电力巡检 / 河道巡检" />
        </el-form-item>
        <el-form-item label="运行状态" prop="status">
          <el-select v-model="formData.status" placeholder="选择状态" class="!w-100%">
            <el-option label="启用" :value="0" />
            <el-option label="受限运行" :value="1" />
            <el-option label="停用" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ formType === 'create' ? '创建站点' : '提交修改' }}
        </el-button>
      </template>
    </el-dialog>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { ContentWrap } from '@/components/ContentWrap'
import {
  getStationPage, getStation, createStation, updateStation, deleteStation,
  type StationVO
} from '@/api/yian/config/station'
import * as UserApi from '@/api/system/user'
import type { FormInstance, FormRules } from 'element-plus'

defineOptions({ name: 'ConfigStation' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(false)
const stationList = ref<StationVO[]>([])
const total = ref(0)

const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  name: undefined as string | undefined,
  region: undefined as string | undefined,
  status: undefined as number | undefined
})

const statusLabel = (s: number) => ['启用', '受限运行', '停用'][s] ?? '未知'
const statusTagType = (s: number) => (['success', 'warning', 'danger'] as const)[s] ?? 'info'

const getList = async () => {
  loading.value = true
  try {
    const data = await getStationPage(queryParams)
    stationList.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const handleReset = () => {
  queryParams.name = undefined
  queryParams.region = undefined
  queryParams.status = undefined
  queryParams.pageNo = 1
  getList()
}

// ====== 新增/编辑 ======
const dialogVisible = ref(false)
const formType = ref<'create' | 'update'>('create')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const userOptions = ref<any[]>([])

const formData = reactive({
  id: undefined as number | undefined,
  code: '',
  name: '',
  region: undefined as string | undefined,
  principalUserId: undefined as number | undefined,
  serviceScope: '',
  status: 0,
  remark: ''
})

const formRules: FormRules = {
  code: [{ required: true, message: '请输入站点编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const resetForm = () => {
  formData.id = undefined
  formData.code = ''
  formData.name = ''
  formData.region = undefined
  formData.principalUserId = undefined
  formData.serviceScope = ''
  formData.status = 0
  formData.remark = ''
}

const openForm = async (type: 'create' | 'update', id?: number) => {
  formType.value = type
  resetForm()
  // 加载用户列表
  if (userOptions.value.length === 0) {
    const users = await UserApi.getSimpleUserList()
    userOptions.value = users
  }
  if (type === 'update' && id) {
    const data = await getStation(id)
    Object.assign(formData, data)
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (formType.value === 'create') {
      await createStation(formData as any)
      message.success('创建成功')
    } else {
      await updateStation(formData as any)
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
    await deleteStation(id)
    message.success('删除成功')
    getList()
  } catch {}
}

onMounted(() => {
  getList()
})
</script>
