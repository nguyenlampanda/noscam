import apiClient from './apiClient'

import { API_ENDPOINTS } from '../constants/api'
import {
  getResponseData,
  getResponseMessage,
} from '../utils/apiResponse'

import { mapReportPayload } from '../utils/mappers/reportMapper'

export async function createReport(formData) {
  if (!formData) {
    throw new Error(
      'Dữ liệu báo cáo không hợp lệ.',
    )
  }

  const payload = mapReportPayload(formData)

  const response = await apiClient.post(
    API_ENDPOINTS.REPORTS,
    payload,
  )

  return {
    data: getResponseData(response),

    message: getResponseMessage(
      response,
      'Báo cáo đã được gửi thành công.',
    ),
  }
}

export default {
  createReport,
}