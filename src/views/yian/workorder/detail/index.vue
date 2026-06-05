<template>
  <ContentWrap>
    <div class="yian-prototype-page yian-workorder-detail-page">
      <el-page-header @back="router.push('/workorder/list')" title="返回工单列表" content="工单详情">
        <template #extra>
          <el-space wrap>
            <el-tag effect="plain">{{ order?.siteName || '待补录站点' }}</el-tag>
            <el-tag effect="plain">{{ order?.owner || '待分派负责人' }}</el-tag>
            <el-button type="primary" @click="router.push('/workorder/list')">进入工单中心</el-button>
          </el-space>
        </template>
      </el-page-header>

      <el-empty v-if="!order" description="未找到对应工单" class="mt-20px" />

      <template v-else>
        <el-card class="mt-20px detail-card" shadow="never">
          <div class="detail-card__head">
            <div>
              <div class="detail-card__title">工单 {{ order.orderNo }}</div>
              <div class="detail-card__meta">
                设备 {{ order.deviceCode }} / {{ order.siteName }} / {{ taskSceneText }} / {{ order.symptom }}
              </div>
            </div>
            <div class="detail-card__tags">
              <el-tag :type="order.tagType">{{ order.statusLabel }}</el-tag>
              <el-tag :type="groundedTag.type">{{ groundedTag.label }}</el-tag>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-field">
              <strong>当前状态</strong>
              <span>{{ order.statusLabel }}</span>
            </div>
            <div class="info-field">
              <strong>停飞状态</strong>
              <span>{{ groundedTag.label }}</span>
            </div>
            <div class="info-field">
              <strong>当前负责人</strong>
              <span>{{ order.owner || '待分派' }}</span>
            </div>
            <div class="info-field">
              <strong>节点截止时间</strong>
              <span :class="order.overdue ? 'text-danger' : ''">{{ order.slaDeadline }}</span>
            </div>
            <div class="info-field info-field--full">
              <strong>异常现象</strong>
              <span>{{ order.symptom }}</span>
            </div>
          </div>
        </el-card>

        <el-row :gutter="16" class="mt-20px">
          <el-col :xs="24" :xl="14">
            <el-card shadow="never">
              <template #header>
                <div class="section-header">
                  <span>工单时间轴</span>
                  <el-tag type="info" effect="plain">{{ historyStageCards.length }} 个节点</el-tag>
                </div>
              </template>
              <el-empty v-if="!historyStageCards.length" description="当前还没有可回看的工单节点" />
              <el-collapse v-else v-model="expandedHistoryStages" class="history-stage-collapse">
                <el-collapse-item
                  v-for="card in historyStageCards"
                  :key="card.key"
                  :name="card.key"
                  class="history-stage-collapse__item"
                >
                  <template #title>
                    <div class="history-stage-title">
                      <div>
                        <div class="history-stage-title__main">{{ card.title }}</div>
                        <div class="history-stage-title__meta">
                          {{ card.at }} / {{ card.operator }}
                        </div>
                      </div>
                      <div class="history-stage-title__tags">
                        <el-tag :type="card.tagType" effect="plain">{{ card.tagLabel }}</el-tag>
                      </div>
                    </div>
                  </template>

                  <div class="history-stage-card">
                    <p v-if="card.summary" class="history-stage-card__summary">{{ card.summary }}</p>
                    <div class="info-grid info-grid--compact">
                      <div
                        v-for="field in card.fields"
                        :key="`${card.key}-${field.label}`"
                        class="info-field"
                        :class="{ 'info-field--full': field.full }"
                      >
                        <strong>{{ field.label }}</strong>
                        <span>{{ field.value }}</span>
                      </div>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </el-card>
          </el-col>

          <el-col :xs="24" :xl="10">
            <el-card shadow="never">
              <template #header>
                <div class="section-header">
                  <span>日志与附件</span>
                </div>
              </template>
              <div class="evidence-list">
                <div class="evidence-item">
                  <div class="section-header">
                    <strong>飞行日志</strong>
                    <el-tag type="success">{{ logAttachments.length }} 份</el-tag>
                  </div>
                  <p>{{ logSummaryText }}</p>
                </div>
                <div class="evidence-item">
                  <div class="section-header">
                    <strong>现场图片</strong>
                    <el-tag type="info">{{ imageAttachments.length }} 份</el-tag>
                  </div>
                  <p>{{ imageSummaryText }}</p>
                </div>
                <div class="evidence-item">
                  <div class="section-header">
                    <strong>关联证据</strong>
                  </div>
                  <el-space wrap>
                    <el-button @click="handleViewEvidence">查看证据</el-button>
                    <el-button @click="handleImportImage">补录图片</el-button>
                    <el-button @click="handleImportLog">导入日志</el-button>
                  </el-space>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row class="mt-20px">
          <el-col :xs="24" :xl="24">
            <el-card shadow="never">
              <template #header>
                <div class="section-header">
                  <span>当前动作</span>
                </div>
              </template>
              <div class="action-panel">
                <div class="action-panel__title">{{ currentAction.title }}</div>
                <p class="action-panel__desc">{{ currentAction.description }}</p>
                <el-space wrap>
                  <el-button v-if="currentAction.primaryText" type="primary" @click="handlePrimaryAction">
                    {{ currentAction.primaryText }}
                  </el-button>
                </el-space>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <el-dialog v-model="evidenceDialogVisible" title="关联证据" width="760px">
        <el-empty v-if="!evidenceItems.length" description="当前还没有关联证据" />
        <el-table v-else :data="evidenceItems" stripe>
          <el-table-column label="附件名称" prop="name" min-width="260" />
          <el-table-column label="类型" prop="displayType" width="120" />
          <el-table-column label="大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
          </el-table-column>
          <el-table-column label="格式" prop="mimeType" min-width="160" />
        </el-table>
      </el-dialog>

      <el-dialog v-model="imageImportDialogVisible" title="补录图片" width="640px">
        <el-upload
          drag
          :auto-upload="false"
          :multiple="true"
          :limit="12"
          :file-list="imageUploadList"
          accept="image/*"
          @change="handleImageUploadChange"
          @remove="handleImageUploadRemove"
        >
          <div class="el-upload__text">将现场图片拖到此处，或 <em>点击选择文件</em></div>
          <template #tip>
            <div class="el-upload__tip">支持 JPG、PNG、WebP 等图片格式，建议补充故障现场照片与截图</div>
          </template>
        </el-upload>
        <template #footer>
          <el-space wrap>
            <el-button @click="imageImportDialogVisible = false">取消</el-button>
            <el-button type="primary" :disabled="!imageUploadList.length" @click="submitImageImport">
              确认补录
            </el-button>
          </el-space>
        </template>
      </el-dialog>

      <el-dialog v-model="logImportDialogVisible" title="导入日志" width="640px">
        <el-upload
          drag
          :auto-upload="false"
          :multiple="true"
          :limit="8"
          :file-list="logUploadList"
          accept=".log,.txt,.csv,.json,.zip,.rar,.7z"
          @change="handleLogUploadChange"
          @remove="handleLogUploadRemove"
        >
          <div class="el-upload__text">将日志文件拖到此处，或 <em>点击选择文件</em></div>
          <template #tip>
            <div class="el-upload__tip">支持飞控日志、检测报告、压缩包等日志附件</div>
          </template>
        </el-upload>
        <template #footer>
          <el-space wrap>
            <el-button @click="logImportDialogVisible = false">取消</el-button>
            <el-button type="primary" :disabled="!logUploadList.length" @click="submitLogImport">
              确认导入
            </el-button>
          </el-space>
        </template>
      </el-dialog>

      <el-dialog v-model="inventoryReferenceDialogVisible" title="库存参考" width="880px">
        <el-alert
          title="这里用于核对备件库存，不会打断当前工单领料；确认后请返回抽屉继续提交本次领料。"
          type="info"
          :closable="false"
          show-icon
          class="mb-16px"
        />
        <el-table v-loading="inventoryReferenceLoading" :data="inventoryReferenceRows" stripe>
          <el-table-column label="备件名称" min-width="180" prop="itemName" />
          <el-table-column label="规格" min-width="140" prop="specification" />
          <el-table-column label="仓库" min-width="140" prop="warehouseName" />
          <el-table-column label="当前库存" width="110" prop="quantity" />
          <el-table-column label="单位" width="90" prop="unitMeasureName" />
        </el-table>
        <el-empty v-if="!inventoryReferenceLoading && !inventoryReferenceRows.length" description="当前没有匹配到库存参考数据" />
        <template #footer>
          <el-space wrap>
            <el-button @click="inventoryReferenceDialogVisible = false">关闭</el-button>
            <el-button type="primary" @click="syncPickItemsInventory">把库存写回领料清单</el-button>
          </el-space>
        </template>
      </el-dialog>

      <el-dialog v-model="diagnosisAssistantVisible" title="初诊助手" width="920px" top="8vh">
        <div v-if="order" class="diagnosis-assistant">
          <div class="diagnosis-assistant__toolbar">
            <div class="diagnosis-assistant__chips">
              <el-tag effect="plain" :type="logAttachments.length ? 'success' : 'info'">
                {{ logAttachments.length ? `已关联飞行日志 ${logAttachments.length} 份` : '暂未关联飞行日志' }}
              </el-tag>
              <el-tag effect="plain" :type="imageAttachments.length ? 'success' : 'info'">
                {{ imageAttachments.length ? `已读取现场附件 ${imageAttachments.length} 份` : '暂未读取现场附件' }}
              </el-tag>
              <el-tag effect="plain">当前工单：{{ order.orderNo }}</el-tag>
            </div>
            <el-button @click="handleDiagnosisAssistantReimportLog">重新导入日志</el-button>
          </div>

          <div class="diagnosis-assistant__messages">
            <div
              v-for="(item, index) in diagnosisAssistantMessages"
              :key="`diagnosis-assistant-${index}`"
              class="diagnosis-assistant__message"
              :class="`diagnosis-assistant__message--${item.role}`"
            >
              <strong>{{ item.title }}</strong>
              <p>{{ item.content }}</p>
            </div>
          </div>

          <div v-if="diagnosisAssistantDraftResult" class="diagnosis-assistant__draft">
            <div class="diagnosis-assistant__draft-title">当前初诊草案</div>
            <div class="diagnosis-assistant__draft-grid">
              <div><strong>故障分类</strong><span>{{ diagnosisAssistantDraftResult.faultCategory }}</span></div>
              <div><strong>风险等级</strong><span>{{ riskLevelLabel(diagnosisAssistantDraftResult.riskLevel) }}</span></div>
              <div><strong>停飞建议</strong><span>{{ diagnosisAssistantDraftResult.groundedSuggestion ? '建议停飞' : '可继续观察' }}</span></div>
              <div><strong>是否需要备件</strong><span>{{ diagnosisAssistantDraftResult.needParts ? '是' : '否' }}</span></div>
              <div class="full"><strong>疑似原因</strong><span>{{ diagnosisAssistantDraftResult.probableCause }}</span></div>
              <div class="full"><strong>建议领料清单</strong><span>{{ diagnosisAssistantDraftResult.suggestedPartsText || '无' }}</span></div>
              <div class="full"><strong>处理建议</strong><span>{{ diagnosisAssistantDraftResult.conclusion }}</span></div>
            </div>
          </div>

          <div class="diagnosis-assistant__composer">
            <el-input
              v-model="diagnosisAssistantDraft"
              type="textarea"
              :rows="4"
              resize="none"
              placeholder="请输入补充信息，例如：是否立即停飞、是否已复现故障、现场是否更换过备件。"
            />
            <div class="drawer-footer">
              <el-button
                :loading="diagnosisAssistantStreaming || diagnosisAssistantBootstrapping"
                @click="sendDiagnosisAssistantPrompt"
              >
                发送问题
              </el-button>
              <el-button
                type="primary"
                :disabled="!diagnosisAssistantDraftResult || diagnosisAssistantBootstrapping"
                :loading="diagnosisAssistantStreaming || diagnosisAssistantBootstrapping"
                @click="writeDiagnosisAssistantToDiagnosis"
              >
                写入初诊
              </el-button>
            </div>
          </div>
        </div>
      </el-dialog>

      <el-drawer
        v-model="processingDrawerVisible"
        :title="processingDrawerMeta.title"
        direction="rtl"
        size="560px"
        destroy-on-close
      >
        <template #default>
          <div v-if="order" class="processing-drawer">
            <div class="drawer-hero">
              <div class="drawer-hero__title">{{ order.orderNo }} / {{ order.deviceCode }}</div>
              <p class="drawer-hero__desc">{{ processingDrawerMeta.description }}</p>
              <div class="drawer-hero__chips">
                <el-tag effect="plain">{{ order.statusLabel }}</el-tag>
                <el-tag effect="plain">{{ order.siteName }}</el-tag>
                <el-tag effect="plain">截止 {{ order.slaDeadline }}</el-tag>
              </div>
            </div>

            <el-form v-if="order.status === 'pending'" :model="acceptForm" label-width="110px">
              <el-form-item label="是否受理">
                <el-radio-group v-model="acceptForm.decision">
                  <el-radio label="accepted">受理并进入初诊</el-radio>
                  <el-radio label="return_for_info">退回补充资料</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="是否停飞">
                <el-switch v-model="acceptForm.grounded" inline-prompt active-text="停飞" inactive-text="不停飞" />
              </el-form-item>
              <el-form-item label="机务负责人">
                <el-select v-model="acceptForm.dispatcher" filterable placeholder="选择机务负责人" class="!w-100%">
                  <el-option
                    v-for="item in dispatcherOptions"
                    :key="`dispatcher-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="维修责任人">
                <el-select v-model="acceptForm.assignee" filterable placeholder="选择维修责任人" class="!w-100%">
                  <el-option
                    v-for="item in assigneeOptions"
                    :key="`assignee-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="优先级">
                <el-radio-group v-model="acceptForm.priority">
                  <el-radio-button label="P1">P1</el-radio-button>
                  <el-radio-button label="P2">P2</el-radio-button>
                  <el-radio-button label="P3">P3</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="节点截止时间">
                <el-date-picker
                  v-model="acceptForm.deadline"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  placeholder="选择节点截止时间"
                  class="!w-100%"
                />
              </el-form-item>
              <el-form-item label="调整原因">
                <el-input
                  v-model="acceptForm.deadlineReason"
                  type="textarea"
                  :rows="2"
                  placeholder="如调整了系统 SLA，请补充调整原因"
                />
              </el-form-item>
              <el-form-item label="受理备注">
                <el-input v-model="acceptForm.remark" type="textarea" :rows="3" placeholder="补充受理、停飞和分派说明" />
              </el-form-item>
            </el-form>

            <el-form v-else-if="order.status === 'diagnosing'" :model="diagnoseForm" label-width="110px">
              <div class="drawer-inline-head">
                <div>
                  <div class="drawer-inline-head__title">初诊助手</div>
                  <p>先结合飞行日志、现场附件和机务补充信息形成初诊建议，再由人工确认初诊结果。</p>
                </div>
                <el-space wrap>
                  <el-button type="primary" plain @click="openDiagnosisAssistant">初诊助手</el-button>
                  <el-button :disabled="!diagnosisAssistantDraftResult" @click="applyDiagnosisAssistant">写入当前草案</el-button>
                </el-space>
              </div>
              <el-form-item label="初诊人">
                <el-select v-model="diagnoseForm.engineer" filterable placeholder="选择初诊人" class="!w-100%">
                  <el-option
                    v-for="item in engineerOptions"
                    :key="`engineer-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="故障分类">
                <el-input v-model="diagnoseForm.faultCategory" placeholder="如：飞控系统、动力系统" />
              </el-form-item>
              <el-form-item label="疑似原因">
                <el-input
                  v-model="diagnoseForm.probableCause"
                  type="textarea"
                  :rows="2"
                  placeholder="填写当前对异常的初步原因判断"
                />
              </el-form-item>
              <el-form-item label="风险等级">
                <el-select v-model="diagnoseForm.riskLevel" class="!w-100%">
                  <el-option label="高风险" value="high" />
                  <el-option label="中风险" value="medium" />
                  <el-option label="低风险" value="low" />
                </el-select>
              </el-form-item>
              <el-form-item label="停飞建议">
                <el-switch
                  v-model="diagnoseForm.groundedSuggestion"
                  inline-prompt
                  active-text="建议停飞"
                  inactive-text="可继续观察"
                />
              </el-form-item>
              <el-form-item label="是否需要备件">
                <el-radio-group v-model="diagnoseForm.needParts">
                  <el-radio :label="true">需要备件</el-radio>
                  <el-radio :label="false">无需备件</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="diagnoseForm.needParts" label="建议领料清单">
                <el-input
                  v-model="diagnoseForm.suggestedPartsText"
                  type="textarea"
                  :rows="3"
                  placeholder="多个备件可用逗号分隔，例如：标准桨叶套装 x1，减震球 x4"
                />
              </el-form-item>
              <el-form-item label="处理建议">
                <el-input v-model="diagnoseForm.conclusion" type="textarea" :rows="3" placeholder="填写维修前建议和后续处理路径" />
              </el-form-item>
            </el-form>

            <el-form v-else-if="order.status === 'picking'" :model="pickForm" label-width="110px">
              <div class="drawer-inline-head">
                <div>
                  <div class="drawer-inline-head__title">多项领料清单</div>
                  <p>系统已按初诊建议带入清单，默认只需要确认本次实领数量；若需补充，再新增备件或查看库存参考。</p>
                </div>
                <el-space wrap>
                  <el-button @click="seedPickItemsFromDiagnosis">重新带入建议</el-button>
                  <el-button @click="openInventoryReference">查看库存参考</el-button>
                  <el-button type="primary" plain @click="addPickItem">补充备件</el-button>
                </el-space>
              </div>
              <el-form-item label="领料人">
                <el-select v-model="pickForm.picker" filterable placeholder="选择领料人" class="!w-100%">
                  <el-option
                    v-for="item in pickerOptions"
                    :key="`picker-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <div v-if="pickForm.items.length" class="pick-items">
                <div v-for="(item, index) in pickForm.items" :key="`pick-item-${index}`" class="pick-item-card">
                  <div class="pick-item-card__head">
                    <span>备件 {{ index + 1 }}</span>
                    <el-tag size="small" effect="plain" :type="item.manual ? 'warning' : 'info'">
                      {{ item.manual ? '补充项' : '建议项' }}
                    </el-tag>
                    <el-button link type="danger" @click="removePickItem(index)">移除</el-button>
                  </div>
                  <el-row :gutter="12">
                    <el-col :span="12">
                      <el-form-item label="备件名称" label-width="84px">
                        <el-select
                          v-if="item.manual"
                          v-model="item.itemId"
                          filterable
                          remote
                          reserve-keyword
                          clearable
                          :remote-method="handleItemSearch"
                          :loading="itemOptionsLoading"
                          placeholder="搜索并选择备件"
                          class="!w-100%"
                          @change="handleManualItemChange(index)"
                        >
                          <el-option
                            v-for="option in itemOptions"
                            :key="option.id"
                            :label="option.name"
                            :value="option.id"
                          >
                            <div class="pick-option">
                              <span>{{ option.name }}</span>
                              <span class="pick-option__meta">{{ option.specification || '-' }}</span>
                            </div>
                          </el-option>
                        </el-select>
                        <el-input v-else v-model="item.name" disabled placeholder="备件名称" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="12">
                      <el-form-item label="规格" label-width="60px">
                        <el-input v-model="item.spec" :disabled="!item.manual" placeholder="规格/型号" />
                      </el-form-item>
                    </el-col>
                    <el-col :span="24">
                      <div class="pick-item-card__action-row">
                        <div class="pick-item-card__meta">
                          <el-tag size="small" :type="pickStatusType(item)">
                            {{ pickStatusLabel(item) }}
                          </el-tag>
                          <div class="pick-item-card__tips">
                            <span>建议 {{ item.requestedQuantity }}</span>
                            <span>库存 {{ item.currentInventory }}</span>
                          </div>
                        </div>
                        <div class="pick-item-card__quantity-inline">
                          <span class="pick-item-card__quantity-label">本次实领</span>
                          <el-input-number v-model="item.pickedQuantity" :min="0" :max="item.currentInventory" />
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                  <div v-if="item.manual" class="pick-item-card__manual-note">
                    补充项请从备件主数据中选择，避免名称与库存台账不一致。
                  </div>
                </div>
              </div>
              <el-empty v-else description="当前还没有领料项，请先带入初诊建议或新增备件" />
            </el-form>

            <el-form v-else-if="order.status === 'repairing'" :model="repairForm" label-width="110px">
              <el-form-item label="维修责任人">
                <el-select v-model="repairForm.technician" filterable placeholder="选择维修责任人" class="!w-100%">
                  <el-option
                    v-for="item in technicianOptions"
                    :key="`technician-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="使用备件">
                <el-input :model-value="usedPartsSummary" disabled />
              </el-form-item>
              <el-form-item label="工时">
                <el-input-number v-model="repairForm.usedHours" :min="1" :max="24" class="!w-100%" />
              </el-form-item>
              <el-form-item label="维修动作">
                <el-input
                  v-model="repairForm.solution"
                  type="textarea"
                  :rows="4"
                  placeholder="记录本次实际维修动作、参数调整和关键处理过程"
                />
              </el-form-item>
              <el-form-item label="维修结论">
                <el-input
                  v-model="repairForm.result"
                  type="textarea"
                  :rows="4"
                  placeholder="说明维修后的测试结果和是否满足进入复检的条件"
                />
              </el-form-item>
            </el-form>

            <el-form v-else-if="order.status === 'inspecting'" :model="inspectForm" label-width="110px">
              <el-form-item label="复检结果">
                <el-radio-group v-model="inspectForm.result">
                  <el-radio label="passed">通过</el-radio>
                  <el-radio label="failed">退回维修</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="复检人">
                <el-select v-model="inspectForm.inspector" filterable placeholder="选择复检人" class="!w-100%">
                  <el-option
                    v-for="item in inspectorOptions"
                    :key="`inspector-${item.userId}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="试飞记录">
                <el-input
                  v-model="inspectForm.flightRecord"
                  type="textarea"
                  :rows="3"
                  placeholder="记录试飞或功能测试结果"
                />
              </el-form-item>
              <el-form-item label="电池核验">
                <el-switch v-model="inspectForm.batteryCheck" inline-prompt active-text="已核验" inactive-text="未核验" />
              </el-form-item>
              <el-form-item label="功能验证">
                <el-switch v-model="inspectForm.flightTest" inline-prompt active-text="已验证" inactive-text="未验证" />
              </el-form-item>
              <el-form-item label="复检意见">
                <el-input
                  v-model="inspectForm.conclusion"
                  type="textarea"
                  :rows="4"
                  placeholder="填写复检判断依据和是否满足恢复条件"
                />
              </el-form-item>
            </el-form>

            <template v-else-if="order.status === 'releasing'">
              <el-form :model="releaseForm" label-width="110px" class="mt-16px">
                <el-form-item label="审核人">
                  <el-select v-model="releaseForm.reviewer" filterable placeholder="选择放行审核人" class="!w-100%">
                    <el-option
                      v-for="item in reviewerOptions"
                      :key="`reviewer-${item.userId}`"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="放行结论">
                  <el-radio-group v-model="releaseForm.result">
                    <el-radio label="approved">正常放行</el-radio>
                    <el-radio label="limited">限制放行</el-radio>
                    <el-radio label="rejected">驳回放行</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="风险等级">
                  <el-select v-model="releaseForm.riskLevel" class="!w-100%">
                    <el-option label="高风险" value="high" />
                    <el-option label="中风险" value="medium" />
                    <el-option label="低风险" value="low" />
                  </el-select>
                </el-form-item>
                <el-form-item v-if="releaseForm.result === 'limited'" label="限制条件">
                  <el-input
                    v-model="releaseForm.restrictions"
                    type="textarea"
                    :rows="3"
                    placeholder="限制放行时填写限制任务、时段或观察要求"
                  />
                </el-form-item>
                <el-form-item label="审核备注">
                  <el-input
                    v-model="releaseForm.conclusion"
                    type="textarea"
                    :rows="4"
                    placeholder="填写放行判断依据、证据说明和后续建议"
                  />
                </el-form-item>
              </el-form>
            </template>
          </div>
        </template>

        <template #footer>
          <div class="drawer-footer">
            <el-button @click="processingDrawerVisible = false">取消</el-button>
            <el-button
              v-if="order?.status === 'inspecting'"
              type="warning"
              plain
              @click="submitInspection('failed')"
            >
              退回维修
            </el-button>
            <el-button
              v-if="false && order?.status === 'releasing'"
              type="warning"
              plain
              @click="submitRelease('rejected')"
            >
              驳回并退回维修
            </el-button>
            <el-button type="primary" :loading="drawerSubmitting" @click="handleDrawerSubmit">
              {{ processingDrawerMeta.submitText }}
            </el-button>
          </div>
        </template>
      </el-drawer>
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import type { UploadFile, UploadFiles, UploadUserFile } from 'element-plus'
import { ChatConversationApi } from '@/api/ai/chat/conversation'
import { ChatMessageApi } from '@/api/ai/chat/message'
import { ContentWrap } from '@/components/ContentWrap'
import { useUserStoreWithOut } from '@/store/modules/user'
import { WmMiscIssueApi } from '@/api/mes/wm/miscissue'
import { WmMiscIssueLineApi } from '@/api/mes/wm/miscissue/line'
import {
  getItemSimpleList,
  getMaterialStockPage,
  type MaterialStockVO
} from '@/api/yian/inventory'
import { getPersonnelPage, type PersonnelVO } from '@/api/yian/config/personnel'
import {
  RELEASE_META,
  YianWorkorderApi,
  type WorkorderAttachmentItem,
  type WorkorderMaterialItem,
  type WorkorderReleaseResult,
  type WorkorderRiskLevel,
  type WorkorderStage,
  type WorkorderVO
} from '@/api/yian/workorder'

