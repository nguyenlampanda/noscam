function RelatedInformation({ items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">
        Thông tin liên quan
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Các dữ liệu được hệ thống ghi nhận có liên quan đến nội dung
        bạn vừa tra cứu.
      </p>

      <div className="mt-5 sm:mt-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`py-4 ${
              index !== items.length - 1
                ? 'border-b border-slate-200'
                : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-400">
              {item.type}
            </p>

            <p className="mt-1.5 break-all text-sm font-semibold text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RelatedInformation