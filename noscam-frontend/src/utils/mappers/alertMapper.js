export function mapAlert(data) {
  return {
    publicImages: Array.isArray(data.public_images)
      ? data.public_images.slice(0, 3)
      : [],
    id:
      data.id,

    category:
      data.category ||
      'other',

    entityType:
      data.entity_type ||
      '',

    type:
      data.type ||
      'Thông tin',

    value:
      data.value ||
      '',

    description:
      data.description ||
      '',

    riskScore:
      Number(
        data.risk_score ?? 0,
      ),

    riskLabel:
      data.risk_label ||
      'Chưa xác định',

    riskLevel:
      data.risk_level ||
      'low',

    reports:
      Number(
        data.reports ?? 0,
      ),

    time:
      data.time ||
      '',

    lastReportAt:
      data.last_report_at ||
      null,
  }
}

export function mapAlerts(
  items = [],
) {
  return items.map(mapAlert)
}