defineOptions({ name: 'WorkorderDetail' })

interface DetailField {
  label: string
  value: string
  full?: boolean
}

interface HistoryStageCard {
  key: string
  title: string
  at: string
  operator: string
  summary?: string
  fields: DetailField[]
  tagLabel: string
  tagType: 'success' | 'warning' | 'danger' | 'info' | 'primary'
}

interface DrawerMeta {
  title: string
  description: string
  submitText: string
  notice?: string
}

interface PickingDraftItem {
  itemId?: number
  name: string
  spec: string
  requestedQuantity: number
  pickedQuantity: number
  currentInventory: number
  manual: boolean
}

interface InventoryItemOption {
  id: number
  code?: string
  name: string
  specification?: string
}

interface DiagnosisAssistantMessage {
  role: 'assistant' | 'user'
  title: string
  content: string
  rawContent?: string
}

interface DiagnosisAssistantDraftResult {
  faultCategory: string
  probableCause: string
  riskLevel: WorkorderRiskLevel
  groundedSuggestion: boolean
  needParts: boolean
  suggestedParts: string[]
  suggestedPartsText: string
  conclusion: string
}

interface PersonnelSelectOption {
  label: string
  value: string
  userId: number
  stationName: string
  bizRole: string
}

type ActiveProcessingStage = Extract<
  WorkorderStage,
  'pending' | 'diagnosing' | 'picking' | 'repairing' | 'inspecting' | 'releasing'
