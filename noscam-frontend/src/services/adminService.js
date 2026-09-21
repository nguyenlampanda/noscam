import apiClient from './apiClient'

const TOKEN_KEY =
  'noscam_admin_token'

export function getAdminToken() {
  return localStorage.getItem(
    TOKEN_KEY,
  )
}

export function setAdminToken(token) {
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
  const token = getAdminToken()

  return {
    headers: {
      Authorization:
        `Bearer ${token}`,
    },
  }
}

export const adminService = {
  async login(email, password) {
    const response =
      await apiClient.post(
        '/admin/login',
        {
          email,
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

  async logout() {
    try {
      await apiClient.post(
        '/admin/logout',
        undefined,
        authOptions(),
      )
    } finally {
      removeAdminToken()
    }
  },

  async getDashboard() {
    return apiClient.get(
      '/admin/dashboard',
      authOptions(),
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

    return apiClient.get(
      `/admin/reports?${params.toString()}`,
      authOptions(),
    )
  },

  async getReport(id) {
    return apiClient.get(
      `/admin/reports/${id}`,
      authOptions(),
    )
  },

  async updateReportStatus(
    id,
    status,
  ) {
    return apiClient.patch(
      `/admin/reports/${id}/status`,
      { status },
      authOptions(),
    )
  },

  async getEvidence(id) {
    const token =
      getAdminToken()

    const response =
      await fetch(
        `http://127.0.0.1:8000/api/admin/evidences/${id}`,
        {
          headers: {
            Accept: '*/*',

            Authorization:
              `Bearer ${token}`,
          },
        },
      )

    if (!response.ok) {
      const error =
        new Error(
          'Không thể tải evidence.',
        )

      error.status =
        response.status

      throw error
    }

    return response.blob()
  },
}

export default adminService