<template>
  <ContentWrap>
    <el-page-header @back="goBack" :title="backTitle" :content="pageTitle" />

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="targetReady">
      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">发起设备巡检</div>
        </template>

        <el-form
          ref="inspectionFormRef"
          :model="inspectionForm"
          :rules="inspectionRules"
          label-width="120px"
        >
          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检对象">
                <el-input :model-value="targetDisplayName" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="资产类型">
                <el-input :model-value="assetTypeLabel" disabled />
              </el-form-item>
            </el-col>
          </el-row>

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
                <el-select
                  v-model="inspectionForm.inspector"
                  filterable
                  placeholder="请选择巡检人"
                  class="!w-1/1"
                >
                  <el-option
                    v-for="item in inspectorOptions"
                    :key="`${item.stationName}-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检类型" prop="inspectionMode">
                <el-select v-model="inspectionForm.inspectionMode" class="!w-1/1">
                  <el-option
                    v-for="option in inspectionModeOptions"
                    :key="option"
                    :label="option"
                    :value="option"
                  />
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
            :key="section.key"
            :label="section.label"
            :prop="`${section.key}Items`"
          >
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm[`${section.key}Items`]">
                <el-checkbox v-for="item in section.options" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm[`${section.key}Note`]"
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
                  支持上传现场图片、巡检日志和补充材料；图片支持 JPG、PNG、JPEG，
                  日志支持 LOG、TXT、CSV、JSON、ZIP，附件支持 PDF、Word、Excel、检测报告等文件。
                </div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item label="巡检备注" prop="notes">
            <el-input v-model="inspectionForm.notes" type="textarea" placeholder="请输入巡检备注" />
          </el-form-item>

          <el-form-item v-if="assetType === 'device'">
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

    <el-empty v-else description="未找到对应资产数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import type { UploadUserFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { DvMachineryApi, type DvMachineryVO } from '@/api/mes/dv/machinery'
import { getPersonnelPage, type PersonnelVO } from '@/api/yian/config/personnel'
import { useUserStoreWithOut } from '@/store/modules/user'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import {
  linkInspectionWorkorderToDevice,
  resolveAssetDeviceMasterRecord,
  submitAssetDeviceInspection,
  type AssetDeviceInspectionRecordVO
} from '@/api/yian/asset/deviceMaster'
import {
  type AssetBatteryParsedMetrics,
  submitAssetBatteryInspection,
  type AssetBatteryInspectionPayload,
  type AssetInspectionAttachmentVO
} from '@/api/yian/asset'
import {
  YianWorkorderApi,
  type WorkorderAttachmentItem,
  type WorkorderCreateReqVO
} from '@/api/yian/workorder'
import { buildPersonnelOptions } from '@/utils/yian/personnel'

defineOptions({ name: 'AssetInspectionCreate' })

type AssetType = 'device' | 'battery'
type SectionKey = 'sectionA' | 'sectionB' | 'sectionC' | 'sectionD'

type ChecklistSection = {
  key: SectionKey
  label: string
  options: string[]
  placeholder: string
}

type InspectionFormState = {
  inspectedAt: string
  inspector: string
  inspectionMode: string
  conclusion: AssetBatteryInspectionPayload['conclusion']
  sectionAItems: string[]
  sectionANote: string
  sectionBItems: string[]
  sectionBNote: string
  sectionCItems: string[]
  sectionCNote: string
  sectionDItems: string[]
  sectionDNote: string
  notes: string
  suggestedWorkorder: boolean
  uploadFiles: UploadUserFile[]
}

const SHARED_INSPECTION_MODE_OPTIONS = [
  '例行巡检',
  '专项巡检',
  '复检',
  '入库/启用前检查',
  '异常后检查'
]