>

const PROCESSING_STAGES: ActiveProcessingStage[] = [
  'pending',
  'diagnosing',
  'picking',
  'repairing',
  'inspecting',
  'releasing'
]

const GLOBAL_PERSONNEL_STATION = '华东运营中心'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStoreWithOut()

const order = ref<WorkorderVO>()
const processingDrawerVisible = ref(false)
const drawerSubmitting = ref(false)
const expandedHistoryStages = ref<string[]>([])
const currentOperatorName = computed(() => userStore.getUser.nickname || '当前账号')
const inventoryReferenceDialogVisible = ref(false)
const inventoryReferenceLoading = ref(false)
const inventoryReferenceRows = ref<MaterialStockVO[]>([])
const itemOptions = ref<InventoryItemOption[]>([])
const itemOptionsLoading = ref(false)
const personnelLoading = ref(false)
const personnelOptions = ref<PersonnelVO[]>([])

const acceptForm = reactive({
  decision: 'accepted' as 'accepted' | 'return_for_info',
  grounded: true,
  dispatcher: '',
  assignee: '',
  priority: 'P2' as const,
  deadline: '',
  deadlineReason: '',
  remark: ''
})

const diagnoseForm = reactive({
  engineer: '',
  faultCategory: '',
  probableCause: '',
  riskLevel: 'medium' as WorkorderRiskLevel,
  groundedSuggestion: true,
  needParts: true,
  suggestedPartsText: '',
  conclusion: ''
})

const pickForm = reactive({
  picker: '',
  warehouse: '华东备件库',
  items: [] as PickingDraftItem[]
})

const repairForm = reactive({
  technician: '',
  solution: '',
  result: '',
  usedHours: 2
})

const inspectForm = reactive({
  inspector: '',
  result: 'passed' as 'passed' | 'failed',
  flightRecord: '',
  conclusion: '',
  batteryCheck: true,
  flightTest: true
})

const releaseForm = reactive({
  reviewer: '',
  result: 'approved' as WorkorderReleaseResult,
  riskLevel: 'medium' as WorkorderRiskLevel,
  restrictions: '',
  conclusion: ''
})

const evidenceDialogVisible = ref(false)
const imageImportDialogVisible = ref(false)
const logImportDialogVisible = ref(false)
const diagnosisAssistantVisible = ref(false)
const imageUploadList = ref<UploadUserFile[]>([])
const logUploadList = ref<UploadUserFile[]>([])
const pendingImageAttachments = ref<WorkorderAttachmentItem[]>([])
const pendingLogAttachments = ref<WorkorderAttachmentItem[]>([])
const diagnosisAssistantDraft = ref('')
const diagnosisAssistantMessages = ref<DiagnosisAssistantMessage[]>([])
const diagnosisAssistantDraftResult = ref<DiagnosisAssistantDraftResult | null>(null)
const diagnosisAssistantConversationId = ref<number | null>(null)
const diagnosisAssistantStreaming = ref(false)
const diagnosisAssistantBootstrapping = ref(false)
const diagnosisAssistantContextDirty = ref(false)
const diagnosisAssistantAbortController = ref<AbortController | null>(null)

const resolvePersonnelDisplayName = (person: PersonnelVO) =>
  person.userName || person.jobTitle || person.bizRoleLabel || `用户#${person.userId}`

const buildPersonnelOptions = (
  primaryRoles: string[],
  fallbackRoles: string[] = [],
  options: { includeGlobal?: boolean } = {}
): PersonnelSelectOption[] => {
  const stationName = order.value?.siteName || ''
  const result: PersonnelSelectOption[] = []
  const seen = new Set<number>()
  const append = (people: PersonnelVO[]) => {
    people.forEach((person) => {
      if (!person?.userId || seen.has(person.userId)) {
        return
      }
      seen.add(person.userId)
      result.push({
        label: `${resolvePersonnelDisplayName(person)} / ${person.bizRoleLabel}`,
        value: resolvePersonnelDisplayName(person),
        userId: person.userId,
        stationName: person.stationName,
        bizRole: person.bizRole
      })
    })
  }

  const enabledPersonnel = personnelOptions.value.filter((item) => item.userStatus === 0)
  const sameStationPersonnel = enabledPersonnel.filter((item) => item.stationName === stationName)
  const globalPersonnel = enabledPersonnel.filter((item) => item.stationName === GLOBAL_PERSONNEL_STATION)
  const otherPersonnel = enabledPersonnel.filter(
    (item) => item.stationName !== stationName && item.stationName !== GLOBAL_PERSONNEL_STATION
  )

  primaryRoles.forEach((role) => append(sameStationPersonnel.filter((item) => item.bizRole === role)))
  if (options.includeGlobal !== false) {
    primaryRoles.forEach((role) => append(globalPersonnel.filter((item) => item.bizRole === role)))
  }
  fallbackRoles.forEach((role) => append(sameStationPersonnel.filter((item) => item.bizRole === role)))
  if (options.includeGlobal !== false) {
    fallbackRoles.forEach((role) => append(globalPersonnel.filter((item) => item.bizRole === role)))
  }
  primaryRoles.forEach((role) => append(otherPersonnel.filter((item) => item.bizRole === role)))
  fallbackRoles.forEach((role) => append(otherPersonnel.filter((item) => item.bizRole === role)))
  return result
}

const dispatcherOptions = computed(() => buildPersonnelOptions(['site_lead'], ['ops_staff']))
const assigneeOptions = computed(() => buildPersonnelOptions(['ops_staff']))
const engineerOptions = computed(() => buildPersonnelOptions(['ops_staff']))
const pickerOptions = computed(() => buildPersonnelOptions(['parts_manager']))
const technicianOptions = computed(() => buildPersonnelOptions(['ops_staff']))
const inspectorOptions = computed(() => buildPersonnelOptions(['inspector']))
const reviewerOptions = computed(() => buildPersonnelOptions(['release_approver']))

const taskSceneText = computed(() => order.value?.taskScene || '待补录')
const imageAttachments = computed(() => order.value?.imageAttachments || [])
const logAttachments = computed(() => order.value?.logAttachments || [])
const evidenceItems = computed(() => [
  ...imageAttachments.value.map((item) => ({
    ...item,
    displayType: '现场图片'
  })),
  ...logAttachments.value.map((item) => ({
    ...item,
    displayType: '日志附件'
  }))
])
const reporterDisplay = computed(() => {
  if (!order.value) return '-'
  return order.value.reporterPhone ? `${order.value.creator} / ${order.value.reporterPhone}` : order.value.creator
})
const logSummaryText = computed(() =>
  logAttachments.value.length
    ? logAttachments.value.map((item) => item.name).join(' / ')
    : '当前还没有补录飞行日志，建议尽快导入原始日志包。'
)
const imageSummaryText = computed(() =>
  imageAttachments.value.length
    ? imageAttachments.value.map((item) => item.name).join(' / ')
    : '当前还没有补录现场图片，可继续补充故障现场照片或截图。'
)
const diagnosisAssistantSuggestedPartsText = (parts: string[]) => parts.filter(Boolean).join(' / ')

const activeProcessingStage = computed<ActiveProcessingStage | ''>(() =>
  order.value && PROCESSING_STAGES.includes(order.value.status as ActiveProcessingStage)
    ? (order.value.status as ActiveProcessingStage)
    : ''
)

