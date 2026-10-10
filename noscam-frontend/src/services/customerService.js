import apiClient from './apiClient'

const TOKEN_KEY = 'noscam_customer_token'

export function getCustomerToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setCustomerToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeCustomerToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authOptions() {
  const token = getCustomerToken()

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
}

async function customerRequest(callback) {
  try {
    return await callback()
  } catch (error) {
    if (error?.status === 401) {
      removeCustomerToken()
    }

    throw error
  }
}

const customerService = {
  async register(data) {
    const response = await apiClient.post(
      '/auth/register',
      data,
    )

    const token = response?.data?.token

    if (!token) {
      throw new Error(
        'Máy chủ không trả về token.',
      )
    }

    setCustomerToken(token)

    return response.data
  },

  async login(username, password) {
    const response = await apiClient.post(
      '/auth/login',
      {
        username: username.trim(),
        password,
      },
    )

    const token = response?.data?.token

    if (!token) {
      throw new Error(
        'Máy chủ không trả về token.',
      )
    }

    setCustomerToken(token)

    return response.data
  },

  async me() {
    return customerRequest(() =>
      apiClient.get(
        '/auth/me',
        authOptions(),
      ),
    )
  },

  async logout() {
    try {
      if (getCustomerToken()) {
        await apiClient.post(
          '/auth/logout',
          undefined,
          authOptions(),
        )
      }
    } finally {
      removeCustomerToken()
    }
  },

  async services({
    platform = '',
    category = '',
    search = '',
  } = {}) {
    const params = new URLSearchParams()

    if (platform) {
      params.set('platform', platform)
    }

    if (category) {
      params.set('category', category)
    }

    if (search.trim()) {
      params.set('search', search.trim())
    }

    const query = params.toString()

    return apiClient.get(
      `/social/services${
        query ? `?${query}` : ''
      }`,
    )
  },

  async profile() {
    return customerRequest(() =>
      apiClient.get(
        '/profile',
        authOptions(),
      ),
    )
  },

  async updateProfile(data) {
    return customerRequest(() =>
      apiClient.put(
        '/profile',
        data,
        authOptions(),
      ),
    )
  },

  async changePassword(data) {
    return customerRequest(() =>
      apiClient.put(
        '/profile/password',
        data,
        authOptions(),
      ),
    )
  },

  async wallet() {
    return customerRequest(() =>
      apiClient.get(
        '/wallet',
        authOptions(),
      ),
    )
  },

  async transactions() {
    return customerRequest(() =>
      apiClient.get(
        '/wallet/transactions',
        authOptions(),
      ),
    )
  },

  async topups() {
    return customerRequest(() =>
      apiClient.get(
        '/wallet/topups',
        authOptions(),
      ),
    )
  },

  async createTopup(data) {
    return customerRequest(() =>
      apiClient.post(
        '/wallet/topups',
        data,
        authOptions(),
      ),
    )
  },

  async orders() {
    return customerRequest(() =>
      apiClient.get(
        '/social/orders',
        authOptions(),
      ),
    )
  },

  async digitalOrders(page = 1) {
    return customerRequest(() =>
      apiClient.get(
        `/digital/orders?page=${encodeURIComponent(page)}`,
        authOptions(),
      ),
    )
  },

  async digitalOrder(id) {
    return customerRequest(() =>
      apiClient.get(
        `/digital/orders/${encodeURIComponent(id)}`,
        authOptions(),
      ),
    )
  },

  async createDigitalOrder(data) {
    return customerRequest(() =>
      apiClient.post(
        '/digital/orders',
        data,
        authOptions(),
      ),
    )
  },

  async createGuestDigitalOrder(data) {
    return apiClient.post(
      '/digital/guest/orders',
      data,
    )
  },

  async respondGuestDigitalQuote(orderId, quoteId, lookupToken, action) {
    return apiClient.post(
      `/digital/guest/orders/${encodeURIComponent(orderId)}/quotes/${encodeURIComponent(quoteId)}/respond`,
      { lookup_token: lookupToken, action },
    )
  },

  async lookupGuestDigitalOrder(orderId, lookupToken) {
    return apiClient.post(
      `/digital/guest/orders/${encodeURIComponent(orderId)}/lookup`,
      { lookup_token: lookupToken },
    )
  },

  async createOrder(data) {
    return customerRequest(() =>
      apiClient.post(
        '/social/orders',
        data,
        authOptions(),
      ),
    )
  },
}

export default customerService
