import apiClient from './apiClient'

import { API_ENDPOINTS } from '../constants/api'
import {
  getPagination,
  getResponseData,
} from '../utils/apiResponse'

import { mapAlerts } from '../utils/mappers/alertMapper'

export async function getAlerts(
  filters = {},
  options = {},
) {
  const params = new URLSearchParams()

  if (
    filters.category &&
    filters.category !== 'all'
  ) {
    params.set('category', filters.category)
  }

  if (filters.page) {
    params.set('page', String(filters.page))
  }

  const queryString = params.toString()

  const endpoint = queryString
    ? `${API_ENDPOINTS.ALERTS}?${queryString}`
    : API_ENDPOINTS.ALERTS

  const response = await apiClient.get(
    endpoint,
    {
      signal: options.signal,
    },
  )

  const data = getResponseData(response)

  return {
    alerts: mapAlerts(
      Array.isArray(data) ? data : [],
    ),

    pagination: getPagination(response),
  }
}

export default {
  getAlerts,
}