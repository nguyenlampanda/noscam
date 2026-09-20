import apiClient from './apiClient'

import { API_ENDPOINTS } from '../constants/api'
import { getResponseData } from '../utils/apiResponse'
import { mapSearchResult } from '../utils/mappers/searchMapper'

export async function searchInformation(
  query,
  options = {},
) {
  const trimmedQuery = query?.trim()

  if (!trimmedQuery) {
    throw new Error(
      'Vui lòng nhập thông tin cần kiểm tra.',
    )
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
  })

  const response = await apiClient.get(
    `${API_ENDPOINTS.SEARCH}?${params.toString()}`,
    {
      signal: options.signal,
    },
  )

  const data = getResponseData(response)

  return mapSearchResult(data)
}

export default {
  searchInformation,
}