const getRequestedProcessingStage = (): ActiveProcessingStage | '' => {
  const stage = route.query.stage
  return typeof stage === 'string' && PROCESSING_STAGES.includes(stage as ActiveProcessingStage)
    ? (stage as ActiveProcessingStage)
    : ''
}

const releaseTagType = (status: WorkorderVO['releaseStatus']) => RELEASE_META[status].tagType
const releaseLabel = (status: WorkorderVO['releaseStatus']) => RELEASE_META[status].label
const riskTagType = (value: WorkorderVO['riskLevel']): HistoryStageCard['tagType'] =>
  value === 'high' ? 'danger' : value === 'medium' ? 'warning' : value === 'low' ? 'success' : 'info'
const riskLevelLabel = (value: WorkorderRiskLevel | 'unrated') =>
  (
    {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      unrated: '未定级'
    } as Record<WorkorderRiskLevel | 'unrated', string>
  )[value]
const acceptanceDecisionLabel = (value?: 'accepted' | 'return_for_info') =>
  value === 'return_for_info' ? '退回补充资料' : '受理并进入初诊'
const inspectionResultLabel = (value?: 'passed' | 'failed') =>
  value === 'failed' ? '退回维修' : value === 'passed' ? '通过' : '待复检'

const groundedTag = computed(() => {
  if (!order.value) return { label: '-', type: 'info' as const }
  if (order.value.status === 'completed') return { label: '已放行', type: 'success' as const }
  if (order.value.status === 'closed') return { label: '已关闭', type: 'info' as const }
  if (order.value.release?.result === 'rejected') return { label: '驳回返修', type: 'danger' as const }
  if (order.value.release?.result === 'limited') return { label: '限制放行', type: 'warning' as const }
  if (order.value.acceptance?.grounded === false) return { label: '观察中', type: 'warning' as const }
  return { label: '已停飞', type: 'danger' as const }
})

const usedPartsSummary = computed(() => formatMaterialItems(order.value?.picking?.items))

const processingDrawerMeta = computed<DrawerMeta>(() => {
  const metaMap: Record<ActiveProcessingStage, DrawerMeta> = {
    pending: {
      title: '工单受理',
      description: '在右侧抽屉内完成受理、停飞确认、责任分派和节点截止时间调整。',
      submitText: '提交受理',
      notice: '受理页只处理受理、停飞、分派和时限，不提前做维修或放行判断。'
    },
    diagnosing: {
      title: '初始诊断',
      description: '结合日志和现场信息形成结构化初诊结果，决定是否进入领料。',
      submitText: '提交初诊',
      notice: '初诊助手只生成建议，最终结论以人工调整后提交为准。'
    },
    picking: {
      title: '领料确认',
      description: '按工单统一确认多项备件的申请数量、本次实领数量和库存结果。',
      submitText: '提交领料',
      notice: '领料采用单仓模式，一次性提交，不在行内逐条确认。'
    },
    repairing: {
      title: '维修执行',
      description: '记录维修动作、使用备件、工时和维修结论，提交后进入复检。',
      submitText: '提交维修',
      notice: '维修页需要真实记录本次动作和结果，供复检与放行继续追溯。'
    },
    inspecting: {
      title: '复检录入',
      description: '通过表单记录复检结果、试飞记录和复检意见，决定是否进入放行。',
      submitText: '提交复检',
      notice: '复检页提交的是复检结论，不直接展示“提交放行”文案。'
    },
    releasing: {
      title: '放行审核',
      description: '请在右侧抽屉提交最终放行结论，并补充必要的风险与限制说明。',
      submitText: '提交审核结论',
      notice: '放行审核只保留必要字段。'
    }
  }
  return activeProcessingStage.value ? metaMap[activeProcessingStage.value] : { title: '处理表单', description: '', submitText: '提交' }
})

const formatMaterialItems = (items?: WorkorderMaterialItem[]) =>
  items?.length
    ? items
        .map((item) => {
          const quantity = item.pickedQuantity ?? item.quantity
          const spec = item.spec ? `（${item.spec}）` : ''
          return `${item.name} x${quantity}${spec}`
        })
        .join('、')
    : '待补录'

const historyStageCards = computed<HistoryStageCard[]>(() => {
  if (!order.value) return []

  const cards: HistoryStageCard[] = []

  cards.push({
    key: 'created',
    title: '工单创建',
    at: order.value.createTime,
    operator: order.value.creator,
    tagLabel: order.value.sourceLabel,
    tagType: 'info',
    summary: order.value.timeline[0]?.detail || '已创建工单并进入待受理。',
    fields: [
      { label: '工单来源', value: order.value.sourceLabel },
      { label: '提交人', value: reporterDisplay.value || '-' },
      { label: '任务场景', value: taskSceneText.value || '-' },
      { label: '关联设备', value: `${order.value.deviceCode} / ${order.value.deviceName}` },
      { label: '异常现象', value: order.value.symptom || '-', full: true },
      { label: '现场描述', value: order.value.description || '-', full: true }
    ]
  })

  if (order.value.acceptance) {
    cards.push({
      key: 'acceptance',
      title: '工单受理',
      at: order.value.acceptance.acceptedAt,
      operator: order.value.acceptance.dispatcher || order.value.acceptance.assignee,
      tagLabel: acceptanceDecisionLabel(order.value.acceptance.decision),
      tagType: order.value.acceptance.decision === 'return_for_info' ? 'warning' : 'success',
      summary: order.value.acceptance.remark || '已完成受理、停飞确认和责任分派。',
      fields: [
        { label: '受理结论', value: acceptanceDecisionLabel(order.value.acceptance.decision) },
        { label: '停飞结论', value: order.value.acceptance.grounded ? '立即停飞' : '继续观察' },
        { label: '机务负责人', value: order.value.acceptance.dispatcher || '-' },
        { label: '维修责任人', value: order.value.acceptance.assignee || '-' },
        { label: '优先级', value: order.value.acceptance.priority },
        { label: '节点截止时间', value: order.value.acceptance.deadline || '-' },
        { label: '调整原因', value: order.value.acceptance.deadlineReason || '-' },
        { label: '受理备注', value: order.value.acceptance.remark || '-', full: true }
      ]
    })
  }

  if (order.value.diagnosis) {
    cards.push({
      key: 'diagnosis',
      title: '初始诊断',
      at: order.value.diagnosis.diagnosedAt,
      operator: order.value.diagnosis.engineer,
      tagLabel: riskLevelLabel(order.value.diagnosis.riskLevel),
      tagType: riskTagType(order.value.diagnosis.riskLevel),
      summary: order.value.diagnosis.conclusion || '已提交结构化初诊结果。',
      fields: [
        { label: '故障分类', value: order.value.diagnosis.faultCategory || '-' },
        { label: '疑似原因', value: order.value.diagnosis.probableCause || '-', full: true },
        { label: '风险等级', value: riskLevelLabel(order.value.diagnosis.riskLevel) },
        { label: '停飞建议', value: order.value.diagnosis.groundedSuggestion ? '建议停飞' : '可继续观察' },
        { label: '是否需要备件', value: order.value.diagnosis.needParts ? '是' : '否' },
        { label: '建议领料清单', value: order.value.diagnosis.suggestedParts.join('、') || '无', full: true },
        { label: '处理建议', value: order.value.diagnosis.conclusion || '-', full: true }
      ]
    })
  }

  if (order.value.picking) {
    cards.push({
      key: 'picking',
      title: '领料确认',
      at: order.value.picking.pickedAt,
      operator: order.value.picking.picker,
      tagLabel: order.value.picking.items.some((item) => item.status === 'pending') ? '部分待补齐' : '已领料',
      tagType: order.value.picking.items.some((item) => item.status === 'pending') ? 'warning' : 'success',
      summary: `已从 ${order.value.picking.warehouse} 提交 ${order.value.picking.items.length} 项备件领料。`,
      fields: [
        { label: '领料人', value: order.value.picking.picker || '-' },
        { label: '备件仓库', value: order.value.picking.warehouse || '-' },
        { label: '领料项数', value: `${order.value.picking.items.length} 项` },
        { label: '备件明细', value: formatMaterialItems(order.value.picking.items), full: true }
      ]
    })
  }

  if (order.value.repair) {
    cards.push({
      key: 'repair',
      title: '维修执行',
      at: order.value.repair.repairedAt,
      operator: order.value.repair.technician,
      tagLabel: '已提交',
      tagType: 'primary',
      summary: order.value.repair.result || '已提交维修结果。',
      fields: [
        { label: '维修责任人', value: order.value.repair.technician || '-' },
        { label: '工时', value: `${order.value.repair.usedHours} 小时` },
        { label: '使用备件', value: usedPartsSummary.value, full: true },
        { label: '维修动作', value: order.value.repair.solution || '-', full: true },
        { label: '维修结论', value: order.value.repair.result || '-', full: true }
      ]
    })
  }

  if (order.value.inspection) {
    cards.push({
      key: 'inspection',
      title: '复检记录',
      at: order.value.inspection.inspectedAt,
      operator: order.value.inspection.inspector,
      tagLabel: inspectionResultLabel(order.value.inspection.result),
      tagType: order.value.inspection.result === 'passed' ? 'success' : 'warning',
      summary: order.value.inspection.conclusion || '已提交复检意见。',
      fields: [
        { label: '复检结果', value: inspectionResultLabel(order.value.inspection.result) },
        { label: '复检人', value: order.value.inspection.inspector || '-' },
        { label: '电池核验', value: order.value.inspection.batteryCheck ? '已核验' : '未核验' },
        { label: '功能验证', value: order.value.inspection.flightTest ? '已验证' : '未验证' },
        { label: '试飞记录', value: order.value.inspection.flightRecord || '-', full: true },
        { label: '复检意见', value: order.value.inspection.conclusion || '-', full: true }
      ]
    })
  }

  if (order.value.release) {
    cards.push({
      key: 'release',
      title: '放行审核',
      at: order.value.release.reviewedAt,
      operator: order.value.release.reviewer,
      tagLabel: releaseLabel(order.value.release.result),
      tagType: releaseTagType(order.value.release.result),
      summary: order.value.release.conclusion || '已提交放行审核结果。',
      fields: [
        { label: '放行结论', value: releaseLabel(order.value.release.result) },
        { label: '风险等级', value: riskLevelLabel(order.value.release.riskLevel) },
        { label: '限制条件', value: order.value.release.restrictions || '无' },
        { label: '审核备注', value: order.value.release.conclusion || '-', full: true }
      ]
    })
  }

  return cards
})

const currentAction = computed(() => {
  if (!order.value) {
    return { title: '-', description: '-', primaryText: '' }
  }
  const actionMap: Record<WorkorderVO['status'], { title: string; description: string; primaryText?: string }> = {
    pending: {
      title: '当前应完成工单受理',
      description: '请确认是否停飞、责任分派和节点截止时间，提交后进入初始诊断。',
      primaryText: '去受理'
    },
    diagnosing: {
      title: '当前应进入初始诊断',
      description: '请结合日志和现场信息形成结构化初诊结果，并决定是否进入领料。',
      primaryText: '去初诊'
    },
    picking: {
      title: '当前应完成领料确认',
      description: '请统一确认多项备件的申请数量、本次实领数量和库存结果。',
      primaryText: '去领料'
    },
    repairing: {
      title: '当前应录入维修结果',
      description: '请在右侧抽屉补充维修动作、工时、使用备件和维修结论。',
      primaryText: '去维修'
    },
    inspecting: {
      title: '当前应提交复检结论',
      description: '请完成试飞记录、复检意见和核验项，决定是否进入放行审核。',
      primaryText: '去复检'
    },
    releasing: {
      title: '当前应完成放行审核',
      description: '请结合维修与复检结果，在右侧抽屉提交最终审核结论。',
      primaryText: '去放行'
    },
    completed: {
      title: '当前工单已完成闭环',
      description: '可回看放行结论、处理记录和全部证据资料。'
    },
    closed: {
      title: '当前工单已关闭',
      description: '该工单已结束处理，可查看关闭原因和责任链记录。'
    }
  }
  return actionMap[order.value.status]
})