const deviceAircraftTemplate: ChecklistSection[] = [
  {
    key: 'sectionA',
    label: '结构与外观',
    options: ['机身外观完整', '机臂/起落架稳固', '桨叶无损伤', '挂载固定正常'],
    placeholder: '如有异常，请补充结构与外观说明'
  },
  {
    key: 'sectionB',
    label: '动力系统',
    options: ['电机运转正常', '电调无告警', '供电接口正常', '通电自检通过'],
    placeholder: '如有异常，请补充动力系统说明'
  },
  {
    key: 'sectionC',
    label: '电子与传感器',
    options: ['图传链路正常', '避障/视觉正常', 'RTK/定位正常', '飞控参数正常'],
    placeholder: '如有异常，请补充电子与传感器说明'
  },
  {
    key: 'sectionD',
    label: '证照与合规',
    options: ['设备铭牌清晰', '保险/校准在有效期内', '主档资料齐全', '首飞/例行记录已归档'],
    placeholder: '如有异常，请补充证照与合规说明'
  }
]

const deviceGeneralTemplate: ChecklistSection[] = [
  {
    key: 'sectionA',
    label: '外观与固定',
    options: ['外壳完整', '安装固定正常', '铭牌清晰', '无明显松动或破损'],
    placeholder: '如有异常，请补充外观与固定说明'
  },
  {
    key: 'sectionB',
    label: '接口与线缆',
    options: ['线缆完好', '接口接触正常', '卡扣/插头正常', '供电连接正常'],
    placeholder: '如有异常，请补充接口与线缆说明'
  },
  {
    key: 'sectionC',
    label: '通电与通讯',
    options: ['通电自检通过', '通讯链路正常', '无异常告警', '状态指示正常'],
    placeholder: '如有异常，请补充通电与通讯说明'
  },
  {
    key: 'sectionD',
    label: '功能与合规',
    options: ['核心功能正常', '固件版本符合要求', '必要资料齐全', '使用记录可追溯'],
    placeholder: '如有异常，请补充功能与合规说明'
  }
]

const batteryTemplate: ChecklistSection[] = [
  {
    key: 'sectionA',
    label: '外观与壳体',
    options: ['壳体完整', '无鼓包/裂纹', '标签清晰', '无渗漏痕迹'],
    placeholder: '如有异常，请补充外观与壳体说明'
  },
  {
    key: 'sectionB',
    label: '接口与卡扣',
    options: ['触点清洁', '卡扣正常', '接口无松动', '连接可靠'],
    placeholder: '如有异常，请补充接口与卡扣说明'
  },
  {
    key: 'sectionC',
    label: '电量与温度',
    options: ['电压正常', '电量显示正常', '温度正常', '充放电记录正常'],
    placeholder: '如有异常，请补充电量与温度说明'
  },
  {
    key: 'sectionD',
    label: '寿命与记录',
    options: ['SOH 在可接受范围', '循环次数可接受', '挂载关系已核对', '日志记录可追溯'],
    placeholder: '如有异常，请补充寿命与记录说明'
  }
]

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const loading = ref(false)
const submitLoading = ref(false)
const inspectionFormRef = ref()
const device = ref<DvMachineryVO | null>(null)
const battery = ref<AssetBatteryVO | null>(null)
const personnelOptions = ref<PersonnelVO[]>([])
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const assetType = computed<AssetType>(() => {
  const queryType = String(route.query.assetType || '')
  if (queryType === 'battery' || route.path.includes('/battery/')) return 'battery'
  return 'device'
})

const targetId = computed(() => String(route.query.id || route.params.id || ''))

const inspectionModeOptions = computed(() => SHARED_INSPECTION_MODE_OPTIONS)
const targetSiteName = computed(() =>
  assetType.value === 'battery'
    ? battery.value?.workshopName || ''
    : resolveAssetDeviceMasterRecord(device.value).siteName
)
const inspectorOptions = computed(() =>
  buildPersonnelOptions(personnelOptions.value, targetSiteName.value, ['inspector'], ['ops_staff'])
)
const defaultOrderOwnerOptions = computed(() =>
  buildPersonnelOptions(personnelOptions.value, targetSiteName.value, ['site_lead'], ['ops_staff'])
)

