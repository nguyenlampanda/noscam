export function getResponseData(response) {
  if (response === null || response === undefined) {
    return null
  }

  if (
    typeof response === 'object' &&
    Object.prototype.hasOwnProperty.call(response, 'data')
  ) {
    return response.data
  }

  return response
}

export function getResponseMessage(
  response,
  fallback = '',
) {
  return response?.message || fallback
}

export function getPagination(response) {
  return {
    currentPage:
      response?.meta?.current_page ??
      response?.current_page ??
      1,

    lastPage:
      response?.meta?.last_page ??
      response?.last_page ??
      1,

    perPage:
      response?.meta?.per_page ??
      response?.per_page ??
      null,

    total:
      response?.meta?.total ??
      response?.total ??
      0,
  }
}