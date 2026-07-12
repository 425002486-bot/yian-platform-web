import request from '@/config/axios'

export interface YianAiCapabilityVO {
  mockEnabled: boolean
  realModelReady: boolean
  recommendedMode: 'mock' | 'model'
  modelName?: string
  message: string
}

export interface YianAiDocumentFieldVO {
  label: string
  value: string
}

export interface YianAiDocumentItemVO {
  id: string
  fileName: string
  documentType: string
  parseResult: string
  parseSource: string
  uploadedBy: string
  uploadedAt: string
  url?: string
}

export interface YianAssetDeviceDocumentParseRespVO {
  mode: 'mock' | 'model' | 'fallback'
  parseSummary: string
  parseSource: string
  parseUpdatedAt: string
  parsedFields: YianAiDocumentFieldVO[]
  warnings: string[]
  missingItems: string[]
  documents: YianAiDocumentItemVO[]
}

export interface YianWorkorderLogAttachmentVO {
  name: string
  type: 'log'
  size: number
  mimeType: string
  url?: string
}

export interface YianWorkorderFlightLogParseRespVO {
  mode: 'mock' | 'model' | 'fallback'
  summary: string
  assistantContextSummary: string
  parseSource: string
  droneSn?: string
  batterySns?: string[]
  flightDurationSec?: number
  logType?: string
  attachments: YianWorkorderLogAttachmentVO[]
}

export interface YianWorkorderDiagnosisDraftReqVO {
  workorderId?: number
  orderNo: string
  deviceCode: string
  deviceName?: string
  siteName?: string
  taskScene?: string
  symptom: string
  description?: string
  flightLogSummary?: string
  imageSummary?: string
  attachmentNames?: string[]
}

export interface YianWorkorderDiagnosisDraftRespVO {
  mode: 'mock' | 'model' | 'fallback'
  faultCategory: string
  probableCause: string
  riskLevel: 'high' | 'medium' | 'low'
  groundedSuggestion: boolean
  needParts: boolean
  suggestedParts: string[]
  suggestedPartsText: string
  conclusion: string
  summary: string
  rawResponse?: string
}

export const YianAiApi = {
  getCapabilities: async () => {
    return await request.get<YianAiCapabilityVO>({ url: '/yian/ai/capabilities' })
  },

  parseAssetDeviceDocuments: async (payload: {
    machineryId?: number
    code: string
    uploadedBy: string
    files: File[]
  }) => {
    const formData = new FormData()
    if (payload.machineryId) {
      formData.append('machineryId', String(payload.machineryId))
    }
    formData.append('code', payload.code)
    formData.append('uploadedBy', payload.uploadedBy)
    payload.files.forEach((file) => formData.append('files', file))
    return await request.upload<YianAssetDeviceDocumentParseRespVO>({
      url: '/yian/ai/asset/device/parse-documents',
      data: formData
    })
  },

  getLatestAssetDeviceDocuments: async (params: { machineryId?: number; code?: string }) => {
    return await request.get<YianAssetDeviceDocumentParseRespVO | null>({
      url: '/yian/ai/asset/device/latest-documents',
      params
    })
  },

  reparseAssetDeviceDocuments: async (payload: {
    machineryId?: number
    code: string
    operator: string
    fileNames: string[]
    files?: Array<{
      fileName: string
      mimeType?: string
      url?: string
    }>
  }) => {
    return await request.post<YianAssetDeviceDocumentParseRespVO>({
      url: '/yian/ai/asset/device/reparse-documents',
      data: payload
    })
  },

  parseWorkorderFlightLogs: async (payload: {
    workorderId?: number
    orderNo: string
    deviceCode: string
    uploadedBy: string
    files: File[]
  }) => {
    const formData = new FormData()
    if (payload.workorderId) {
      formData.append('workorderId', String(payload.workorderId))
    }
    formData.append('orderNo', payload.orderNo)
    formData.append('deviceCode', payload.deviceCode)
    formData.append('uploadedBy', payload.uploadedBy)
    payload.files.forEach((file) => formData.append('files', file))
    return await request.upload<YianWorkorderFlightLogParseRespVO>({
      url: '/yian/ai/workorder/parse-flight-logs',
      data: formData
    })
  },

  getLatestWorkorderFlightLogParse: async (params: { workorderId?: number; orderNo?: string }) => {
    return await request.get<YianWorkorderFlightLogParseRespVO | null>({
      url: '/yian/ai/workorder/latest-flight-log-parse',
      params
    })
  },

  generateDiagnosisDraft: async (data: YianWorkorderDiagnosisDraftReqVO) => {
    return await request.post<YianWorkorderDiagnosisDraftRespVO>({
      url: '/yian/ai/workorder/generate-diagnosis-draft',
      data
    })
  },

  getLatestDiagnosisDraft: async (params: { workorderId?: number; orderNo?: string }) => {
    return await request.get<YianWorkorderDiagnosisDraftRespVO | null>({
      url: '/yian/ai/workorder/latest-diagnosis-draft',
      params
    })
  }
}