const checklistSections = computed(() => {
  if (assetType.value === 'battery') return batteryTemplate
  return device.value?.machineryTypeName === '无人机整机' ? deviceAircraftTemplate : deviceGeneralTemplate
})

const assetTypeLabel = computed(() => (assetType.value === 'battery' ? '电池' : '设备'))

const targetDisplayName = computed(() => {
  if (assetType.value === 'battery') {
    return battery.value ? `${battery.value.batteryCode} / ${battery.value.model || '-'}` : '-'
  }
  return device.value ? `${device.value.code} / ${device.value.name || '-'}` : '-'
})

const targetReady = computed(() =>
  assetType.value === 'battery' ? !!battery.value?.batteryCode : !!device.value?.code
)

const backTitle = computed(() => {
  if (route.query.from === 'inspection-list') return '返回巡检记录'
  return assetType.value === 'battery' ? '返回电池详情' : '返回设备详情'
})

const pageTitle = computed(() => {
  const code =
    assetType.value === 'battery'
      ? battery.value?.batteryCode || targetId.value
      : device.value?.code || targetId.value
  return code ? `发起设备巡检 - ${code}` : '发起设备巡检'
})

const createInspectionForm = (): InspectionFormState => ({
  inspectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  inspector: currentOperatorName.value,
  inspectionMode: inspectionModeOptions.value[0] || '',
  conclusion: 'pass',
  sectionAItems: checklistSections.value[0]?.options.slice() || [],
  sectionANote: '',
  sectionBItems: checklistSections.value[1]?.options.slice() || [],
  sectionBNote: '',
  sectionCItems: checklistSections.value[2]?.options.slice() || [],
  sectionCNote: '',
  sectionDItems: checklistSections.value[3]?.options.slice() || [],
  sectionDNote: '',
  notes: '',
  suggestedWorkorder: false,
  uploadFiles: []
})

const inspectionForm = ref<InspectionFormState>(createInspectionForm())

const resetInspectionForm = () => {
  inspectionForm.value = createInspectionForm()
}

const loadPersonnelOptions = async () => {
  try {
    const data = await getPersonnelPage({ pageNo: 1, pageSize: 200 })
    personnelOptions.value = data.list || []
  } catch {
    personnelOptions.value = []
  }
}

const syncDefaultInspector = () => {
  inspectionForm.value.inspector = inspectorOptions.value[0]?.value || currentOperatorName.value
}

const checklistValidator =
  (key: SectionKey) => (_rule: unknown, value: string[], callback: (error?: Error) => void) => {
    const noteField = `${key}Note` as const
    const noteValue = String(inspectionForm.value[noteField] || '').trim()
    const section = checklistSections.value.find((item) => item.key === key)
    const optionCount = section?.options.length || 0

    if (!value.length && !noteValue) {
      callback(new Error('请至少勾选一项正常项，或在备注中说明异常'))
      return
    }

    if (value.length < optionCount && !noteValue) {
      callback(new Error('存在未勾选项时，请补充异常说明'))
      return
    }

    callback()
  }

const inspectionRules = reactive({
  inspectedAt: [{ required: true, message: '巡检时间不能为空', trigger: 'change' }],
  inspector: [{ required: true, message: '巡检人不能为空', trigger: 'change' }],
  inspectionMode: [{ required: true, message: '巡检类型不能为空', trigger: 'change' }],
  conclusion: [{ required: true, message: '请选择巡检结论', trigger: 'change' }],
  sectionAItems: [{ validator: checklistValidator('sectionA'), trigger: 'change' }],
  sectionBItems: [{ validator: checklistValidator('sectionB'), trigger: 'change' }],
  sectionCItems: [{ validator: checklistValidator('sectionC'), trigger: 'change' }],
  sectionDItems: [{ validator: checklistValidator('sectionD'), trigger: 'change' }]
})

