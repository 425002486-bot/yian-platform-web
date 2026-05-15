import request from '@/config/axios'
import { LocalDemoMesApi, isLocalMesDemoEnabled } from '@/api/mes/localDemo'

export const AutoCodeRecordApi = {
  generateAutoCode: async (ruleCode: string, inputChar?: string) => {
    try {
      return await request.post({
        url: '/mes/md/auto-code-record/generate',
        data: { ruleCode, inputChar }
      })
    } catch (error) {
      if (isLocalMesDemoEnabled()) {
        return LocalDemoMesApi.generateAutoCode(ruleCode, inputChar)
      }
      throw error
    }
  }
}
