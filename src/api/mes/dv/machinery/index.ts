import request from '@/config/axios'

// MES 设备台账 VO
export interface DvMachineryVO {
  id: number
  code: string
  name: string
  brand: string
  specification: string
  machineryTypeId: number
  machineryTypeName: string
  workshopId: number
  workshopName: string
  status: number
  lastMaintenTime: Date
  lastCheckTime: Date
  remark: string
}

// MES 设备台账 API
export const DvMachineryApi = {
  // 查询设备台账分页
  getMachineryPage: async (params: any) => {
    return await request.get({ url: `/mes/dv/machinery/page`, params })
  },

  // 查询设备台账详情
  getMachinery: async (id: number) => {
    return await request.get({ url: `/mes/dv/machinery/get?id=` + id })
  },

  // 新增设备台账
  createMachinery: async (data: DvMachineryVO) => {
    return await request.post({ url: `/mes/dv/machinery/create`, data })
  },

  // 修改设备台账
  updateMachinery: async (data: DvMachineryVO) => {
    return await request.put({ url: `/mes/dv/machinery/update`, data })
  },

  // 删除设备台账
  deleteMachinery: async (id: number) => {
    return await request.delete({ url: `/mes/dv/machinery/delete?id=` + id })
  },

  // 导出设备台账 Excel
  exportMachinery: async (params: any) => {
    return await request.download({ url: `/mes/dv/machinery/export-excel`, params })
  },

  // 下载设备导入模板
  importTemplate: async () => {
    return await request.download({ url: `/mes/dv/machinery/get-import-template` })
  },

  // 导入设备台账
  importMachinery: async (file: File, updateSupport = false) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await request.upload({
      url: `/mes/dv/machinery/import`,
      data: formData,
      params: { updateSupport }
    })
    return response.data
  }
}
