<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备详情"
      :content="device?.code ? `设备巡检 - ${device.code}` : '设备巡检'"
    />

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="device">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">设备状态</div>
            <el-tag :type="record.currentStatusTagType">{{ record.currentStatusLabel }}</el-tag>
            <div class="summary-block__headline mt-10px">{{ record.enableStatusLabel }}</div>
            <div class="summary-block__text">{{ record.statusReason }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">最近巡检</div>
            <div class="summary-block__headline">{{ record.latestInspectionAt || '暂无记录' }}</div>
            <div class="summary-block__text">{{ record.latestInspectionConclusion }}</div>
            <div class="summary-block__hint">{{ record.inspectionDueText }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">填写说明</div>
            <div class="summary-block__text">
              巡检项默认全部勾选为正常，取消勾选并在备注中补充异常说明即可。
            </div>
            <div class="summary-block__hint">提交后会自动返回设备详情，并定位到巡检记录区块。</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">发起设备巡检</div>
        </template>
        <el-form ref="inspectionFormRef" :model="inspectionForm" :rules="inspectionRules" label-width="120px">
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检时间" prop="inspectedAt">
                <el-date-picker
                  v-model="inspectionForm.inspectedAt"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  class="!w-1/1"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检人" prop="inspector">
                <el-input v-model="inspectionForm.inspector" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检周期" prop="cycleLabel">
                <el-select v-model="inspectionForm.cycleLabel" class="!w-1/1">
                  <el-option label="30天例行巡检" value="30天例行巡检" />
                  <el-option label="15天高频巡检" value="15天高频巡检" />
                  <el-option label="异常复核巡检" value="异常复核巡检" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检结论" prop="conclusion">
                <el-select v-model="inspectionForm.conclusion" class="!w-1/1">
                  <el-option label="合格" value="pass" />
                  <el-option label="观察" value="observe" />
                  <el-option label="停飞建议" value="grounded" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="结构与外观" prop="structureItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.structureItems">
                <el-checkbox
                  v-for="item in structureOptions"
                  :key="item"
                  :label="item"
                >
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.structureNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充结构与外观说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="动力系统" prop="powerItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.powerItems">
                <el-checkbox v-for="item in powerOptions" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.powerNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充动力系统说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="电子与传感器" prop="sensorItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.sensorItems">
                <el-checkbox v-for="item in sensorOptions" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.sensorNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充电子与传感器说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="证照合规" prop="complianceItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.complianceItems">
                <el-checkbox
                  v-for="item in complianceOptions"
                  :key="item"
                  :label="item"
                >
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.complianceNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充证照合规说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="照片/附件说明" prop="evidence">
            <el-input
              v-model="inspectionForm.evidence"
              placeholder="填写已上传的照片或附件说明，如：巡检照片 3 张"
            />
          </el-form-item>
          <el-form-item label="巡检备注" prop="notes">
            <el-input v-model="inspectionForm.notes" type="textarea" placeholder="请输入巡检备注" />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="inspectionForm.suggestedWorkorder">
              检测到重大隐患时提示生成报修工单
            </el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitLoading" @click="handleSubmitInspection">
              提交巡检
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </template>

    <el-empty v-else description="未找到对应设备数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  resolveAssetDeviceMasterRecord,
  submitAssetDeviceInspection,
  type AssetDeviceInspectionRecordVO,
  type AssetDeviceMasterRecordVO
} from '@/api/yian/asset/deviceMaster'

defineOptions({ name: 'AssetDeviceInspection' })

const structureOptions = ['机臂完好', '起落架完好', '外壳完好', '螺丝紧固']
const powerOptions = ['桨叶完好', '电机运转正常', '电调无异常', '供电接口正常']
const sensorOptions = ['天线连接正常', '图传正常', '避障正常', 'RTK/定位正常']
const complianceOptions = ['二维码清晰', '保险有效', '校准记录有效', '合规资料齐全']

type InspectionFormState = {
  inspectedAt: string
  inspector: string
  cycleLabel: string
  conclusion: AssetDeviceInspectionRecordVO['conclusion']
  structureItems: string[]
  structureNote: string
  powerItems: string[]
  powerNote: string
  sensorItems: string[]
  sensorNote: string
  complianceItems: string[]
  complianceNote: string
  notes: string
  evidence: string
  suggestedWorkorder: boolean
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const loading = ref(false)
const submitLoading = ref(false)
const device = ref<DvMachineryVO | null>(null)
const record = ref<AssetDeviceMasterRecordVO>(resolveAssetDeviceMasterRecord(null))
const inspectionFormRef = ref()
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const createInspectionForm = (): InspectionFormState => ({
  inspectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  inspector: currentOperatorName.value,
  cycleLabel: '30天例行巡检',
  conclusion: 'pass',
  structureItems: [...structureOptions],
  structureNote: '',
  powerItems: [...powerOptions],
  powerNote: '',
  sensorItems: [...sensorOptions],
  sensorNote: '',
  complianceItems: [...complianceOptions],
  complianceNote: '',
  notes: '',
  evidence: '',
  suggestedWorkorder: false
})

const inspectionForm = ref<InspectionFormState>(createInspectionForm())

const checklistValidator =
  (field: keyof InspectionFormState) => (_rule: unknown, value: string[], callback: (error?: Error) => void) => {
    const noteField = `${String(field).replace('Items', 'Note')}` as keyof InspectionFormState
    const noteValue = String(inspectionForm.value[noteField] || '').trim()
    if (value.length || noteValue) {
      callback()
      return
    }
    callback(new Error('请至少勾选一项正常项，或在备注中说明异常'))
  }

const inspectionRules = reactive({
  inspectedAt: [{ required: true, message: '巡检时间不能为空', trigger: 'change' }],
  inspector: [{ required: true, message: '巡检人不能为空', trigger: 'blur' }],
  conclusion: [{ required: true, message: '请选择巡检结论', trigger: 'change' }],
  structureItems: [{ validator: checklistValidator('structureItems'), trigger: 'change' }],
  powerItems: [{ validator: checklistValidator('powerItems'), trigger: 'change' }],
  sensorItems: [{ validator: checklistValidator('sensorItems'), trigger: 'change' }],
  complianceItems: [{ validator: checklistValidator('complianceItems'), trigger: 'change' }]
})

const getDeviceId = () => Number(route.params.id)

const syncRecord = () => {
  record.value = resolveAssetDeviceMasterRecord(device.value)
  inspectionForm.value.inspector = currentOperatorName.value
}

const ensureCurrentOperator = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  inspectionForm.value.inspector = currentOperatorName.value
}

const getDetail = async () => {
  const id = getDeviceId()
  if (!id) {
    device.value = null
    return
  }
  loading.value = true
  try {
    await ensureCurrentOperator()
    device.value = await DvMachineryApi.getMachinery(id)
    syncRecord()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push({
    path: `/asset/device/detail/${getDeviceId()}`,
    query: { anchor: 'inspection' }
  })
}

const summarizeChecklist = (selected: string[], allOptions: string[], note: string) => {
  const missing = allOptions.filter((item) => !selected.includes(item))
  const parts: string[] = []
  if (selected.length) {
    parts.push(`正常项：${selected.join('、')}`)
  }
  if (missing.length) {
    parts.push(`异常/待复核：${missing.join('、')}`)
  }
  if (note.trim()) {
    parts.push(`备注：${note.trim()}`)
  }
  return parts.join('；')
}

const handleSubmitInspection = async () => {
  await inspectionFormRef.value.validate()
  if (!device.value?.code) return
  submitLoading.value = true
  try {
    inspectionForm.value.inspector = currentOperatorName.value
    const nextRecord = submitAssetDeviceInspection(device.value, {
      code: device.value.code,
      inspectedAt: inspectionForm.value.inspectedAt,
      inspector: inspectionForm.value.inspector,
      cycleLabel: inspectionForm.value.cycleLabel,
      structureStatus: summarizeChecklist(
        inspectionForm.value.structureItems,
        structureOptions,
        inspectionForm.value.structureNote
      ),
      powerStatus: summarizeChecklist(
        inspectionForm.value.powerItems,
        powerOptions,
        inspectionForm.value.powerNote
      ),
      sensorStatus: summarizeChecklist(
        inspectionForm.value.sensorItems,
        sensorOptions,
        inspectionForm.value.sensorNote
      ),
      complianceStatus: summarizeChecklist(
        inspectionForm.value.complianceItems,
        complianceOptions,
        inspectionForm.value.complianceNote
      ),
      conclusion: inspectionForm.value.conclusion,
      notes: inspectionForm.value.notes,
      evidence: inspectionForm.value.evidence,
      suggestedWorkorder: inspectionForm.value.suggestedWorkorder
    })
    message.success(
      inspectionForm.value.suggestedWorkorder && inspectionForm.value.conclusion === 'grounded'
        ? '巡检已提交，建议同步发起报修工单。'
        : '巡检已提交。'
    )
    router.push({
      path: `/asset/device/detail/${getDeviceId()}`,
      query: {
        anchor: 'inspection',
        inspectionId: nextRecord.inspections[0]?.id || ''
      }
    })
  } finally {
    submitLoading.value = false
  }
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
.summary-block {
  min-height: 180px;
}

.summary-block__title,
.text-secondary,
.summary-block__hint {
  color: var(--el-text-color-secondary);
}

.summary-block__headline {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.summary-block__text {
  margin-top: 8px;
  line-height: 1.7;
}

.summary-block__hint {
  margin-top: 10px;
  line-height: 1.6;
}

.card-header {
  font-weight: 600;
}

.checklist-block {
  width: 100%;
}

:deep(.el-checkbox-group) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 16px;
}
</style>
