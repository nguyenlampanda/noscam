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
}

export default adminService