import apiClient, {
  API_BASE_URL,
} from './apiClient'

const TOKEN_KEY =
  'noscam_admin_token'

export function getAdminToken() {
  return localStorage.getItem(
    TOKEN_KEY,
  )
}

export function setAdminToken(
  token,
) {
  localStorage.setItem(
    TOKEN_KEY,
    token,
  )
}

export function removeAdminToken() {
  localStorage.removeItem(
    TOKEN_KEY,
  )
}

function authOptions() {
  const token =
    getAdminToken()

  return {
    headers: {
      Authorization:
        `Bearer ${token}`,
    },
  }
}

async function adminRequest(
  callback,
) {
  try {
    return await callback()
  } catch (error) {
    if (
      error?.status === 401 ||
      error?.status === 403
    ) {
      removeAdminToken()
    }

    throw error
  }
}

export const adminService = {
  async login(
    email,
    password,
  ) {
    const response =
      await apiClient.post(
        '/admin/login',
        {
          email:
            email.trim(),

          password,
        },
      )

    const token =
      response?.data?.token

    if (!token) {
      throw new Error(
        'Máy chủ không trả về token đăng nhập.',
      )
    }

    setAdminToken(token)

    return response.data
  },

  async me() {
    return adminRequest(
      () =>
        apiClient.get(
          '/admin/me',
          authOptions(),
        ),
    )
  },

  async logout() {
    try {
      if (getAdminToken()) {
        await apiClient.post(
          '/admin/logout',
          undefined,
          authOptions(),
        )
      }
    } catch {
      // Vẫn xóa token local nếu server
      // không còn nhận phiên hiện tại.
    } finally {
      removeAdminToken()
    }
  },

  async getDashboard() {
    return adminRequest(
      () =>
        apiClient.get(
          '/admin/dashboard',
          authOptions(),
        ),
    )
  },

  async getReports(
    status = 'pending',
    search = '',
    page = 1,
  ) {
    const params =
      new URLSearchParams()

    params.set(
      'status',
      status,
    )

    params.set(
      'page',
      String(page),
    )

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/reports?${params.toString()}`,
          authOptions(),
        ),
    )
  },

  async getReport(id) {
    return adminRequest(
      () =>
        apiClient.get(
          `/admin/reports/${id}`,
          authOptions(),
        ),
    )
  },

  async updateReportStatus(
    id,
    status,
  ) {
    return adminRequest(
      () =>
        apiClient.patch(
          `/admin/reports/${id}/status`,
          { status },
          authOptions(),
        ),
    )
  },

  async getMediators(
    search = '',
    page = 1,
    status = '',
  ) {
    const params =
      new URLSearchParams()

    params.set(
      'page',
      String(page),
    )

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    if (status) {
      params.set(
        'status',
        status,
      )
    }

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/mediators?${params.toString()}`,
          authOptions(),
        ),
    )
  },

  async getMediator(id) {
    return adminRequest(
      () =>
        apiClient.get(
          `/admin/mediators/${id}`,
          authOptions(),
        ),
    )
  },

  async createMediator(data) {
    return adminRequest(
      () =>
        apiClient.post(
          '/admin/mediators',
          data,
          authOptions(),
        ),
    )
  },

  async updateMediator(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.put(
          `/admin/mediators/${id}`,
          data,
          authOptions(),
        ),
    )
  },

  async addMediatorDeposit(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/mediators/${id}/deposits`,
          data,
          authOptions(),
        ),
    )
  },

  async getSocialDashboard() {
    return adminRequest(
      () =>
        apiClient.get(
          '/admin/social/dashboard',
          authOptions(),
        ),
    )
  },

  async getSocialProviders() {
    return adminRequest(
      () =>
        apiClient.get(
          '/admin/social/providers',
          authOptions(),
        ),
    )
  },

  async updateSocialProvider(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.put(
          `/admin/social/providers/${id}`,
          data,
          authOptions(),
        ),
    )
  },

  async testSocialProvider(id) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/providers/${id}/test`,
          undefined,
          authOptions(),
        ),
    )
  },

  async syncSocialProvider(id) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/providers/${id}/sync`,
          undefined,
          authOptions(),
        ),
    )
  },

  async getSocialServices(
    platform = '',
    search = '',
  ) {
    const params =
      new URLSearchParams()

    if (platform) {
      params.set(
        'platform',
        platform,
      )
    }

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    const query =
      params.toString()

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/services${query ? `?${query}` : ''}`,
          authOptions(),
        ),
    )
  },

  async getSocialProviderServices({
    providerId = '',
    mapped = '',
    active = '',
    search = '',
    page = 1,
    perPage = 50,
  } = {}) {
    const params =
      new URLSearchParams()

    params.set(
      'page',
      String(page),
    )

    params.set(
      'per_page',
      String(perPage),
    )

    if (providerId) {
      params.set(
        'provider_id',
        String(providerId),
      )
    }

    if (mapped !== '') {
      params.set(
        'mapped',
        String(mapped),
      )
    }

    if (active !== '') {
      params.set(
        'active',
        String(active),
      )
    }

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/provider-services?${params.toString()}`,
          authOptions(),
        ),
    )
  },

  async updateSocialProviderService(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.patch(
          `/admin/social/provider-services/${id}`,
          data,
          authOptions(),
        ),
    )
  },

  async mapSocialProviderService(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/provider-services/${id}/map`,
          data,
          authOptions(),
        ),
    )
  },

  async unmapSocialProviderService(
    id,
  ) {
    return adminRequest(
      () =>
        apiClient.delete(
          `/admin/social/provider-services/${id}/map`,
          authOptions(),
        ),
    )
  },

  async createSocialService(data) {
    return adminRequest(
      () =>
        apiClient.post(
          '/admin/social/services',
          data,
          authOptions(),
        ),
    )
  },

  async updateSocialService(
    id,
    data,
  ) {
    return adminRequest(
      () =>
        apiClient.put(
          `/admin/social/services/${id}`,
          data,
          authOptions(),
        ),
    )
  },

  async getSocialOrders({
    status = '',
    search = '',
    page = 1,
  } = {}) {
    const params = new URLSearchParams()

    if (status) {
      params.set('status', status)
    }

    if (search.trim()) {
      params.set('search', search.trim())
    }

    params.set('page', String(page))

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/orders?${params.toString()}`,
          authOptions(),
        ),
    )
  },

  async cancelSocialOrder(id) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/orders/${id}/cancel`,
          {},
          authOptions(),
        ),
    )
  },

  async getEvidence(id) {
    const token =
      getAdminToken()

    if (!token) {
      const error =
        new Error(
          'Phiên đăng nhập Admin không hợp lệ.',
        )

      error.status = 401

      throw error
    }

    let response

    try {
      response =
        await fetch(
          `${API_BASE_URL}/admin/evidences/${id}`,
          {
            headers: {
              Accept: '*/*',

              Authorization:
                `Bearer ${token}`,
            },
          },
        )
    } catch {
      throw new Error(
        'Không thể kết nối tới máy chủ để tải evidence.',
      )
    }

    if (!response.ok) {
      if (
        response.status === 401 ||
        response.status === 403
      ) {
        removeAdminToken()
      }

      const error =
        new Error(
          response.status === 401
            ? 'Phiên đăng nhập đã hết hạn.'
            : response.status === 403
              ? 'Bạn không có quyền xem evidence.'
              : response.status === 404
                ? 'Không tìm thấy evidence.'
                : 'Không thể tải evidence.',
        )

      error.status =
        response.status

      throw error
    }

    return response.blob()
  },

  async updateSocialOrderStatus(
    id,
    status,
  ) {
    return adminRequest(
      () =>
        apiClient.patch(
          `/admin/social/orders/${id}/status`,
          { status },
          authOptions(),
        ),
    )
  },

  async getSocialCustomers({
    search = '',
    page = 1,
  } = {}) {
    const params = new URLSearchParams()

    if (search.trim()) {
      params.set('search', search.trim())
    }

    params.set('page', String(page))

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/customers?${params.toString()}`,
          authOptions(),
        ),
    )
  },

  async getSocialCustomer(id) {
    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/customers/${id}`,
          authOptions(),
        ),
    )
  },

  async adjustSocialCustomerWallet(
    id,
    {
      direction,
      amount,
      note = '',
    },
  ) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/customers/${id}/wallet`,
          {
            direction,
            amount,
            note,
          },
          authOptions(),
        ),
    )
  },

  async getSocialTopups({
    status = '',
    search = '',
  } = {}) {
    const params =
      new URLSearchParams()

    if (status) {
      params.set('status', status)
    }

    if (search.trim()) {
      params.set(
        'search',
        search.trim(),
      )
    }

    const query = params.toString()

    return adminRequest(
      () =>
        apiClient.get(
          `/admin/social/topups${
            query ? `?${query}` : ''
          }`,
          authOptions(),
        ),
    )
  },

  async manualCreditSocialWallet({
    username,
    amount,
    note = '',
  }) {
    return adminRequest(
      () =>
        apiClient.post(
          '/admin/social/topups/manual-credit',
          {
            username,
            amount,
            note,
          },
          authOptions(),
        ),
    )
  },

  async approveSocialTopup(id) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/topups/${id}/approve`,
          undefined,
          authOptions(),
        ),
    )
  },

  async rejectSocialTopup(
    id,
    note = '',
  ) {
    return adminRequest(
      () =>
        apiClient.post(
          `/admin/social/topups/${id}/reject`,
          { note },
          authOptions(),
        ),
    )
  },

}

export default adminService