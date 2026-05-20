<template>
  <ContentWrap>
    <el-page-header
      @back="goBack"
      title="返回电池详情"
      :content="battery?.batteryCode ? `电池巡检 - ${battery.batteryCode}` : '电池巡检'"
    />

    <el-skeleton v-if="loading" :rows="8" animated class="mt-20px" />

    <template v-else-if="battery">
      <el-row :gutter="16" class="mt-20px">
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">电池状态</div>
            <div class="summary-block__headline">{{ profile.inspectionStatus }}</div>
            <div class="summary-block__text">{{ profile.inspectionDueText }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">最近巡检</div>
            <div class="summary-block__headline">{{ battery.lastCheckAt || '暂无记录' }}</div>
            <div class="summary-block__text">{{ battery.checkSource || '待补录' }}</div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="8">
          <el-card shadow="hover" class="summary-block">
            <div class="summary-block__title">本次模板</div>
            <div class="summary-block__headline">电池巡检模板</div>
            <div class="summary-block__text">
              电池巡检在电池管理模块内独立维护，不与设备巡检混用。
            </div>
            <div class="summary-block__hint">本次巡检同样支持上传图片、日志和其他附件。</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="mt-20px">
        <template #header>
          <div class="card-header">发起电池巡检</div>
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
              <el-form-item label="巡检来源" prop="source">
                <el-select v-model="inspectionForm.source" class="!w-1/1">
                  <el-option label="人工巡检" value="人工巡检" />
                  <el-option label="检测工装" value="检测工装" />
                  <el-option label="BMS 复核" value="BMS 复核" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :md="12">
              <el-form-item label="巡检结论" prop="conclusion">
                <el-select v-model="inspectionForm.conclusion" class="!w-1/1">
                  <el-option label="合格" value="pass" />
                  <el-option label="观察" value="observe" />
                  <el-option label="异常建议" value="grounded" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="外观与壳体" prop="appearanceItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.appearanceItems">
                <el-checkbox v-for="item in appearanceOptions" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.appearanceNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充外观与壳体说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="接口与卡扣" prop="connectorItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.connectorItems">
                <el-checkbox v-for="item in connectorOptions" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.connectorNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充接口与卡扣说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="电量与温度" prop="powerItems">
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
                placeholder="如有异常，请补充电量与温度说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="寿命与记录" prop="lifeItems">
            <div class="checklist-block">
              <el-checkbox-group v-model="inspectionForm.lifeItems">
                <el-checkbox v-for="item in lifeOptions" :key="item" :label="item">
                  {{ item }}
                </el-checkbox>
              </el-checkbox-group>
              <el-input
                v-model="inspectionForm.lifeNote"
                type="textarea"
                :rows="2"
                placeholder="如有异常，请补充寿命与记录说明"
                class="mt-12px"
              />
            </div>
          </el-form-item>

          <el-form-item label="巡检图片">
            <el-upload
              v-model:file-list="inspectionForm.imageFiles"
              action="#"
              :auto-upload="false"
              multiple
              list-type="text"
            >
              <el-button type="primary" plain>上传图片</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 JPG、PNG、JPEG 等现场图片</div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item label="巡检日志">
            <el-upload
              v-model:file-list="inspectionForm.logFiles"
              action="#"
              :auto-upload="false"
              multiple
              list-type="text"
            >
              <el-button type="primary" plain>上传日志</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 LOG、TXT、CSV、JSON、ZIP 等日志文件</div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item label="其他附件">
            <el-upload
              v-model:file-list="inspectionForm.attachmentFiles"
              action="#"
              :auto-upload="false"
              multiple
              list-type="text"
            >
              <el-button type="primary" plain>上传附件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 PDF、Word、Excel、检测报告等补充材料</div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item label="巡检摘要" prop="summary">
            <el-input
              v-model="inspectionForm.summary"
              type="textarea"
              :rows="2"
              placeholder="请输入本次巡检摘要"
            />
          </el-form-item>
          <el-form-item label="附件说明" prop="notes">
            <el-input
              v-model="inspectionForm.notes"
              type="textarea"
              :rows="2"
              placeholder="选填，用于补充图片、日志或附件的用途"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitLoading" @click="handleSubmitInspection">
              提交巡检
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </template>

    <el-empty v-else description="未找到对应电池数据" class="mt-20px" />
  </ContentWrap>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import type { UploadUserFile } from 'element-plus'
import { ContentWrap } from '@/components/ContentWrap'
import { YianAssetApi, type AssetBatteryVO } from '@/api/yian/asset/backend'
import {
  resolveAssetBatteryProfile,
  submitAssetBatteryInspection,
  type AssetInspectionAttachmentVO
} from '@/api/yian/asset'
import { useUserStoreWithOut } from '@/store/modules/user'

defineOptions({ name: 'AssetBatteryInspection' })

const appearanceOptions = ['壳体完整', '无鼓包/裂纹', '标签清晰', '无渗漏痕迹']
const connectorOptions = ['触点清洁', '卡扣正常', '接口无松动', '连接可靠']
const powerOptions = ['电压正常', '电量显示正常', '温度正常', '充放电记录正常']
const lifeOptions = ['SOH 在可接受范围', '循环次数可接受', '挂载关系已核对', '日志记录可追溯']

type InspectionFormState = {
  inspectedAt: string
  inspector: string
  source: string
  conclusion: 'pass' | 'observe' | 'grounded'
  appearanceItems: string[]
  appearanceNote: string
  connectorItems: string[]
  connectorNote: string
  powerItems: string[]
  powerNote: string
  lifeItems: string[]
  lifeNote: string
  summary: string
  notes: string
  imageFiles: UploadUserFile[]
  logFiles: UploadUserFile[]
  attachmentFiles: UploadUserFile[]
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const loading = ref(false)
const submitLoading = ref(false)
const battery = ref<AssetBatteryVO | null>(null)
const profile = computed(() => resolveAssetBatteryProfile(battery.value))
const inspectionFormRef = ref()
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')

const createInspectionForm = (): InspectionFormState => ({
  inspectedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  inspector: currentOperatorName.value,
  source: '人工巡检',
  conclusion: 'pass',
  appearanceItems: [...appearanceOptions],
  appearanceNote: '',
  connectorItems: [...connectorOptions],
  connectorNote: '',
  powerItems: [...powerOptions],
  powerNote: '',
  lifeItems: [...lifeOptions],
  lifeNote: '',
  summary: '',
  notes: '',
  imageFiles: [],
  logFiles: [],
  attachmentFiles: []
})

const inspectionForm = ref<InspectionFormState>(createInspectionForm())

const resetInspectionForm = () => {
  inspectionForm.value = createInspectionForm()
}

const checklistValidator =
  (field: keyof Pick<InspectionFormState, 'appearanceItems' | 'connectorItems' | 'powerItems' | 'lifeItems'>) =>
  (_rule: unknown, value: string[], callback: (error?: Error) => void) => {
    const noteField = `${String(field).replace('Items', 'Note')}` as
      | 'appearanceNote'
      | 'connectorNote'
      | 'powerNote'
      | 'lifeNote'
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
  source: [{ required: true, message: '巡检来源不能为空', trigger: 'change' }],
  conclusion: [{ required: true, message: '请选择巡检结论', trigger: 'change' }],
  summary: [{ required: true, message: '巡检摘要不能为空', trigger: 'blur' }],
  appearanceItems: [{ validator: checklistValidator('appearanceItems'), trigger: 'change' }],
  connectorItems: [{ validator: checklistValidator('connectorItems'), trigger: 'change' }],
  powerItems: [{ validator: checklistValidator('powerItems'), trigger: 'change' }],
  lifeItems: [{ validator: checklistValidator('lifeItems'), trigger: 'change' }]
})

const getBatteryId = () => String(route.params.id || '')

const ensureCurrentOperator = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  inspectionForm.value.inspector = currentOperatorName.value
}