const ensureCurrentOperator = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
}

const getDetail = async () => {
  if (!targetId.value) {
    device.value = null
    battery.value = null
    return
  }
  loading.value = true
  try {
    await ensureCurrentOperator()
    await loadPersonnelOptions()
    if (assetType.value === 'battery') {
      const list = await YianAssetApi.getBatteryList()
      battery.value = list.find((item) => String(item.id) === targetId.value) || null
      device.value = null
    } else {
      device.value = await DvMachineryApi.getMachinery(Number(targetId.value))
      battery.value = null
    }
    resetInspectionForm()
    syncDefaultInspector()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (route.query.from === 'inspection-list') {
    const query: Record<string, string> = { assetType: assetType.value }
    if (assetType.value === 'battery' && battery.value?.batteryCode) {
      query.assetCode = battery.value.batteryCode
    }
    if (assetType.value === 'device' && device.value?.code) {
      query.assetCode = device.value.code
    }
    router.push({ path: '/asset/inspection', query })
    return
  }
  if (assetType.value === 'battery') {
    router.push(`/asset/battery/detail/${targetId.value}`)
    return
  }
  router.push(`/asset/device/detail/${targetId.value}`)
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
          ? '巡检现场图片'
          : category === '日志'
            ? '巡检日志文件'
            : '巡检补充附件',
      uploadedAt: inspectedAt,
      uploadedBy: inspector,
      sizeLabel: formatFileSize(file.size)
    }
  })

const canParseBatteryLog = (fileName: string) => /\.(log|txt|csv|json)$/i.test(fileName)

const getLargestNumericMatch = (source: string, pattern: RegExp) => {
  let match: RegExpExecArray | null
  let result: number | undefined
  while ((match = pattern.exec(source))) {
    const value = Number(match[1])
    if (Number.isFinite(value)) {
      result = typeof result === 'number' ? Math.max(result, value) : value
    }
  }
  pattern.lastIndex = 0
  return result
}

const parseBatteryMetricsFromText = (
  source: string,
  fileName: string
): AssetBatteryParsedMetrics | null => {
  const normalized = source.replace(/\r/g, '')
  const result: AssetBatteryParsedMetrics = {
    sourceFileName: fileName
  }

  const serialMatch = normalized.match(/(?:SN|序列号)\s*[:：]?\s*([A-Z0-9-]{6,})/i)
  if (serialMatch?.[1]) result.serialNumber = serialMatch[1].trim()

  const linkedDeviceMatch = normalized.match(/\b(UAV-[A-Z0-9-]+)\b/i)
  if (linkedDeviceMatch?.[1]) result.linkedDeviceCode = linkedDeviceMatch[1].trim().toUpperCase()

  const soh = getLargestNumericMatch(
    normalized,
    /(?:SOH|健康度|健康分)\s*[:：]?\s*(\d{1,3})(?:\s*[%％])?/gi
  )
  if (typeof soh === 'number') result.soh = Math.min(100, soh)

  const cycleCount = getLargestNumericMatch(
    normalized,
    /(?:cycle(?:\s*count)?|循环次数)\s*[:：]?\s*(\d{1,4})/gi
  )
  if (typeof cycleCount === 'number') result.cycleCount = cycleCount

  let diffMatch: RegExpExecArray | null
  const diffPattern =
    /(?:最大压差|压差|max(?:imum)?(?:\s*cell)?\s*diff(?:erence)?)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(m?v)/gi
  let maxVoltageDiff: number | undefined
  while ((diffMatch = diffPattern.exec(normalized))) {
    const rawValue = Number(diffMatch[1])
    if (!Number.isFinite(rawValue)) continue
    const unit = String(diffMatch[2] || '').toLowerCase()
    const normalizedValue = unit === 'mv' ? rawValue / 1000 : rawValue
    maxVoltageDiff =
      typeof maxVoltageDiff === 'number'
        ? Math.max(maxVoltageDiff, normalizedValue)
        : normalizedValue
  }
  diffPattern.lastIndex = 0
  if (typeof maxVoltageDiff === 'number') result.maxVoltageDiff = maxVoltageDiff

  const maxTemperature = getLargestNumericMatch(
    normalized,
    /(?:max(?:imum)?\s*temp(?:erature)?|最高温度|温度)\s*[:：]?\s*(-?\d+(?:\.\d+)?)/gi
  )
  if (typeof maxTemperature === 'number') result.maxTemperature = maxTemperature

  return Object.keys(result).length > 1 ? result : null
}

