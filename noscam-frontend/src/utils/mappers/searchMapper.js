export function mapSearchResult(data) {
  if (!data) {
    return null
  }

  return {
    type: data.type || 'Không xác định',

    riskScore: Number(data.risk_score ?? 0),
    riskLabel: data.risk_label || 'Chưa xác định',
    riskLevel: data.risk_level || 'medium',

    reports: Number(data.reports ?? 0),

    firstDetected:
      data.first_detected || 'Chưa có dữ liệu',

    lastReport:
      data.last_report || 'Chưa có dữ liệu',

    status:
      data.status || 'Chưa xác định',

    riskFactors: (data.risk_factors || []).map(
      (factor, index) => ({
        id: factor.id ?? index + 1,
        title: factor.title || '',
        description: factor.description || '',
        severity: factor.severity || 'medium',
      }),
    ),

    relatedInformation: (
      data.related_information || []
    ).map((item, index) => ({
      id: item.id ?? index + 1,
      type: item.type || '',
      value: item.value || '',
    })),

    sources: data.sources || [],
  }
}