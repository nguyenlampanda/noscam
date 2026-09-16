export const defaultSearchResult = {
  type: 'Tài khoản ngân hàng',

  riskScore: 76,
  riskLabel: 'Rủi ro cao',
  riskLevel: 'high',

  reports: 12,
  firstDetected: '12/08/2026',
  lastReport: '15/09/2026',

  status: 'Có dữ liệu cảnh báo',

  riskFactors: [
    {
      id: 1,
      title: 'Có nhiều báo cáo từ cộng đồng',
      description:
        'Thông tin này hiện xuất hiện trong 12 báo cáo được hệ thống ghi nhận.',
      severity: 'high',
    },
    {
      id: 2,
      title: 'Báo cáo xuất hiện gần đây',
      description:
        'Hệ thống ghi nhận báo cáo mới liên quan đến thông tin này trong thời gian gần đây.',
      severity: 'medium',
    },
    {
      id: 3,
      title: 'Có dữ liệu liên quan',
      description:
        'Thông tin tra cứu có liên kết với số điện thoại, tài khoản mạng xã hội hoặc người bán khác.',
      severity: 'medium',
    },
  ],

  relatedInformation: [
    {
      id: 1,
      type: 'Số điện thoại',
      value: '0909123456',
    },
    {
      id: 2,
      type: 'Facebook',
      value: 'facebook.com/abcshop',
    },
    {
      id: 3,
      type: 'Shop / Người bán',
      value: 'ABC Shop',
    },
  ],

  sources: [
    'Báo cáo từ cộng đồng',
    'Dữ liệu cảnh báo của hệ thống',
  ],
}