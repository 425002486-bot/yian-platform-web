<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回设备详情"
      :content="device?.code ? `设备巡检 - ${device.code}` : '设备巡检'"
    />

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="device">
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
                  <el-option label="异常" value="grounded" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item
            v-for="section in checklistSections"
            :key="section.label"
            :label="section.label"
            :prop="section.itemsField"
          >
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm[section.itemsField]">
                <el-checkbox v-for="item in section.options" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm[section.noteField]"
                type="textarea"
                :rows="2"
                :placeholder="section.placeholder"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="上传附件">
            <el-upload
              v-model:file-list="inspectionForm.uploadFiles"
              action="#"
              :auto-upload="false"
              multiple
              list-type="text"
            >
              <el-button type="primary" plain>上传附件</el-button>
              <template #tip>
                <div class="el-upload__tip">
                  支持上传现场图片、巡检日志和补充材料；图片格式支持 JPG、PNG、JPEG，日志支持
                  LOG、TXT、CSV、JSON、ZIP，附件支持 PDF、Word、Excel、检测报告等文件。
                </div>
              </template>
            </el-upload>
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
import type { UploadUserFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, DvMachineryVO } from '@/api/mes/dv/machinery'
import { useUserStoreWithOut } from '@/store/modules/user'
import {
  linkInspectionWorkorderToDevice,
  submitAssetDeviceInspection,
  type AssetDeviceInspectionRecordVO
} from '@/api/yian/asset/deviceMaster'
import type { AssetInspectionAttachmentVO } from '@/api/yian/asset'
import {
  YianWorkorderApi,
  type WorkorderAttachmentItem,
  type WorkorderCreateReqVO
} from '@/api/yian/workorder'

defineOptions({ name: 'AssetDeviceInspection' })

const AIRCRAFT_MACHINERY_TYPE_NAME = '无人机整机'

type ChecklistItemsField =
  | 'structureItems'
  | 'powerItems'
  | 'sensorItems'
  | 'complianceItems'

type ChecklistNoteField =
  | 'structureNote'
  | 'powerNote'
  | 'sensorNote'
  | 'complianceNote'

type ChecklistSection = {
  label: string
  itemsField: ChecklistItemsField
  noteField: ChecklistNoteField
  options: string[]
  placeholder: string
}

const aircraftTemplate: ChecklistSection[] = [
  {
    label: '结构与外观',
    itemsField: 'structureItems',
    noteField: 'structureNote',
    options: ['机身外观完整', '机臂/起落架稳固', '桨叶无损伤', '挂载固定正常'],
    placeholder: '如有异常，请补充结构与外观说明'
  },
  {
    label: '动力系统',
    itemsField: 'powerItems',
    noteField: 'powerNote',
    options: ['电机运转正常', '电调无告警', '供电接口正常', '通电自检通过'],
    placeholder: '如有异常，请补充动力系统说明'
  },
  {
    label: '电子与传感器',
    itemsField: 'sensorItems',
    noteField: 'sensorNote',
    options: ['图传链路正常', '避障/视觉正常', 'RTK/定位正常', '飞控参数正常'],
    placeholder: '如有异常，请补充电子与传感器说明'
  },
  {
    label: '证照与合规',
    itemsField: 'complianceItems',
    noteField: 'complianceNote',
    options: ['设备铭牌清晰', '保险/校准在有效期内', '主档资料齐全', '首飞/例行记录已归档'],
    placeholder: '如有异常，请补充证照与合规说明'
  }
]

const generalTemplate: ChecklistSection[] = [
  {
    label: '外观与固定',
    itemsField: 'structureItems',
    noteField: 'structureNote',
    options: ['外壳完整', '安装固定正常', '铭牌清晰', '无明显松动或破损'],
    placeholder: '如有异常，请补充外观与固定说明'
  },
  {
    label: '接口与线缆',
    itemsField: 'powerItems',
    noteField: 'powerNote',
    options: ['线缆完好', '接口接触正常', '卡扣/插头正常', '供电连接正常'],
    placeholder: '如有异常，请补充接口与线缆说明'
  },
  {
    label: '通电与通讯',
    itemsField: 'sensorItems',
    noteField: 'sensorNote',
    options: ['通电自检通过', '通讯链路正常', '无异常告警', '状态指示正常'],
    placeholder: '如有异常，请补充通电与通讯说明'
  },
  {
    label: '功能与合规',
    itemsField: 'complianceItems',
    noteField: 'complianceNote',
    options: ['核心功能正常', '固件版本符合要求', '必要资料齐全', '使用记录可追溯'],
    placeholder: '如有异常，请补充功能与合规说明'
  }
]

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
  suggestedWorkorder: boolean
  uploadFiles: UploadUserFile[]
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const loading = ref(false)
const submitLoading = ref(false)
const device = ref<DvMachineryVO | null>(null)
const inspectionFormRef = ref()
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const isAircraftDevice = computed(() => device.value?.machineryTypeName === AIRCRAFT_MACHINERY_TYPE_NAME)

