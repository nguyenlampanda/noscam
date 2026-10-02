import apiClient from './apiClient'

import { API_ENDPOINTS } from '../constants/api'
import { getPagination } from '../utils/apiResponse'
import { mapAlerts } from '../utils/mappers/alertMapper'

export async function getAlerts(
  filters = {},
  options = {},
) {
  const params =
    new URLSearchParams()

  if (
    filters.category &&
    filters.category !== 'all'
  ) {
    params.set(
      'category',
      filters.category,
    )
  }

  if (
    filters.risk &&
    filters.risk !== 'all'
  ) {
    params.set(
      'risk',
      filters.risk,
    )
  }

  if (filters.sort) {
    params.set(
      'sort',
      filters.sort,
    )
  }

  if (filters.page) {
    params.set(
      'page',
      String(filters.page),
    )
  }

  if (filters.perPage) {
    params.set(
      'per_page',
      String(filters.perPage),
    )
  }

  const queryString =
    params.toString()

  const endpoint =
    queryString
      ? `${API_ENDPOINTS.ALERTS}?${queryString}`
      : API_ENDPOINTS.ALERTS

  const response =
    await apiClient.get(
      endpoint,
      {
        signal:
          options.signal,
      },
    )

  return {
    alerts: mapAlerts(
      Array.isArray(response?.data)
        ? response.data
        : [],
    ),

    pagination:
      getPagination(response),

    filters:
      response?.meta?.filters ??
      {},
  }
}

export default {
  getAlerts,
}