const getDetail = async () => {
  const id = getBatteryId()
  if (!id) {
    battery.value = null
    return
  }
  loading.value = true
  try {
    await ensureCurrentOperator()
    const list = await YianAssetApi.getBatteryList()
    battery.value = list.find((item) => String(item.id) === id) || null
    resetInspectionForm()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/asset/battery/detail/${getBatteryId()}`)
}

const formatFileSize = (size?: number) => {
  if (!size) return ''
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

const mapUploadFilesToAttachments = (
  files: UploadUserFile[],
  category: AssetInspectionAttachmentVO['category'],
  inspectedAt: string,
  inspector: string
): AssetInspectionAttachmentVO[] =>
  files.map((file, index) => ({
    id: `${category}-${Date.now()}-${index}`,
    fileName: file.name,
    category,
    summary:
      category === '图片' ? '电池巡检现场图片' : category === '日志' ? '电池巡检日志文件' : '电池巡检补充附件',
    uploadedAt: inspectedAt,
    uploadedBy: inspector,
    sizeLabel: formatFileSize(file.size)
  }))

const handleSubmitInspection = async () => {
  await inspectionFormRef.value.validate()
  if (!battery.value?.batteryCode) return
  submitLoading.value = true
  try {
    inspectionForm.value.inspector = currentOperatorName.value
    const attachments = [
      ...mapUploadFilesToAttachments(
        inspectionForm.value.imageFiles,
        '图片',
        inspectionForm.value.inspectedAt,
        inspectionForm.value.inspector
      ),
      ...mapUploadFilesToAttachments(
        inspectionForm.value.logFiles,
        '日志',
        inspectionForm.value.inspectedAt,
        inspectionForm.value.inspector
      ),
      ...mapUploadFilesToAttachments(
        inspectionForm.value.attachmentFiles,
        '附件',
        inspectionForm.value.inspectedAt,
        inspectionForm.value.inspector
      )
    ]

    submitAssetBatteryInspection(battery.value.batteryCode, {
      batteryCode: battery.value.batteryCode,
      inspectedAt: inspectionForm.value.inspectedAt,
      inspector: inspectionForm.value.inspector,
      source: inspectionForm.value.source,
      conclusion: inspectionForm.value.conclusion,
      summary: inspectionForm.value.summary,
      notes: inspectionForm.value.notes,
      attachments
    })
    message.success('电池巡检已提交。')
    router.push(`/asset/battery/detail/${getBatteryId()}`)
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
  min-height: 170px;
}

.summary-block__title,
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