const parseBatteryAttachmentMetrics = async (files: UploadUserFile[]) => {
  let merged: AssetBatteryParsedMetrics | null = null

  for (const file of files) {
    if (!canParseBatteryLog(file.name) || !(file.raw instanceof File)) continue
    try {
      const content = await file.raw.text()
      const parsed = parseBatteryMetricsFromText(content, file.name)
      if (!parsed) continue
      merged = {
        ...merged,
        ...parsed
      }
    } catch {
      // 忽略无法读取的本地文件，避免无依据提示
    }
  }

  return merged
}

const summarizeChecklist = (selected: string[], allOptions: string[], note: string) => {
  const missing = allOptions.filter((item) => !selected.includes(item))
  const noteText = note.trim()
  const parts: string[] = []

  if (missing.length) {
    parts.push(`关注项：${missing.join('、')}`)
  }
  if (noteText) {
    parts.push(`备注：${noteText}`)
  }
  if (!parts.length && selected.length === allOptions.length) {
    return ''
  }
  return parts.join('；')
}

const buildSectionSummary = (
  section: ChecklistSection,
  selected: string[],
  note: string
) => {
  const sectionSummary = summarizeChecklist(selected, section.options, note)
  return sectionSummary ? `${section.label}：${sectionSummary}` : ''
}

const sectionHasAbnormality = (section: ChecklistSection) => {
  const selected = inspectionForm.value[`${section.key}Items`]
  const note = String(inspectionForm.value[`${section.key}Note`] || '').trim()
  return selected.length < section.options.length || Boolean(note)
}

const hasInspectionAbnormality = () => checklistSections.value.some((section) => sectionHasAbnormality(section))

const resolveFinalConclusion = (): AssetDeviceInspectionRecordVO['conclusion'] => {
  if (!hasInspectionAbnormality()) {
    return inspectionForm.value.conclusion
  }
  return inspectionForm.value.conclusion === 'pass' ? 'observe' : inspectionForm.value.conclusion
}

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

const buildInspectionSummary = () =>
  checklistSections.value
    .map((section) =>
      buildSectionSummary(
        section,
        inspectionForm.value[`${section.key}Items`],
        inspectionForm.value[`${section.key}Note`]
      )
    )
    .filter(Boolean)
    .join('\n')

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

const buildDeviceWorkorderSymptom = () => {
  const labels: Record<AssetDeviceInspectionRecordVO['conclusion'], string> = {
    pass: '巡检通过',
    observe: '巡检发现待复检项',
    grounded: '巡检发现异常'
  }
  const finalConclusion = resolveFinalConclusion()
  return `${inspectionForm.value.inspectionMode}${labels[finalConclusion]}`
}