const normalizeSuggestedParts = (text: string): PickingDraftItem[] =>
  text
    .split(/[、，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [namePart, quantityPart] = item.split(/x|X|×/)
      const name = namePart.trim()
      const quantity = Number(quantityPart?.trim() || 1)
      return {
        itemId: undefined,
        name,
        spec: order.value?.deviceName || '',
        requestedQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        pickedQuantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        currentInventory: 0,
        manual: false
      }
    })

const hydratePickItemsInventory = async () => {
  await Promise.all(
    pickForm.items
      .filter((item) => item.name.trim())
      .map((item) => refreshItemInventory(item))
  )
}

const seedPickItemsFromDiagnosis = async () => {
  if (!diagnoseForm.suggestedPartsText.trim()) {
    diagnoseForm.suggestedPartsText = order.value?.diagnosis?.suggestedParts.join('、') || ''
  }
  pickForm.items = normalizeSuggestedParts(diagnoseForm.suggestedPartsText)
  await hydratePickItemsInventory()
  await loadInventoryReference()
}

const addPickItem = async () => {
  pickForm.items.push({
    itemId: undefined,
    name: '',
    spec: order.value?.deviceName || '',
    requestedQuantity: 1,
    pickedQuantity: 1,
    currentInventory: 0,
    manual: true
  })
  await nextTick()
  document
    .querySelector('.pick-items .pick-item-card:last-child')
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  message.success('已新增一项补充备件，请填写名称并确认本次实领数量')
}

const removePickItem = (index: number) => {
  pickForm.items.splice(index, 1)
}

const pickStatusLabel = (item: PickingDraftItem) => {
  if (!item.pickedQuantity) return '待确认'
  if (item.currentInventory < item.pickedQuantity) return '库存不足'
  if (item.pickedQuantity < item.requestedQuantity) return '部分领料'
  return '可领料'
}

const pickStatusType = (item: PickingDraftItem) => {
  if (!item.pickedQuantity) return 'info'
  if (item.currentInventory < item.pickedQuantity) return 'danger'
  if (item.pickedQuantity < item.requestedQuantity) return 'warning'
  return 'success'
}

const parsePickItems = (): WorkorderMaterialItem[] =>
  pickForm.items
    .filter((item) => item.name.trim() && item.pickedQuantity > 0)
    .map((item) => ({
      name: item.name.trim(),
      spec: item.spec.trim(),
      quantity: item.pickedQuantity,
      requestedQuantity: item.requestedQuantity,
      pickedQuantity: item.pickedQuantity,
      currentInventory: item.currentInventory,
      status: item.currentInventory >= item.pickedQuantity ? 'picked' : 'pending'
    }))

const DIAGNOSIS_ASSISTANT_CONTEXT_MARK = '[DIAGNOSIS_ASSISTANT_CONTEXT]'

const getDiagnosisAssistantStorageKey = () =>
  order.value ? `yian_workorder_diagnosis_ai_${order.value.id}` : ''

const isDiagnosisAssistantHiddenPrompt = (content?: string) =>
  !!content && content.startsWith(DIAGNOSIS_ASSISTANT_CONTEXT_MARK)

const stripDiagnosisDraftTag = (content: string) =>
  content
    .replace(/<diagnosis_draft>[\s\S]*?<\/diagnosis_draft>/gi, '')
    .replace(/<diagnosis_draft>[\s\S]*$/gi, '')
    .trim()

