import apiClient from './apiClient'
import { getCustomerToken } from './customerService'

function authOptions(extraHeaders = {}) {
  const token = getCustomerToken()

  if (!token) {
    throw new Error('Vui lòng đăng nhập để sử dụng Exchange.')
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  }
}

const exchangeService = {
  prices() {
    return apiClient.get('/exchange/prices', authOptions())
  },

  accounts() {
    return apiClient.get('/exchange/accounts', authOptions())
  },

  createAccount(data) {
    return apiClient.post(
      '/exchange/accounts',
      data,
      authOptions(),
    )
  },

  setDefaultAccount(id) {
    return apiClient.patch(
      `/exchange/accounts/${encodeURIComponent(id)}/default`,
      {},
      authOptions(),
    )
  },

  disableAccount(id) {
    return apiClient.delete(
      `/exchange/accounts/${encodeURIComponent(id)}`,
      authOptions(),
    )
  },

  campaigns(page = 1) {
    return apiClient.get(
      `/exchange/campaigns?page=${encodeURIComponent(page)}`,
      authOptions(),
    )
  },

  tasks(page = 1) {
    return apiClient.get(
      `/exchange/tasks?page=${encodeURIComponent(page)}`,
      authOptions(),
    )
  },

  campaignClaims(campaignId, page = 1, filters = {}) {
    const pageNumber = Number(page)
    const perPage = Number(filters.perPage ?? 20)

    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) {
      throw new Error('Số trang không hợp lệ.')
    }

    if (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 50) {
      throw new Error('Số nhiệm vụ mỗi trang không hợp lệ.')
    }

    const params = new URLSearchParams({
      page: String(pageNumber),
      per_page: String(perPage),
    })

    const status = String(filters.status || 'all').trim()
    const search = String(filters.search || '').trim()

    if (status !== 'all') {
      params.set('status', status)
    }

    if (search) {
      if (search.length > 100) {
        throw new Error('Từ khóa tìm kiếm quá dài.')
      }
      params.set('search', search)
    }

    return apiClient.get(
      `/exchange/campaigns/${encodeURIComponent(campaignId)}/claims?${params.toString()}`,
      authOptions(),
    )
  },

  myClaims(page = 1) {
    return apiClient.get(
      `/exchange/claims/mine?page=${encodeURIComponent(page)}`,
      authOptions(),
    )
  },

  claimTask(campaignId, socialAccountId) {
    return apiClient.post(
      `/exchange/tasks/${encodeURIComponent(campaignId)}/claim`,
      { social_account_id: socialAccountId },
      authOptions(),
    )
  },

  submitClaim(claimId) {
    return apiClient.post(
      `/exchange/claims/${encodeURIComponent(claimId)}/submit`,
      {},
      authOptions(),
    )
  },

  appealClaim(claimId, reason) {
    return apiClient.post(
      `/exchange/claims/${encodeURIComponent(claimId)}/appeal`,
      { reason },
      authOptions(),
    )
  },

  approveClaim(claimId) {
    return apiClient.post(
      `/exchange/claims/${encodeURIComponent(claimId)}/approve`,
      {},
      authOptions(),
    )
  },

  rejectClaim(claimId, reason) {
    const message = String(reason || '').trim()

    if (!message || message.length > 2000) {
      throw new Error('Lý do từ chối phải từ 1 đến 2000 ký tự.')
    }

    return apiClient.post(
      `/exchange/claims/${encodeURIComponent(claimId)}/reject`,
      { reason: message },
      authOptions(),
    )
  },

  lookupCampaign(key) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key || '')) {
      throw new Error('Mã giao dịch không hợp lệ.')
    }

    return apiClient.get(
      `/exchange/campaigns/by-request/${encodeURIComponent(key)}`,
      authOptions(),
    )
  },

  createCampaign(data, idempotencyKey) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey || '')) {
      throw new Error('Mã chống gửi trùng không hợp lệ.')
    }

    return apiClient.post(
      '/exchange/campaigns',
      data,
      authOptions({
        'Idempotency-Key': idempotencyKey,
      }),
    )
  },
}

export default exchangeService