const checklistSections = computed(() => (isAircraftDevice.value ? aircraftTemplate : generalTemplate))

const createInspectionForm = (): InspectionFormState => ({
  inspectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  inspector: currentOperatorName.value,
  cycleLabel: '30天例行巡检',
  conclusion: 'pass',
  structureItems: checklistSections.value[0]?.options.slice() || [],
  structureNote: '',
  powerItems: checklistSections.value[1]?.options.slice() || [],
  powerNote: '',
  sensorItems: checklistSections.value[2]?.options.slice() || [],
  sensorNote: '',
  complianceItems: checklistSections.value[3]?.options.slice() || [],
  complianceNote: '',
  notes: '',
  suggestedWorkorder: false,
  uploadFiles: []
})

const inspectionForm = ref<InspectionFormState>(createInspectionForm())

const resetInspectionForm = () => {
  inspectionForm.value = createInspectionForm()
}

const checklistValidator =
  (field: ChecklistItemsField) => (_rule: unknown, value: string[], callback: (error?: Error) => void) => {
    const noteField = `${String(field).replace('Items', 'Note')}` as ChecklistNoteField
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
  resetInspectionForm()
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
    parts.push(`关注项：${missing.join('、')}`)
  }
  if (note.trim()) {
    parts.push(`备注：${note.trim()}`)
  }
  return parts.join('；')
}

