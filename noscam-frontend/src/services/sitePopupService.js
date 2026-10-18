import apiClient from './apiClient'
import { getAdminToken } from './adminService'

const auth = () => ({
  headers: {
    Authorization: `Bearer ${getAdminToken() || ''}`,
  },
})

export const popupPages = [
  ['/', 'Trang chủ'],
  ['/search', 'Kiểm tra lừa đảo'],
  ['/community', 'Cộng đồng'],
  ['/report', 'Báo cáo lừa đảo'],
  ['/alerts', 'Cảnh báo'],
  ['/mediators', 'Trung gian'],
  ['/guide', 'Hướng dẫn'],
  ['/about', 'Giới thiệu'],
  ['/social-services', 'Tăng tương tác'],
  ['/digital-services', 'Dịch vụ số'],
  ['/exchange', 'Giao dịch'],
]

export const sitePopupService = {
  publicList: page =>
    apiClient.get(`/site-popups?page=${encodeURIComponent(page)}`),

  list: () =>
    apiClient.get('/admin/site-popups', auth()),

  create: data =>
    apiClient.post('/admin/site-popups', data, auth()),

  update: (id, data) =>
    apiClient.put(`/admin/site-popups/${id}`, data, auth()),

  remove: id =>
    apiClient.delete(`/admin/site-popups/${id}`, auth()),
}
