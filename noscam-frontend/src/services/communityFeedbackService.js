import apiClient from './apiClient'
import { API_ENDPOINTS } from '../constants/api'

const emptySummary = {
  total: 0,
  counts: {
    positive: 0,
    caution: 0,
    unclear: 0,
    consider: 0,
  },
  affectsRiskScore: false,
}

function mapSummary(data) {
  if (!data) return emptySummary

  return {
    total: Number(data.total ?? 0),
    counts: {
      positive: Number(data.counts?.positive ?? 0),
      caution: Number(data.counts?.caution ?? 0),
      unclear: Number(data.counts?.unclear ?? 0),
      consider: Number(data.counts?.consider ?? 0),
    },
    affectsRiskScore:
      Boolean(data.affects_risk_score),
  }
}

export async function getCommunityFeedback(
  type,
  value,
  options = {},
) {
  const params = new URLSearchParams({
    type,
    value,
  })

  const response = await apiClient.get(
    `${API_ENDPOINTS.COMMUNITY_FEEDBACK}?${params}`,
    {
      signal: options.signal,
    },
  )

  return mapSummary(response?.data)
}

export async function submitCommunityFeedback(
  type,
  value,
  feedback,
) {
  const response = await apiClient.post(
    API_ENDPOINTS.COMMUNITY_FEEDBACK,
    {
      type,
      value,
      feedback,
    },
  )

  return {
    selected:
      response?.data?.selected ??
      feedback,

    message:
      response?.message ??
      'Đã ghi nhận đóng góp của bạn.',

    summary:
      mapSummary(
        response?.data?.summary,
      ),
  }
}