const formatFileSize = (size?: number) => {
  if (!size) return ''
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

const detectUploadCategory = (fileName: string): AssetInspectionAttachmentVO['category'] => {
  const normalized = fileName.toLowerCase()
  if (/\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(normalized)) return '图片'
  if (/\.(log|txt|csv|json|zip|rar|7z)$/i.test(normalized)) return '日志'
  return '附件'
}

const mapUploadFilesToAttachments = (
  files: UploadUserFile[],
  inspectedAt: string,
  inspector: string
): AssetInspectionAttachmentVO[] =>
  files.map((file, index) => {
    const category = detectUploadCategory(file.name)
    return {
      id: `${category}-${Date.now()}-${index}`,
      fileName: file.name,
      category,
      summary:
        category === '图片'
          ? '设备巡检现场图片'
          : category === '日志'
            ? '设备巡检日志文件'
            : '设备巡检补充附件',
      uploadedAt: inspectedAt,
      uploadedBy: inspector,
      sizeLabel: formatFileSize(file.size)
    }
  })

const buildEvidenceSummary = (attachments: AssetInspectionAttachmentVO[]) => {
  if (!attachments.length) return ''
  const counts = attachments.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .map(([key, value]) => `${key}${value}份`)
    .join(' / ')
}

const mapInspectionAttachmentsToWorkorder = (
  attachments: AssetInspectionAttachmentVO[]
): Pick<WorkorderCreateReqVO, 'imageAttachments' | 'logAttachments'> => {
  const imageAttachments: WorkorderAttachmentItem[] = []
  const logAttachments: WorkorderAttachmentItem[] = []

  attachments.forEach((item) => {
    const mapped: WorkorderAttachmentItem = {
      name: item.fileName,
      type: item.category === '图片' ? 'image' : 'log',
      size: 0,
      mimeType:
        item.category === '图片'
          ? 'image/*'
          : item.category === '日志'
            ? 'text/plain'
            : 'application/octet-stream'
    }
    if (mapped.type === 'image') {
      imageAttachments.push(mapped)
    } else {
      logAttachments.push(mapped)
    }
  })

  return {
    imageAttachments: imageAttachments.length ? imageAttachments : undefined,
    logAttachments: logAttachments.length ? logAttachments : undefined
  }
}

const buildInspectionWorkorderSymptom = () => {
  const labels: Record<AssetDeviceInspectionRecordVO['conclusion'], string> = {
    pass: '巡检通过',
    observe: '巡检发现待复检项',
    grounded: '巡检发现异常，建议停用整改'
  }
  return `${inspectionForm.value.cycleLabel}${labels[inspectionForm.value.conclusion]}`
}

const buildInspectionWorkorderDescription = (
  attachments: AssetInspectionAttachmentVO[],
  evidenceSummary: string
) => {
  const segments = [
    inspectionForm.value.notes.trim(),
    summarizeChecklist(
      inspectionForm.value.structureItems,
      checklistSections.value[0]?.options || [],
      inspectionForm.value.structureNote
    ),
    summarizeChecklist(
      inspectionForm.value.powerItems,
      checklistSections.value[1]?.options || [],
      inspectionForm.value.powerNote
    ),
    summarizeChecklist(
      inspectionForm.value.sensorItems,
      checklistSections.value[2]?.options || [],
      inspectionForm.value.sensorNote
    ),
    summarizeChecklist(
      inspectionForm.value.complianceItems,
      checklistSections.value[3]?.options || [],
      inspectionForm.value.complianceNote
    ),
    evidenceSummary ? `附件摘要：${evidenceSummary}` : '',
    attachments.length ? `巡检附件：${attachments.map((item) => item.fileName).join('、')}` : ''
  ]
  return segments.filter(Boolean).join('\n')
}

const handleSubmitInspection = async () => {
  await inspectionFormRef.value.validate()
  if (!device.value?.code) return
  submitLoading.value = true
  try {
    inspectionForm.value.inspector = currentOperatorName.value
    const inspectedAt = inspectionForm.value.inspectedAt
    const attachments = mapUploadFilesToAttachments(
      inspectionForm.value.uploadFiles,
      inspectedAt,
      inspectionForm.value.inspector
    )
    const evidenceSummary = buildEvidenceSummary(attachments)

    const shouldCreateWorkorder =
      inspectionForm.value.conclusion !== 'pass' && inspectionForm.value.suggestedWorkorder

    const nextRecord = submitAssetDeviceInspection(device.value, {
      code: device.value.code,
      inspectedAt,
      inspector: inspectionForm.value.inspector,
      cycleLabel: inspectionForm.value.cycleLabel,
      structureStatus: summarizeChecklist(
        inspectionForm.value.structureItems,
        checklistSections.value[0]?.options || [],
        inspectionForm.value.structureNote
      ),
      powerStatus: summarizeChecklist(
        inspectionForm.value.powerItems,
        checklistSections.value[1]?.options || [],
        inspectionForm.value.powerNote
      ),
      sensorStatus: summarizeChecklist(
        inspectionForm.value.sensorItems,
        checklistSections.value[2]?.options || [],
        inspectionForm.value.sensorNote
      ),
      complianceStatus: summarizeChecklist(
        inspectionForm.value.complianceItems,
        checklistSections.value[3]?.options || [],
        inspectionForm.value.complianceNote
      ),
      conclusion: inspectionForm.value.conclusion,
      notes: inspectionForm.value.notes,
      evidence: evidenceSummary,
      suggestedWorkorder: inspectionForm.value.suggestedWorkorder,
      attachments
    })
    let createdWorkorderId = 0
    if (shouldCreateWorkorder) {
      const attachmentPayload = mapInspectionAttachmentsToWorkorder(attachments)
      const order = YianWorkorderApi.create({
        deviceId: getDeviceId(),
        deviceCode: device.value.code,
        deviceName: device.value.name || device.value.code,
        siteName: nextRecord.siteName,
        source: 'inspection',
        faultTime: inspectedAt,
        taskScene: inspectionForm.value.cycleLabel,
        symptom: buildInspectionWorkorderSymptom(),
        description: buildInspectionWorkorderDescription(attachments, evidenceSummary),
        creator: inspectionForm.value.inspector,
        ...attachmentPayload
      })
      createdWorkorderId = order.id
      linkInspectionWorkorderToDevice(device.value, {
        code: device.value.code,
        orderNo: order.orderNo,
        creator: inspectionForm.value.inspector,
        createdAt: inspectedAt
      })
    }
    message.success(
      shouldCreateWorkorder
        ? '巡检已提交，并已生成关联工单。'
        : '巡检已提交。'
    )
    router.push({
      path: `/asset/device/detail/${getDeviceId()}`,
      query: {
        anchor: 'inspection',
        inspectionId: nextRecord.inspections[0]?.id || '',
        workorderId: createdWorkorderId ? String(createdWorkorderId) : undefined
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
