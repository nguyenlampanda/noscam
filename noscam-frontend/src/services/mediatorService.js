import apiClient from './apiClient'

export const mediatorService = {
  list(search = '', page = 1) {
    const params = new URLSearchParams()

    if (search.trim()) {
      params.set('search', search.trim())
    }

    params.set('page', String(page))

    return apiClient.get(
      `/mediators?${params.toString()}`,
    )
  },

  show(code) {
    return apiClient.get(
      `/mediators/${encodeURIComponent(code)}`,
    )
  },

  lookup(query) {
    const params = new URLSearchParams({
      q: query,
    })

    return apiClient.get(
      `/mediators/lookup?${params.toString()}`,
    )
  },
}

export default mediatorService
