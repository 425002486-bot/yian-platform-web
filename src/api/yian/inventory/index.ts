import request from '@/config/axios'

export interface MaterialStockVO {
  id: number
  itemTypeId: number
  itemTypeName: string
  itemId: number
  itemCode: string
  itemName: string
  specification: string
  unitMeasureName: string
  minStock: number
  batchId: number
  batchCode: string
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  locationId: number
  locationName: string
  areaId: number
  areaName: string
  vendorId: number
  vendorName: string
  quantity: number
  receiptTime: string
  frozen: boolean
  createTime: string
}

export interface MaterialStockPageReqVO {
  pageNo: number
  pageSize: number
  keyword?: string
  itemTypeId?: number
  itemId?: number
  warehouseId?: number
  vendorId?: number
  frozen?: boolean
  virtualFilter?: string
}

// 获得库存台账分页
export const getMaterialStockPage = (params: MaterialStockPageReqVO) => {
  return request.get({ url: '/mes/wm/material-stock/page', params })
}

// 获得库存记录详情
export const getMaterialStock = (id: number) => {
  return request.get({ url: '/mes/wm/material-stock/get', params: { id } })
}

// 入库登记
export interface InboundReqVO {
  inboundType: string
  itemId: number
  quantity: number
  vendorId?: number
  batchCode?: string
  warehouseId?: number
  locationId?: number
  areaId?: number
  remark?: string
}

export const submitInbound = (data: InboundReqVO) => {
  return request.post({ url: '/mes/wm/material-stock/inbound', data })
}

// 备件精简列表（下拉选择用）
export const getItemSimpleList = (keyword?: string) => {
  return request.get({ url: '/mes/wm/material-stock/item-simple-list', params: { keyword } })
}

// 供应商精简列表（下拉选择用）
export const getVendorSimpleList = () => {
  return request.get({ url: '/mes/wm/material-stock/vendor-simple-list' })
}

// 领退料记录
export interface PickReturnRecordVO {
  id: number
  issueCode: string
  workOrderCode: string
  itemName: string
  itemCode: string
  actionType: string
  quantity: number
  operatorName: string
  resultStatus: string
  createTime: string
}

// 下载备件导入模板
export const downloadImportTemplate = () => {
  return request.download({ url: '/mes/wm/material-stock/import-template' })
}

// 导入备件 Excel
export const importSparePartExcel = (file: File, updateSupport?: boolean) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('updateSupport', String(updateSupport ?? false))
  return request.upload({ url: '/mes/wm/material-stock/import-excel', data: formData })
}

export const getPickReturnRecords = (params?: { issueCode?: string; actionType?: string }) => {
  return request.get({ url: '/mes/wm/material-stock/pick-return-records', params })
}
