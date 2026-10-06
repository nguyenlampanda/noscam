import apiClient from './apiClient'
import {
  getAdminToken,
} from './adminService'

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

export const mediatorBankService = {
  async list() {
    return apiClient.get(
      '/mediator-banks',
    )
  },

  async create(name) {
    return apiClient.post(
      '/admin/mediator-banks',
      { name },
      authOptions(),
    )
  },
}

export default mediatorBankService
