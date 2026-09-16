export const alertFilters = [
  { id: 'all', label: 'Tất cả' },
  { id: 'phone', label: 'SĐT' },
  { id: 'bank', label: 'STK' },
  { id: 'website', label: 'Website' },
  { id: 'shop', label: 'Shop' },
  { id: 'rental', label: 'Phòng trọ' },
  { id: 'job', label: 'Tuyển dụng' },
  { id: 'social', label: 'Social media' },
]

export const alerts = [
  {
    id: 1,
    category: 'bank',
    type: 'Tài khoản ngân hàng',
    value: '1234567821',
    description:
      'Có nhiều báo cáo cộng đồng liên quan đến giao dịch mua bán và yêu cầu chuyển khoản.',
    reports: 12,
    riskLabel: 'Rủi ro cao',
    riskLevel: 'high',
    time: '18 phút trước',
  },
  {
    id: 2,
    category: 'phone',
    type: 'Số điện thoại',
    value: '0909123846',
    description:
      'Số điện thoại được gửi báo cáo liên quan đến nội dung liên hệ đáng ngờ.',
    reports: 8,
    riskLabel: 'Rủi ro cao',
    riskLevel: 'high',
    time: '42 phút trước',
  },
  {
    id: 3,
    category: 'website',
    type: 'Website',
    value: 'shop-example.vn',
    description:
      'Tên miền được cộng đồng gửi báo cáo để hệ thống kiểm tra và đối chiếu.',
    reports: 5,
    riskLabel: 'Rủi ro trung bình',
    riskLevel: 'medium',
    time: '1 giờ trước',
  },
  {
    id: 4,
    category: 'shop',
    type: 'Shop / Người bán',
    value: 'Demo Mobile Shop',
    description:
      'Người dùng phản ánh một số giao dịch đặt cọc cần được kiểm tra thêm.',
    reports: 7,
    riskLabel: 'Rủi ro trung bình',
    riskLevel: 'medium',
    time: '2 giờ trước',
  },
  {
    id: 5,
    category: 'rental',
    type: 'Phòng trọ',
    value: 'Phòng trọ mẫu - Quận X',
    description:
      'Có báo cáo liên quan đến yêu cầu đặt cọc trước khi xem phòng.',
    reports: 4,
    riskLabel: 'Rủi ro trung bình',
    riskLevel: 'medium',
    time: '3 giờ trước',
  },
  {
    id: 6,
    category: 'job',
    type: 'Tuyển dụng',
    value: 'Công việc online mẫu',
    description:
      'Tin tuyển dụng được báo cáo do có yêu cầu chuyển phí trước khi nhận việc.',
    reports: 9,
    riskLabel: 'Rủi ro cao',
    riskLevel: 'high',
    time: '5 giờ trước',
  },
  {
    id: 7,
    category: 'social',
    type: 'Facebook',
    value: 'facebook.com/demo-seller-001',
    description:
      'Tài khoản mạng xã hội được gửi báo cáo liên quan đến hoạt động mua bán.',
    reports: 6,
    riskLabel: 'Rủi ro trung bình',
    riskLevel: 'medium',
    time: 'Hôm nay',
  },
  {
    id: 8,
    category: 'social',
    type: 'Telegram',
    value: '@demo_support_001',
    description:
      'Tài khoản được cộng đồng gửi báo cáo để kiểm tra các nội dung liên hệ.',
    reports: 3,
    riskLabel: 'Rủi ro thấp',
    riskLevel: 'low',
    time: 'Hôm qua',
  },
]