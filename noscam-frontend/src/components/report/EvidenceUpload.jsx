function EvidenceUpload() {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-900">
        Bằng chứng
      </label>

      <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center sm:px-6 sm:py-10">
        <p className="text-sm font-semibold text-slate-800">
          Thêm hình ảnh hoặc tài liệu
        </p>

        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
          Có thể là ảnh chụp tin nhắn, giao dịch, hóa đơn hoặc các
          bằng chứng liên quan.
        </p>

        <button
          type="button"
          className="mt-5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
        >
          Chọn tệp
        </button>

        <p className="mt-3 text-xs text-slate-400">
          Chức năng tải tệp sẽ được kết nối sau.
        </p>
      </div>
    </div>
  )
}

export default EvidenceUpload