import apiClient from './apiClient'
import { getAdminToken } from './adminService'

function authOptions() {
  const token = getAdminToken()

  if (!token) {
    throw new Error('Vui lòng đăng nhập Admin.')
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

function validatePrice(data) {
  const platforms = ['instagram', 'tiktok', 'facebook']
  const taskTypes = ['follow', 'like', 'comment']

  if (!platforms.includes(data.platform)) {
    throw new Error('Nền tảng không hợp lệ.')
  }

  if (!taskTypes.includes(data.task_type)) {
    throw new Error('Loại nhiệm vụ không hợp lệ.')
  }

  const cost = Number(data.cost_per_task)
  const reward = Number(data.reward_per_task)
  const minQuantity = Number(data.min_quantity)

  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(reward) ||
    cost < 1 ||
    reward < 1 ||
    cost > 999999999 ||
    reward > cost
  ) {
    throw new Error(
      'Giá và thưởng phải là số nguyên dương; thưởng không vượt quá giá.',
    )
  }

  if (
    !Number.isSafeInteger(minQuantity) ||
    minQuantity < 1 ||
    minQuantity > 100000
  ) {
    throw new Error(
      'Số lượng tối thiểu phải từ 1 đến 100.000 lượt.',
    )
  }

  if (typeof data.is_enabled !== 'boolean') {
    throw new Error('Trạng thái nhiệm vụ không hợp lệ.')
  }

  return {
    platform: data.platform,
    task_type: data.task_type,
    cost_per_task: cost,
    reward_per_task: reward,
    min_quantity: minQuantity,
    is_enabled: data.is_enabled,
  }
}

export const adminExchangeService = {
  async campaigns({ status = '', platform = '', page = 1 } = {}) {
    const params = new URLSearchParams()

    if (status) params.set('status', status)
    if (platform) params.set('platform', platform)
    params.set('page', String(page))
    params.set('per_page', '15')

    return apiClient.get(
      `/admin/exchange/campaigns?${params.toString()}`,
      authOptions(),
    )
  },

  async campaignClaims(campaignId) {
    const id = Number(campaignId)

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Mã chiến dịch không hợp lệ.')
    }

    return apiClient.get(
      `/admin/exchange/campaigns/${id}/claims`,
      authOptions(),
    )
  },

  async changeCampaignStatus(campaignId, action, reason) {
    const id = Number(campaignId)
    const cleanReason = String(reason ?? '').trim() || 'Admin thay đổi trạng thái chiến dịch.'

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Mã chiến dịch không hợp lệ.')
    }

    if (!['pause', 'resume'].includes(action)) {
      throw new Error('Thao tác không hợp lệ.')
    }

    if (cleanReason.length > 2000) {
      throw new Error('Lý do phải có từ 3 đến 2000 ký tự.')
    }

    return apiClient.patch(
      `/admin/exchange/campaigns/${id}/status`,
      { action, reason: cleanReason },
      authOptions(),
    )
  },

  async requestCampaignCancellation(campaignId, reason) {
    const id = Number(campaignId)
    const cleanReason = String(reason ?? '').trim() || 'Admin yêu cầu hủy chiến dịch và hoàn ngân sách còn lại.'

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Mã chiến dịch không hợp lệ.')
    }

    if (cleanReason.length < 10 || cleanReason.length > 2000) {
      throw new Error('Lý do phải có từ 10 đến 2000 ký tự.')
    }

    return apiClient.post(
      `/admin/exchange/campaigns/${id}/cancel-request`,
      { reason: cleanReason, confirm: true },
      authOptions(),
    )
  },

  async finalizeCampaignCancellation(campaignId, reason) {
    const id = Number(campaignId)
    const cleanReason = String(reason ?? '').trim()

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Mã chiến dịch không hợp lệ.')
    }

    if (cleanReason.length < 10 || cleanReason.length > 2000) {
      throw new Error('Lý do phải có từ 10 đến 2000 ký tự.')
    }

    return apiClient.post(
      `/admin/exchange/campaigns/${id}/cancel-finalize`,
      { reason: cleanReason, confirm: true },
      authOptions(),
    )
  },

  async disputes({ status = 'pending', page = 1 } = {}) {
    const params = new URLSearchParams()

    params.set('status', status)
    params.set('page', String(page))
    params.set('per_page', '15')

    return apiClient.get(
      `/admin/exchange/disputes?${params.toString()}`,
      authOptions(),
    )
  },

  async resolveDispute(disputeId, { decision, reason }) {
    const id = Number(disputeId)

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Mã khiếu nại không hợp lệ.')
    }

    if (!['approve', 'refund'].includes(decision)) {
      throw new Error('Quyết định phân xử không hợp lệ.')
    }

    const cleanReason = String(reason ?? '').trim()

    if (!cleanReason || cleanReason.length > 2000) {
      throw new Error('Lý do phải có từ 1 đến 2000 ký tự.')
    }

    return apiClient.post(
      `/admin/exchange/disputes/${id}/resolve`,
      { decision, reason: cleanReason },
      authOptions(),
    )
  },

  async prices() {
    return apiClient.get(
      '/admin/exchange/prices',
      authOptions(),
    )
  },

  async updatePrice(data) {
    return apiClient.put(
      '/admin/exchange/prices',
      validatePrice(data),
      authOptions(),
    )
  },
}

export default adminExchangeService
