const DEFAULT_DISCLAIMER =
  'Risk Score chỉ mang tính cảnh báo dựa trên dữ liệu hệ thống, không phải kết luận một cá nhân hoặc tổ chức là lừa đảo.'

export function mapSearchResponse(response) {
  const data = response?.data ?? null
  const meta = response?.meta ?? {}

  return {
    result: data
      ? mapSearchResult(data)
      : null,

    message:
      response?.message ||
      (data
        ? ''
        : 'Chưa ghi nhận dữ liệu cảnh báo cho thông tin này.'),

    meta: {
      query:
        meta.query || '',

      detectedType:
        meta.detected_type ||
        data?.type ||
        'generic',

      detectedTypeLabel:
        meta.detected_type_label ||
        data?.type_label ||
        'Thông tin',

      normalizedQuery:
        meta.normalized_query ||
        data?.normalized_value ||
        '',

      matchedType:
        meta.matched_type ||
        data?.type ||
        null,

      match:
        meta.match || null,

      disclaimer:
        meta.disclaimer ||
        data?.disclaimer ||
        DEFAULT_DISCLAIMER,
    },
  }
}

export function mapSearchResult(data) {
  if (!data) {
    return null
  }

  return {
    type:
      data.type ||
      'Không xác định',

    typeLabel:
      data.type_label ||
      'Thông tin',

    value:
      data.value || '',

    normalizedValue:
      data.normalized_value || '',

    riskScore:
      Number(
        data.risk_score ?? 0,
      ),

    riskLabel:
      data.risk_label ||
      'Chưa xác định',

    riskLevel:
      data.risk_level ||
      'medium',

    reports:
      Number(
        data.reports ?? 0,
      ),

    firstDetected:
      data.first_detected ||
      'Chưa có dữ liệu',

    lastReport:
      data.last_report ||
      'Chưa có dữ liệu',

    status:
      data.status ||
      'Chưa xác định',

    riskFactors: (
      data.risk_factors || []
    ).map(
      (factor, index) => ({
        id:
          factor.id ??
          index + 1,

        title:
          factor.title || '',

        description:
          factor.description || '',

        severity:
          factor.severity ||
          'medium',
      }),
    ),

    relatedInformation: (
      data.related_information || []
    ).map(
      (item, index) => ({
        id:
          item.id ??
          index + 1,

        type:
          item.type || '',

        typeLabel:
          item.type_label ||
          'Thông tin',

        value:
          item.value || '',

        normalizedValue:
          item.normalized_value || '',

        riskScore:
          Number(
            item.risk_score ?? 0,
          ),

        riskLabel:
          item.risk_label ||
          'Chưa xác định',

        riskLevel:
          item.risk_level ||
          'medium',

        reports:
          Number(
            item.reports ?? 0,
          ),

        sharedReports:
          Number(
            item.shared_reports ?? 0,
          ),

        relationLabel:
          item.relation_label || '',
      }),
    ),

    sources:
      Array.isArray(
        data.sources,
      )
        ? data.sources
        : [],

    disclaimer:
      data.disclaimer ||
      DEFAULT_DISCLAIMER,
  }
}
