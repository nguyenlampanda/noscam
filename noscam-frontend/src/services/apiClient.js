const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api'

async function request(
  endpoint,
  {
    method = 'GET',
    body,
    headers = {},
    signal,
  } = {},
) {
  const url = `${API_BASE_URL}${endpoint}`

  const isFormData =
    typeof FormData !== 'undefined' &&
    body instanceof FormData

  const config = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    signal,
  }

  if (body !== undefined) {
    if (isFormData) {
      config.body = body
    } else {
      config.headers['Content-Type'] =
        'application/json'

      config.body = JSON.stringify(body)
    }
  }

  let response

  try {
    response = await fetch(url, config)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new Error(
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    )
  }

  let data = null

  const contentType =
    response.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    let message =
      data?.message ||
      `Yêu cầu thất bại với mã ${response.status}.`

    if (data?.errors) {
      const validationMessages =
        Object.values(data.errors)
          .flat()
          .filter(Boolean)

      if (validationMessages.length > 0) {
        message = validationMessages.join(' ')
      }
    }

    const error = new Error(message)

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

export const apiClient = {
  get(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'GET',
    })
  },

  post(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body,
    })
  },

  put(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body,
    })
  },

  patch(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    })
  },

  delete(endpoint, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'DELETE',
    })
  },
}

export default apiClient