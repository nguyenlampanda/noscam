import apiClient from './apiClient'

import {
  API_ENDPOINTS,
} from '../constants/api'

export async function getPublicStats(
  options = {},
) {
  const response =
    await apiClient.get(
      API_ENDPOINTS.STATS,
      {
        signal: options.signal,
      },
    )

  const data =
    response?.data || {}

  return {
    searches:
      Number(data.searches ?? 0),

    reports:
      Number(data.reports ?? 0),

    alerts:
      Number(data.alerts ?? 0),

    communityFeedbacks:
      Number(
        data.community_feedbacks ?? 0,
      ),
  }
}

export default {
  getPublicStats,
}