const normalizeDiagnosisAssistantDraft = (payload: Record<string, any>): DiagnosisAssistantDraftResult => {
  const suggestedParts = Array.isArray(payload.suggestedParts)
    ? payload.suggestedParts.map((item) => String(item || '').trim()).filter(Boolean)
    : String(payload.suggestedPartsText || payload.suggestedParts || '')
        .split(/[\u3001\uFF0C,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
  return {
    faultCategory: String(payload.faultCategory || '').trim(),
    probableCause: String(payload.probableCause || '').trim(),
    riskLevel: ['high', 'medium', 'low'].includes(payload.riskLevel)
      ? (payload.riskLevel as WorkorderRiskLevel)
      : 'medium',
    groundedSuggestion:
      payload.groundedSuggestion === true ||
      String(payload.groundedSuggestion).toLowerCase() === 'true',
    needParts: payload.needParts === true || String(payload.needParts).toLowerCase() === 'true',
    suggestedParts,
    suggestedPartsText:
      String(payload.suggestedPartsText || '').trim() || diagnosisAssistantSuggestedPartsText(suggestedParts),
    conclusion: String(payload.conclusion || '').trim()
  }
}

const extractDiagnosisDraft = (content: string): DiagnosisAssistantDraftResult | null => {
  const matched = content.match(/<diagnosis_draft>([\s\S]*?)<\/diagnosis_draft>/i)
  if (!matched?.[1]) {
    return null
  }
  try {
    return normalizeDiagnosisAssistantDraft(JSON.parse(matched[1].trim()))
  } catch (error) {
    console.warn('[diagnosis-assistant] failed to parse diagnosis draft', error)
    return null
  }
}

const syncDiagnosisAssistantDraftFromMessages = () => {
  const latestAssistantMessages = [...diagnosisAssistantMessages.value]
    .reverse()
    .filter((item) => item.role === 'assistant')
  for (const item of latestAssistantMessages) {
    const parsed = extractDiagnosisDraft(item.rawContent || item.content)
    if (parsed) {
      diagnosisAssistantDraftResult.value = parsed
      return
    }
  }
  diagnosisAssistantDraftResult.value = null
}

const buildDiagnosisAssistantSystemMessage = () => `你是“翼安智链”维修工单里的 AI 初诊助手，服务对象是机务和维修工程师。
你的目标是基于工单、飞行日志状态、现场附件状态和聊天上下文，持续追问并收敛出可写入初诊表单的结构化结论。

你必须遵守以下规则：
1. 优先基于当前工单上下文和历史对话判断信息是否充分。
2. 如果信息不足，只追问最关键的 1 到 3 个问题。
3. 如果用户补充了新信息，要结合前后文持续修正判断。
4. 每次回复都必须包含自然语言回复，以及一个 <diagnosis_draft>...</diagnosis_draft> 标签。
5. diagnosis_draft 中必须是合法 JSON，且必须包含：
{
  "faultCategory": "字符串",
  "probableCause": "字符串",
  "riskLevel": "high|medium|low",
  "groundedSuggestion": true,
  "needParts": true,
  "suggestedParts": ["字符串"],
  "conclusion": "字符串"
}
6. 即使信息不足，也要输出“当前版本”的 diagnosis_draft，并在自然语言中说明不确定点。
7. 不能宣称已经自动提交工单，也不能自动推进节点；最终以人工确认提交为准。`

const buildDiagnosisAssistantContextPrompt = (kind: 'initial' | 'refresh') => {
  if (!order.value) {
    return `${DIAGNOSIS_ASSISTANT_CONTEXT_MARK}\n当前工单上下文缺失，请提示用户稍后重试。`
  }
  const diagnosis = order.value.diagnosis
  const imageNames = imageAttachments.value.length
    ? imageAttachments.value.map((item) => item.name).join('、')
    : '暂无现场附件'
  const logNames = logAttachments.value.length
    ? logAttachments.value.map((item) => item.name).join('、')
    : '暂无飞行日志'
  const formDraftSummary = [
    diagnoseForm.faultCategory ? `故障分类：${diagnoseForm.faultCategory}` : '',
    diagnoseForm.probableCause ? `疑似原因：${diagnoseForm.probableCause}` : '',
    diagnoseForm.conclusion ? `处理建议：${diagnoseForm.conclusion}` : ''
  ]
    .filter(Boolean)
    .join('；')

  return `${DIAGNOSIS_ASSISTANT_CONTEXT_MARK}
当前模式：${kind === 'initial' ? '首轮初诊' : '上下文刷新后继续初诊'}
请基于以下上下文继续完成初诊助手职责：

工单号：${order.value.orderNo}
设备：${order.value.deviceCode} / ${order.value.deviceName}
站点：${order.value.siteName}
任务场景：${taskSceneText.value}
当前状态：${order.value.statusLabel}
异常现象：${order.value.symptom}
现场描述：${order.value.description || '暂无现场描述'}
飞行日志状态：${logAttachments.value.length ? `已导入（${logNames}）` : '尚未导入原始飞行日志'}
现场附件状态：${imageAttachments.value.length ? `已导入（${imageNames}）` : '尚未导入现场图片或截图'}
当前人工表单草稿：${formDraftSummary || '尚未填写'}
已有历史初诊：${diagnosis ? `${diagnosis.faultCategory} / ${diagnosis.probableCause} / ${diagnosis.conclusion}` : '暂无'}

请先给出当前判断，再提出下一轮最关键的追问；如果信息已经足够，也要直接收敛出可写入初诊表单的 diagnosis_draft。`
}

const persistDiagnosisAssistantConversationId = (conversationId: number | null) => {
  const key = getDiagnosisAssistantStorageKey()
  if (!key) {
    return
  }
  if (conversationId) {
    window.sessionStorage.setItem(key, String(conversationId))
  } else {
    window.sessionStorage.removeItem(key)
  }
}

const restoreDiagnosisAssistantConversationId = () => {
  const key = getDiagnosisAssistantStorageKey()
  if (!key) {
    return null
  }
  const stored = window.sessionStorage.getItem(key)
  if (!stored) {
    return null
  }
  const parsed = Number(stored)
  return Number.isFinite(parsed) ? parsed : null
}

const mapDiagnosisAssistantChatMessage = (item: any): DiagnosisAssistantMessage | null => {
  if (item?.type === 'user' && isDiagnosisAssistantHiddenPrompt(item.content)) {
    return null
  }
  if (item?.type !== 'user' && item?.type !== 'assistant') {
    return null
  }
  const rawContent = item.content || ''
  const displayContent =
    item.type === 'assistant' ? stripDiagnosisDraftTag(rawContent) || rawContent : rawContent
  return {
    role: item.type === 'assistant' ? 'assistant' : 'user',
    title: item.type === 'assistant' ? '诊断助手' : '机务输入',
    content: displayContent,
    rawContent
  }
}

const syncDiagnosisAssistantMessagesFromConversation = async () => {
  if (!diagnosisAssistantConversationId.value) {
    diagnosisAssistantMessages.value = []
    diagnosisAssistantDraftResult.value = null
    return
  }
  const list = await ChatMessageApi.getChatMessageListByConversationId(diagnosisAssistantConversationId.value)
  diagnosisAssistantMessages.value = (Array.isArray(list) ? list : [])
    .map((item) => mapDiagnosisAssistantChatMessage(item))
    .filter(Boolean) as DiagnosisAssistantMessage[]
  syncDiagnosisAssistantDraftFromMessages()
}

const resolveDiagnosisAssistantErrorMessage = (error: any, fallback: string) => {
  const rawMessage = String(error?.message || error?.response?.data?.msg || fallback || '').trim()
  if (!rawMessage) {
    return fallback
  }
  if (rawMessage.includes('yudao-module-ai') && rawMessage.includes('已禁用')) {
    return '当前环境尚未启用 AI 大模型能力，请先在后端配置并启用 AI 模型后再使用初诊助手。'
  }
  return rawMessage
}

const ensureDiagnosisAssistantConversation = async () => {
  if (!order.value) {
    throw new Error('当前工单不存在，无法启动初诊助手')
  }
  if (!diagnosisAssistantConversationId.value) {
    diagnosisAssistantConversationId.value = restoreDiagnosisAssistantConversationId()
  }
  if (!diagnosisAssistantConversationId.value) {
    diagnosisAssistantConversationId.value = await ChatConversationApi.createChatConversationMy({})
  }
  await ChatConversationApi.updateChatConversationMy({
    id: diagnosisAssistantConversationId.value,
    title: `工单初诊助手-${order.value.orderNo}`,
    systemMessage: buildDiagnosisAssistantSystemMessage(),
    temperature: 0.2,
    maxContexts: 20
  })
  persistDiagnosisAssistantConversationId(diagnosisAssistantConversationId.value)
  return diagnosisAssistantConversationId.value
}

const sendDiagnosisAssistantMessage = async (
  content: string,
  options: { hiddenUserMessage?: boolean } = {}
) => {
  if (!order.value || diagnosisAssistantStreaming.value) {
    return
  }
  const conversationId = await ensureDiagnosisAssistantConversation()
  diagnosisAssistantStreaming.value = true
  diagnosisAssistantAbortController.value = new AbortController()
  if (!options.hiddenUserMessage) {
    diagnosisAssistantMessages.value.push({
      role: 'user',
      title: '机务输入',
      content
    })
  }
  const assistantMessage: DiagnosisAssistantMessage = {
    role: 'assistant',
    title: '诊断助手',
    content: '正在结合当前工单上下文分析，请稍候...',
    rawContent: ''
  }
  diagnosisAssistantMessages.value.push(assistantMessage)
  let fullContent = ''
  try {
    await ChatMessageApi.sendChatMessageStream(
      conversationId,
      content,
      diagnosisAssistantAbortController.value,
      true,
      false,
      async (res) => {
        const { code, data, msg } = JSON.parse(res.data)
        if (code !== 0) {
          throw new Error(msg || 'AI 初诊助手调用失败')
        }
        if (!data?.receive?.content && !data?.receive?.reasoningContent) {
          return
        }
        fullContent += data.receive.content || ''
        assistantMessage.rawContent = fullContent
        assistantMessage.content =
          stripDiagnosisDraftTag(fullContent) || '正在整理当前初诊草案，请稍候...'
        const parsed = extractDiagnosisDraft(fullContent)
        if (parsed) {
          diagnosisAssistantDraftResult.value = parsed
        }
      },
      (error: any) => {
        throw error
      },
      () => {
        diagnosisAssistantStreaming.value = false
      }
    )
    assistantMessage.rawContent = fullContent
    assistantMessage.content = stripDiagnosisDraftTag(fullContent) || assistantMessage.content
    syncDiagnosisAssistantDraftFromMessages()
  } catch (error: any) {
    const tip = resolveDiagnosisAssistantErrorMessage(
      error,
      '这轮诊断没有成功发出，请确认 AI 模型已配置，并稍后重试。'
    )
    diagnosisAssistantMessages.value.pop()
    if (!options.hiddenUserMessage) {
      diagnosisAssistantMessages.value.push({
        role: 'assistant',
        title: '诊断助手',
        content: tip,
        rawContent: tip
      })
    }
    throw error
  } finally {
    diagnosisAssistantStreaming.value = false
  }
}

const bootstrapDiagnosisAssistant = async () => {
  if (!order.value || diagnosisAssistantBootstrapping.value) {
    return
  }
  diagnosisAssistantBootstrapping.value = true
  try {
    await ensureDiagnosisAssistantConversation()
    await syncDiagnosisAssistantMessagesFromConversation()
    if (!diagnosisAssistantMessages.value.length) {
      await sendDiagnosisAssistantMessage(buildDiagnosisAssistantContextPrompt('initial'), {
        hiddenUserMessage: true
      })
    } else if (diagnosisAssistantContextDirty.value) {
      await sendDiagnosisAssistantMessage(buildDiagnosisAssistantContextPrompt('refresh'), {
        hiddenUserMessage: true
      })
    }
    diagnosisAssistantContextDirty.value = false
  } finally {
    diagnosisAssistantBootstrapping.value = false
  }
}

const openDiagnosisAssistant = async () => {
  diagnosisAssistantDraft.value = ''
  diagnosisAssistantVisible.value = true
  try {
    await bootstrapDiagnosisAssistant()
  } catch (error: any) {
    const tip = resolveDiagnosisAssistantErrorMessage(error, '初诊助手暂时不可用，请稍后重试')
    diagnosisAssistantMessages.value = [
      {
        role: 'assistant',
        title: '诊断助手',
        content: tip,
        rawContent: tip
      }
    ]
    diagnosisAssistantDraftResult.value = null
    message.error(tip)
  }
}

const handleDiagnosisAssistantReimportLog = () => {
  diagnosisAssistantVisible.value = false
  diagnosisAssistantContextDirty.value = true
  handleImportLog()
}

const sendDiagnosisAssistantPrompt = async () => {
  const draft = diagnosisAssistantDraft.value.trim()
  if (!draft) {
    message.warning('请先输入补充问题或现场信息')
    return
  }
  diagnosisAssistantDraft.value = ''
  try {
    await sendDiagnosisAssistantMessage(draft)
  } catch (error: any) {
    message.error(resolveDiagnosisAssistantErrorMessage(error, '初诊助手回复失败，请稍后重试'))
  }
}

const handleItemSearch = async (keyword: string) => {
  itemOptionsLoading.value = true
  try {
    itemOptions.value = await getItemSimpleList(keyword)
  } finally {
    itemOptionsLoading.value = false
  }
}

const mergeInventoryReferenceRows = (rows: MaterialStockVO[]) => {
  const merged = new Map<number, MaterialStockVO>()
  inventoryReferenceRows.value.forEach((row) => merged.set(row.id, row))
  rows.forEach((row) => merged.set(row.id, row))
  inventoryReferenceRows.value = Array.from(merged.values())
}

const refreshItemInventory = async (item: PickingDraftItem) => {
  if (!item.name.trim()) return
  try {
    const page = await getMaterialStockPage({
      pageNo: 1,
      pageSize: 20,
      keyword: item.name.trim(),
      virtualFilter: 'exclude'
    })
    const rows = Array.isArray(page?.list) ? page.list : Array.isArray(page) ? page : []
    mergeInventoryReferenceRows(rows)
    const matchedRows = rows.filter((row: MaterialStockVO) =>
      item.itemId ? row.itemId === item.itemId : row.itemName === item.name
    )
    const fallbackRow = matchedRows[0] || rows.find((row: MaterialStockVO) => row.itemName === item.name)
    if (!item.itemId && fallbackRow) {
      item.itemId = fallbackRow.itemId
    }
    if ((!item.spec || item.spec === order.value?.deviceName) && fallbackRow?.specification) {
      item.spec = fallbackRow.specification
    }
    const totalQuantity = matchedRows.reduce((sum: number, row: MaterialStockVO) => sum + Number(row.quantity || 0), 0)
    item.currentInventory = totalQuantity
    item.pickedQuantity = Math.min(item.pickedQuantity, totalQuantity)
  } catch {
    item.currentInventory = 0
  }
}

const handleManualItemChange = async (index: number) => {
  const item = pickForm.items[index]
  if (!item) return
  const selected = itemOptions.value.find((option) => option.id === item.itemId)
  if (!selected) {
    item.itemId = undefined
    item.name = ''
    item.spec = ''
    item.currentInventory = 0
    return
  }
  item.name = selected.name
  item.spec = selected.specification || ''
  await refreshItemInventory(item)
}

const syncPickItemsInventory = () => {
  if (!inventoryReferenceRows.value.length) {
    message.warning('当前没有可写回的库存参考数据')
    return
  }
  const stockMap = new Map(
    inventoryReferenceRows.value.map((row) => [row.itemId, row])
  )
  pickForm.items = pickForm.items.map((item) => {
    const matched = item.itemId ? stockMap.get(item.itemId) : undefined
    if (!matched) return item
    const cappedQuantity = Math.min(item.pickedQuantity, matched.quantity)
    return {
      ...item,
      currentInventory: matched.quantity,
      pickedQuantity: cappedQuantity
    }
  })
  inventoryReferenceDialogVisible.value = false
  message.success('已把库存参考写回当前领料清单')
}

const loadInventoryReference = async () => {
  const keywords = Array.from(
    new Set(
      pickForm.items
        .map((item) => item.name.trim())
        .filter(Boolean)
    )
  )
  if (!keywords.length) {
    inventoryReferenceRows.value = []
    return
  }
  inventoryReferenceLoading.value = true
  try {
    const result = await Promise.all(
      keywords.map((keyword) =>
        getMaterialStockPage({
          pageNo: 1,
          pageSize: 10,
          keyword,
          virtualFilter: 'exclude'
        })
      )
    )
    const merged = new Map<number, MaterialStockVO>()
    result.forEach((page) => {
      const rows = Array.isArray(page?.list) ? page.list : Array.isArray(page) ? page : []
      rows.forEach((row: MaterialStockVO) => {
        merged.set(row.id, row)
      })
    })
    inventoryReferenceRows.value = Array.from(merged.values())
  } catch {
    inventoryReferenceRows.value = []
    message.warning('库存参考加载失败，请稍后再试')
  } finally {
    inventoryReferenceLoading.value = false
  }
}

const openInventoryReference = async () => {
  inventoryReferenceDialogVisible.value = true
  await loadInventoryReference()
}

const buildPickAllocations = () => {
  const stockRowMap = new Map<number, MaterialStockVO[]>()
  inventoryReferenceRows.value.forEach((row) => {
    const rows = stockRowMap.get(row.itemId) || []
    rows.push(row)
    stockRowMap.set(row.itemId, rows)
  })

  return pickForm.items
    .filter((item) => item.name.trim() && item.pickedQuantity > 0)
    .map((item) => {
      const rows = item.itemId ? stockRowMap.get(item.itemId) || [] : []
      let remaining = item.pickedQuantity
      const allocations: Array<{ row: MaterialStockVO; quantity: number }> = []
      rows.forEach((row) => {
        if (remaining <= 0) {
          return
        }
        const available = Number(row.quantity || 0)
        if (available <= 0) {
          return
        }
        const consumeQuantity = Math.min(remaining, available)
        allocations.push({ row, quantity: consumeQuantity })
        remaining -= consumeQuantity
      })
      return {
        item,
        allocations,
        remaining
      }
    })
}

const syncPickingInventoryToStock = async () => {
  if (!order.value) {
    return
  }
  const issueId = await WmMiscIssueApi.createMiscIssue({
    code: `MI-${order.value.id}-${Date.now()}`,
    name: `${order.value.orderNo}领料出库`,
    type: 1,
    sourceDocType: 'WORKORDER',
    sourceDocId: order.value.id,
    sourceDocCode: order.value.orderNo,
    issueDate: new Date().toISOString(),
    remark: `${order.value.orderNo} 工单领料`
  } as any)

  const allocations = buildPickAllocations()
  for (const allocation of allocations) {
    for (const detail of allocation.allocations) {
      await WmMiscIssueLineApi.createMiscIssueLine({
        issueId,
        sourceDocLineId: 0,
        materialStockId: detail.row.id,
        itemId: detail.row.itemId,
        itemCode: detail.row.itemCode,
        itemName: detail.row.itemName,
        specification: detail.row.specification,
        unitMeasure: detail.row.unitMeasureName,
        unitMeasureName: detail.row.unitMeasureName,
        quantity: detail.quantity,
        batchId: detail.row.batchId,
        batchCode: detail.row.batchCode,
        warehouseId: detail.row.warehouseId,
        warehouseCode: detail.row.warehouseCode,
        warehouseName: detail.row.warehouseName,
        locationId: detail.row.locationId,
        locationCode: '',
        locationName: detail.row.locationName,
        areaId: detail.row.areaId,
        areaCode: '',
        areaName: detail.row.areaName,
        remark: `${order.value.orderNo} 工单领料`
      } as any)
    }
  }

  await WmMiscIssueApi.submitMiscIssue(issueId)
  await WmMiscIssueApi.finishMiscIssue(issueId)
}

const loadPersonnelOptions = async () => {
  personnelLoading.value = true
  try {
    const data = await getPersonnelPage({ pageNo: 1, pageSize: 200 })
    personnelOptions.value = data.list || []
  } finally {
    personnelLoading.value = false
  }
}

const applyPersonnelDefaults = () => {
  acceptForm.dispatcher = dispatcherOptions.value[0]?.value || currentOperatorName.value
  acceptForm.assignee = assigneeOptions.value[0]?.value || currentOperatorName.value
  diagnoseForm.engineer = acceptForm.assignee || currentOperatorName.value
  pickForm.picker = pickerOptions.value[0]?.value || currentOperatorName.value
  repairForm.technician = acceptForm.assignee || currentOperatorName.value
  inspectForm.inspector = inspectorOptions.value[0]?.value || currentOperatorName.value
  releaseForm.reviewer = reviewerOptions.value[0]?.value || currentOperatorName.value
}

const ensureCurrentOperator = async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
}

const resetStageForms = () => {
  acceptForm.decision = 'accepted'
  acceptForm.grounded = true
  acceptForm.dispatcher = ''
  acceptForm.assignee = ''
  acceptForm.priority = 'P2'
  acceptForm.deadline = order.value?.slaDeadline || ''
  acceptForm.deadlineReason = ''
  acceptForm.remark = ''

  diagnoseForm.engineer = ''
  diagnoseForm.faultCategory = ''
  diagnoseForm.probableCause = ''
  diagnoseForm.riskLevel = order.value?.riskLevel === 'unrated' ? 'medium' : (order.value?.riskLevel || 'medium')
  diagnoseForm.groundedSuggestion = true
  diagnoseForm.needParts = true
  diagnoseForm.suggestedPartsText = ''
  diagnoseForm.conclusion = ''

  pickForm.picker = ''
  pickForm.warehouse = '华东备件库'
  pickForm.items = []

  repairForm.technician = ''
  repairForm.solution = ''
  repairForm.result = ''
  repairForm.usedHours = 2

  inspectForm.inspector = ''
  inspectForm.result = 'passed'
  inspectForm.flightRecord = ''
  inspectForm.conclusion = ''
  inspectForm.batteryCheck = true
  inspectForm.flightTest = true

  releaseForm.reviewer = ''
  releaseForm.result = 'approved'
  releaseForm.riskLevel = order.value?.riskLevel === 'unrated' ? 'medium' : (order.value?.riskLevel || 'medium')
  releaseForm.restrictions = ''
  releaseForm.conclusion = ''
  applyPersonnelDefaults()
}

const syncFormsFromOrder = () => {
  if (!order.value) return
  const acceptance = order.value.acceptance
  if (acceptance) {
    acceptForm.decision = acceptance.decision
    acceptForm.grounded = acceptance.grounded
    acceptForm.dispatcher = acceptance.dispatcher
    acceptForm.assignee = acceptance.assignee
    acceptForm.priority = acceptance.priority
    acceptForm.deadline = acceptance.deadline
    acceptForm.deadlineReason = acceptance.deadlineReason || ''
    acceptForm.remark = acceptance.remark || ''
  }

  const diagnosis = order.value.diagnosis
  if (diagnosis) {
    diagnoseForm.engineer = diagnosis.engineer
    diagnoseForm.faultCategory = diagnosis.faultCategory
    diagnoseForm.probableCause = diagnosis.probableCause || ''
    diagnoseForm.riskLevel = diagnosis.riskLevel
    diagnoseForm.groundedSuggestion = diagnosis.groundedSuggestion
    diagnoseForm.needParts = diagnosis.needParts
    diagnoseForm.suggestedPartsText = diagnosis.suggestedParts.join('、')
    diagnoseForm.conclusion = diagnosis.conclusion
  } else if (acceptForm.assignee) {
    diagnoseForm.engineer = acceptForm.assignee
  }

  const picking = order.value.picking
  if (picking) {
    pickForm.picker = picking.picker
    pickForm.warehouse = picking.warehouse
    pickForm.items = picking.items.map((item, index) => ({
      itemId: undefined,
      name: item.name,
      spec: item.spec,
      requestedQuantity: item.requestedQuantity || item.quantity,
      pickedQuantity: item.pickedQuantity || item.quantity,
      currentInventory: item.currentInventory ?? item.quantity + index + 2,
      manual: false
    }))
  } else if (diagnoseForm.suggestedPartsText) {
    pickForm.items = normalizeSuggestedParts(diagnoseForm.suggestedPartsText)
  }
  if (!pickForm.picker) {
    pickForm.picker = pickerOptions.value[0]?.value || currentOperatorName.value
  }

  const repair = order.value.repair
  if (repair) {
    repairForm.technician = repair.technician
    repairForm.solution = repair.solution
    repairForm.result = repair.result
    repairForm.usedHours = repair.usedHours
  } else if (acceptForm.assignee) {
    repairForm.technician = acceptForm.assignee
  }

  const inspection = order.value.inspection
  if (inspection) {
    inspectForm.inspector = inspection.inspector
    inspectForm.result = inspection.result
    inspectForm.flightRecord = inspection.flightRecord || ''
    inspectForm.conclusion = inspection.conclusion
    inspectForm.batteryCheck = inspection.batteryCheck
    inspectForm.flightTest = inspection.flightTest
  }

  const release = order.value.release
  releaseForm.reviewer = release?.reviewer || reviewerOptions.value[0]?.value || currentOperatorName.value
  releaseForm.result = release?.result || 'approved'
  releaseForm.riskLevel = release?.riskLevel || (order.value.riskLevel === 'unrated' ? 'medium' : order.value.riskLevel)
  releaseForm.restrictions = release?.restrictions || ''
  releaseForm.conclusion = release?.conclusion || ''
}

const loadOrder = async () => {
  try {
    await ensureCurrentOperator()
    if (!personnelOptions.value.length) {
      await loadPersonnelOptions()
    }
    order.value = YianWorkorderApi.getDetail(Number(route.params.id))
    resetStageForms()
    syncFormsFromOrder()
    expandedHistoryStages.value = historyStageCards.value.length
      ? [historyStageCards.value[historyStageCards.value.length - 1].key]
      : []
  } catch {
    order.value = undefined
    inventoryReferenceRows.value = []
    expandedHistoryStages.value = []
  }
}

const openProcessingDrawer = async () => {
  if (!order.value || !activeProcessingStage.value) return
  resetStageForms()
  syncFormsFromOrder()
  if (order.value.status === 'picking') {
    await hydratePickItemsInventory()
    await loadInventoryReference()
  }
  processingDrawerVisible.value = true
}

const openRequestedProcessingDrawer = async () => {
  const requestedStage = getRequestedProcessingStage()
  if (!requestedStage || requestedStage !== activeProcessingStage.value) {
    return
  }
  await openProcessingDrawer()
}

const handlePrimaryAction = () => {
  openProcessingDrawer()
}

const handleViewEvidence = () => {
  evidenceDialogVisible.value = true
}

const handleImportImage = () => {
  imageImportDialogVisible.value = true
}

const handleImportLog = () => {
  logImportDialogVisible.value = true
}

const toUploadUserFiles = (files: UploadFiles) =>
  files.map((item) => ({
    name: item.name,
    status: item.status,
    url: item.url
  }))

const toAttachmentMeta = (files: UploadFiles, type: WorkorderAttachmentItem['type']): WorkorderAttachmentItem[] =>
  files.map((item) => ({
    name: item.name,
    type,
    size: item.raw?.size ?? 0,
    mimeType: item.raw?.type || ''
  }))

const handleImageUploadChange = (_file: UploadFile, files: UploadFiles) => {
  imageUploadList.value = toUploadUserFiles(files)
  pendingImageAttachments.value = toAttachmentMeta(files, 'image')
}

const handleImageUploadRemove = (_file: UploadFile, files: UploadFiles) => {
  imageUploadList.value = toUploadUserFiles(files)
  pendingImageAttachments.value = toAttachmentMeta(files, 'image')
}

const handleLogUploadChange = (_file: UploadFile, files: UploadFiles) => {
  logUploadList.value = toUploadUserFiles(files)
  pendingLogAttachments.value = toAttachmentMeta(files, 'log')
}

const handleLogUploadRemove = (_file: UploadFile, files: UploadFiles) => {
  logUploadList.value = toUploadUserFiles(files)
  pendingLogAttachments.value = toAttachmentMeta(files, 'log')
}

const submitImageImport = async () => {
  if (!order.value || !pendingImageAttachments.value.length) {
    message.warning('请先选择要补录的图片文件')
    return
  }
  YianWorkorderApi.appendAttachments(order.value.id, {
    type: 'image',
    files: pendingImageAttachments.value,
    operator: currentOperatorName.value
  })
  message.success(`已补录 ${pendingImageAttachments.value.length} 份现场图片`)
  imageImportDialogVisible.value = false
  imageUploadList.value = []
  pendingImageAttachments.value = []
  diagnosisAssistantContextDirty.value = true
  await loadOrder()
}

const submitLogImport = async () => {
  if (!order.value || !pendingLogAttachments.value.length) {
    message.warning('请先选择要导入的日志文件')
    return
  }
  YianWorkorderApi.appendAttachments(order.value.id, {
    type: 'log',
    files: pendingLogAttachments.value,
    operator: currentOperatorName.value
  })
  message.success(`已补录 ${pendingLogAttachments.value.length} 份日志附件`)
  logImportDialogVisible.value = false
  logUploadList.value = []
  pendingLogAttachments.value = []
  diagnosisAssistantContextDirty.value = true
  await loadOrder()
}

const applyDiagnosisAssistant = () => {
  if (!diagnosisAssistantDraftResult.value) {
    message.warning('请先通过初诊助手完成一轮 AI 诊断，再写入当前草案')
    openDiagnosisAssistant()
    return
  }
  const suggestion = diagnosisAssistantDraftResult.value
  diagnoseForm.faultCategory = suggestion.faultCategory
  diagnoseForm.probableCause = suggestion.probableCause
  diagnoseForm.riskLevel = suggestion.riskLevel
  diagnoseForm.groundedSuggestion = suggestion.groundedSuggestion
  diagnoseForm.needParts = suggestion.needParts
  diagnoseForm.suggestedPartsText = suggestion.suggestedPartsText
  diagnoseForm.conclusion = suggestion.conclusion
  message.success('已将 AI 当前收敛出的初诊草案写入表单，可继续人工调整。')
}

const writeDiagnosisAssistantToDiagnosis = async () => {
  if (diagnosisAssistantStreaming.value) {
    message.warning('AI 仍在生成当前诊断结果，请稍候再写入初诊')
    return
  }
  if (diagnosisAssistantDraft.value.trim()) {
    await sendDiagnosisAssistantPrompt()
  }
  if (!diagnosisAssistantDraftResult.value) {
    message.warning('当前还没有可写入的结构化初诊草案，请继续与初诊助手对话')
    return
  }
  applyDiagnosisAssistant()
  message.success('已将初诊助手当前对话结果写入初诊表单。')
  diagnosisAssistantVisible.value = false
}

const submitAcceptance = async () => {
  if (!order.value || !acceptForm.dispatcher || !acceptForm.assignee || !acceptForm.deadline) {
    message.warning('请完整填写受理、分派和节点截止时间')
    return
  }
  if (acceptForm.decision === 'return_for_info') {
    message.warning('当前 MVP 仅演示主链路流转，退回补充资料暂不在详情页内推进。')
    return
  }
  YianWorkorderApi.submitAcceptance(order.value.id, {
    decision: acceptForm.decision,
    grounded: acceptForm.grounded,
    dispatcher: acceptForm.dispatcher,
    assignee: acceptForm.assignee,
    priority: acceptForm.priority,
    deadline: acceptForm.deadline,
    deadlineReason: acceptForm.deadlineReason,
    remark: acceptForm.remark
  })
  processingDrawerVisible.value = false
  message.success('已提交受理并进入初始诊断')
  await loadOrder()
}

const submitDiagnosis = async () => {
  if (!order.value || !diagnoseForm.engineer || !diagnoseForm.faultCategory || !diagnoseForm.probableCause) {
    message.warning('请完整填写故障分类和疑似原因')
    return
  }
  if (!diagnoseForm.conclusion) {
    message.warning('请填写处理建议')
    return
  }
  YianWorkorderApi.submitDiagnosis(order.value.id, {
    engineer: diagnoseForm.engineer,
    faultCategory: diagnoseForm.faultCategory,
    probableCause: diagnoseForm.probableCause,
    riskLevel: diagnoseForm.riskLevel,
    groundedSuggestion: diagnoseForm.groundedSuggestion,
    needParts: diagnoseForm.needParts,
    conclusion: diagnoseForm.conclusion,
    suggestedParts: diagnoseForm.suggestedPartsText
      .split(/[、，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  })
  processingDrawerVisible.value = false
  message.success(diagnoseForm.needParts ? '已提交初诊并进入领料' : '已提交初诊并直接进入维修')
  await loadOrder()
}

const submitPicking = async () => {
  if (!order.value) {
    return
  }
  pickForm.picker = pickForm.picker.trim() || currentOperatorName.value
  pickForm.warehouse = pickForm.warehouse.trim() || '华东备件库'
  if (!pickForm.picker || !pickForm.warehouse.trim()) {
    message.warning('请先确认领料人和备件仓库')
    return
  }
  await hydratePickItemsInventory()
  await loadInventoryReference()
  const items = parsePickItems()
  if (!items.length) {
    message.warning('请至少填写一项备件')
    return
  }
  if (pickForm.items.some((item) => item.name.trim() && item.pickedQuantity > 0 && !item.itemId)) {
    message.warning('请先为每一项领料匹配真实备件，再提交领料')
    return
  }
  if (items.some((item) => item.currentInventory !== undefined && item.currentInventory < item.pickedQuantity!)) {
    message.warning('当前存在库存不足的备件，无法完成领料')
    return
  }
  const allocations = buildPickAllocations()
  if (allocations.some((item) => item.remaining > 0)) {
    message.warning('当前库存分配不足，无法完成领料')
    return
  }
  await syncPickingInventoryToStock()
  YianWorkorderApi.submitPicking(order.value.id, {
    picker: pickForm.picker,
    warehouse: pickForm.warehouse.trim(),
    items
  })
  processingDrawerVisible.value = false
  message.success('已完成领料并进入维修')
  await loadOrder()
}

const submitRepair = async () => {
  if (!order.value || !repairForm.technician || !repairForm.solution || !repairForm.result) {
    message.warning('请完整填写维修动作和维修结论')
    return
  }
  YianWorkorderApi.submitRepair(order.value.id, {
    technician: repairForm.technician,
    solution: repairForm.solution,
    result: repairForm.result,
    usedHours: repairForm.usedHours
  })
  processingDrawerVisible.value = false
  message.success('已提交维修结果并进入复检')
  await loadOrder()
}

const submitInspection = async (forcedResult?: 'passed' | 'failed') => {
  if (!order.value || !inspectForm.inspector || !inspectForm.conclusion) {
    message.warning('请完整填写复检结果和复检意见')
    return
  }
  const result = forcedResult || inspectForm.result
  YianWorkorderApi.submitInspection(order.value.id, {
    inspector: inspectForm.inspector,
    result,
    flightRecord: inspectForm.flightRecord,
    conclusion: inspectForm.conclusion,
    batteryCheck: inspectForm.batteryCheck,
    flightTest: inspectForm.flightTest
  })
  processingDrawerVisible.value = false
  message.success(result === 'passed' ? '已提交复检并进入放行审核' : '复检未通过，已退回维修')
  await loadOrder()
}

const submitRelease = async (forcedResult?: WorkorderReleaseResult) => {
  if (!order.value || !releaseForm.reviewer || !releaseForm.conclusion) {
    message.warning('请完整填写放行审核信息')
    return
  }
  const result = forcedResult || releaseForm.result
  if (result === 'limited' && !releaseForm.restrictions.trim()) {
    message.warning('限制放行时请填写限制条件')
    return
  }
  YianWorkorderApi.submitRelease(order.value.id, {
    reviewer: releaseForm.reviewer,
    result,
    riskLevel: releaseForm.riskLevel,
    restrictions: result === 'limited' ? releaseForm.restrictions.trim() : '',
    conclusion: releaseForm.conclusion
  })
  processingDrawerVisible.value = false
  message.success(result === 'rejected' ? '已驳回放行并退回维修' : '已提交放行审核结论')
  await loadOrder()
}

const handleDrawerSubmit = async () => {
  if (drawerSubmitting.value) {
    return
  }
  drawerSubmitting.value = true
  try {
    switch (order.value?.status) {
      case 'pending':
        await submitAcceptance()
        break
      case 'diagnosing':
        await submitDiagnosis()
        break
      case 'picking':
        await submitPicking()
        break
      case 'repairing':
        await submitRepair()
        break
      case 'inspecting':
        await submitInspection()
        break
      case 'releasing':
        await submitRelease()
        break
      default:
        break
    }
  } catch (error: any) {
    if (!error?.message) {
      message.error('提交失败，请稍后重试')
    }
  } finally {
    drawerSubmitting.value = false
  }
}

const formatFileSize = (size: number) => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

watch(
  () => route.params.id,
  async () => {
    processingDrawerVisible.value = false
    evidenceDialogVisible.value = false
    imageImportDialogVisible.value = false
    logImportDialogVisible.value = false
    diagnosisAssistantVisible.value = false
    inventoryReferenceDialogVisible.value = false
    imageUploadList.value = []
    logUploadList.value = []
    pendingImageAttachments.value = []
    pendingLogAttachments.value = []
    diagnosisAssistantDraft.value = ''
    diagnosisAssistantMessages.value = []
    diagnosisAssistantDraftResult.value = null
    diagnosisAssistantConversationId.value = null
    diagnosisAssistantContextDirty.value = false
    diagnosisAssistantStreaming.value = false
    diagnosisAssistantAbortController.value?.abort()
    diagnosisAssistantAbortController.value = null
    inventoryReferenceRows.value = []
    await loadOrder()
    await openRequestedProcessingDrawer()
  },
  { immediate: true }
)

watch(
  () => route.query.stage,
  async (stage, previousStage) => {
    if (!stage || stage === previousStage || !order.value) {
      return
    }
    await openRequestedProcessingDrawer()
  }
)

watch(
  () => acceptForm.assignee,
  (value) => {
    if (!order.value?.repair) {
      diagnoseForm.engineer = value || currentOperatorName.value
      repairForm.technician = value || currentOperatorName.value
    }
  }
)

watch(
  () => releaseForm.result,
  (value) => {
    if (value !== 'limited') {
      releaseForm.restrictions = ''
    }
  }
)
</script>

<style lang="scss" scoped>
.detail-card__head,
.section-header,
.drawer-inline-head,
.pick-item-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-card__title,
.drawer-hero__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.detail-card__meta,
.timeline-text,
.action-panel__desc,
.evidence-item p,
.drawer-hero__desc,
.drawer-inline-head p,
.diagnosis-assistant__message p {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
  font-size: 12px;
}

.detail-card__meta,
.drawer-hero__desc {
  margin-top: 8px;
}

.detail-card__tags,
.drawer-hero__chips,
.drawer-footer,
.diagnosis-assistant__chips,
.diagnosis-assistant__toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.info-field {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.diagnosis-assistant {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.diagnosis-assistant__toolbar {
  justify-content: space-between;
  align-items: center;
}

.diagnosis-assistant__messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diagnosis-assistant__message {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 14px;
  background: var(--el-fill-color-blank);
}

.diagnosis-assistant__message strong {
  display: inline-block;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
}

.diagnosis-assistant__message p {
  margin: 0;
}

.diagnosis-assistant__message--assistant {
  background: linear-gradient(180deg, var(--el-color-primary-light-9), #fff);
}

.diagnosis-assistant__message--user {
  background: var(--el-fill-color-light);
}

.diagnosis-assistant__draft {
  padding: 14px 16px;
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--el-color-primary-light-9), #fff);
}

.diagnosis-assistant__draft-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.diagnosis-assistant__draft-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.diagnosis-assistant__draft-grid > div {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
}

.diagnosis-assistant__draft-grid > div.full {
  grid-column: 1 / -1;
}

.diagnosis-assistant__draft-grid strong,
.diagnosis-assistant__draft-grid span {
  display: block;
}

.diagnosis-assistant__draft-grid strong {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.diagnosis-assistant__draft-grid span {
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.diagnosis-assistant__composer {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 16px;
  background: var(--el-fill-color-blank);
}

.diagnosis-assistant__composer .drawer-footer {
  margin-top: 12px;
}

.info-field strong {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.info-field span {
  display: block;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.info-field--full {
  grid-column: 1 / -1;
}

.evidence-list,
.processing-drawer,
.pick-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evidence-item,
.drawer-hero,
.pick-item-card,
.history-stage-card {
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-blank);
}

.history-stage-collapse {
  --el-collapse-border-color: transparent;
}

.history-stage-collapse__item {
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

.history-stage-title,
.history-stage-title__tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-stage-title {
  width: 100%;
  justify-content: space-between;
  padding-right: 12px;
}

.history-stage-title__main {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.history-stage-title__meta,
.history-stage-card__summary {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}

.history-stage-card__summary {
  margin: 0 0 12px;
}

.timeline-title,
.action-panel__title,
.drawer-inline-head__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.action-panel__desc {
  margin: 12px 0 16px;
}

.drawer-inline-head {
  margin-bottom: 12px;
}

.drawer-helper-text {
  margin: -4px 0 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  font-size: 12px;
}

.info-grid--compact {
  margin-top: 0;
}

.pick-item-card__action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.pick-item-card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pick-item-card__quantity-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pick-item-card__quantity-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.pick-item-card__tips {
  display: flex;
  gap: 12px;
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  font-size: 12px;
}

.pick-item-card__manual-note {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.pick-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.pick-option__meta {
  color: var(--el-text-color-secondary);
}

.drawer-footer {
  width: 100%;
  justify-content: flex-end;
}

.text-danger {
  color: var(--el-color-danger);
}

:deep(.el-upload-dragger) {
  width: 100%;
}

:deep(.el-drawer__body) {
  padding-top: 8px;
}

:deep(.history-stage-collapse .el-collapse-item__header) {
  height: auto;
  min-height: 72px;
  padding: 12px 16px;
  border-bottom: 0;
  background: transparent;
}

:deep(.history-stage-collapse .el-collapse-item__wrap) {
  border-top: 1px solid var(--el-border-color-light);
  border-bottom: 0;
}

:deep(.history-stage-collapse .el-collapse-item__content) {
  padding: 0;
}

@media (max-width: 900px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-field--full {
    grid-column: auto;
  }
}
</style>
