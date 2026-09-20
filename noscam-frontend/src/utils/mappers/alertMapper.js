export function mapAlert(data) {
  return {
    id: data.id,

    category:
      data.category || 'other',

    type:
      data.type || 'Thông tin',

    value:
      data.value || '',

    description:
      data.description || '',

    riskLabel:
      data.risk_label || 'Chưa xác định',

    riskLevel:
      data.risk_level || 'medium',

    reports:
      Number(data.reports ?? 0),

    time:
      data.time || '',
  }
}

export function mapAlerts(items = []) {
  return items.map(mapAlert)
}