const handleSubmitInspection = async () => {
  await inspectionFormRef.value.validate()
  if (!targetReady.value) return
  submitLoading.value = true
  try {
    if (!inspectionForm.value.inspector) {
      syncDefaultInspector()
    }
    const inspectedAt = inspectionForm.value.inspectedAt
    const attachments = mapUploadFilesToAttachments(
      inspectionForm.value.uploadFiles,
      inspectedAt,
      inspectionForm.value.inspector
    )
    const summary = buildInspectionSummary()
    const hasAbnormality = hasInspectionAbnormality()
    const finalConclusion = resolveFinalConclusion()

    if (hasAbnormality && inspectionForm.value.conclusion === 'pass') {
      inspectionForm.value.conclusion = finalConclusion
      message.warning('检测到异常项，本次巡检结论已自动调整为“观察”。')
    }

    if (assetType.value === 'battery' && battery.value?.batteryCode) {
        const parsedMetrics = await parseBatteryAttachmentMetrics(inspectionForm.value.uploadFiles)
        submitAssetBatteryInspection(battery.value.batteryCode, {
          batteryCode: battery.value.batteryCode,
          inspectedAt,
          inspector: inspectionForm.value.inspector,
          source: inspectionForm.value.inspectionMode,
          conclusion: finalConclusion,
          summary,
          notes: inspectionForm.value.notes,
          attachments,
          parsedMetrics
        })
      message.success('巡检已提交。')
      router.push({
        path: '/asset/inspection',
        query: {
          assetType: 'battery',
          assetCode: battery.value.batteryCode
        }
      })
      return
    }

    if (assetType.value === 'device' && device.value?.code) {
      const evidenceSummary = buildEvidenceSummary(attachments)
      const nextRecord = submitAssetDeviceInspection(device.value, {
        code: device.value.code,
        inspectedAt,
        inspector: inspectionForm.value.inspector,
        cycleLabel: inspectionForm.value.inspectionMode,
        structureStatus: buildSectionSummary(
          checklistSections.value[0],
          inspectionForm.value.sectionAItems,
          inspectionForm.value.sectionANote
        ),
        powerStatus: buildSectionSummary(
          checklistSections.value[1],
          inspectionForm.value.sectionBItems,
          inspectionForm.value.sectionBNote
        ),
        sensorStatus: buildSectionSummary(
          checklistSections.value[2],
          inspectionForm.value.sectionCItems,
          inspectionForm.value.sectionCNote
        ),
        complianceStatus: buildSectionSummary(
          checklistSections.value[3],
          inspectionForm.value.sectionDItems,
          inspectionForm.value.sectionDNote
        ),
        conclusion: finalConclusion,
        notes: inspectionForm.value.notes,
        evidence: evidenceSummary,
        suggestedWorkorder: inspectionForm.value.suggestedWorkorder,
        attachments
      })

      let createdWorkorderId = 0
      const shouldCreateWorkorder =
        hasAbnormality && inspectionForm.value.suggestedWorkorder
      if (shouldCreateWorkorder) {
        const attachmentPayload = mapInspectionAttachmentsToWorkorder(attachments)
        const order = YianWorkorderApi.create({
          deviceId: Number(targetId.value),
          deviceCode: device.value.code,
          deviceName: device.value.name || device.value.code,
          siteName: nextRecord.siteName,
          owner: defaultOrderOwnerOptions.value[0]?.value || inspectionForm.value.inspector,
          source: 'inspection',
          faultTime: inspectedAt,
          taskScene: inspectionForm.value.inspectionMode,
          symptom: buildDeviceWorkorderSymptom(),
          description: [
            inspectionForm.value.notes.trim(),
            summary,
            evidenceSummary ? `附件摘要：${evidenceSummary}` : ''
          ]
            .filter(Boolean)
            .join('\n'),
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

      message.success(shouldCreateWorkorder ? '巡检已提交，并已生成关联工单。' : '巡检已提交。')
      router.push({
        path: '/asset/inspection',
        query: {
          assetType: 'device',
          assetCode: device.value.code,
          inspectionId: nextRecord.inspections[0]?.id || '',
          workorderId: createdWorkorderId ? String(createdWorkorderId) : undefined
        }
      })
    }
  } finally {
    submitLoading.value = false
  }
}

watch(
  () => [route.query.assetType, route.query.id, route.params.id, route.path],
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
